import csv
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("bis_update", ROOT / "scripts/update_bis_observations.py")
bis = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bis)


def response(rows):
    output = io.StringIO()
    cols = ("DATAFLOW", *bis.DIMENSIONS, "TIME_PERIOD", "OBS_VALUE", "UNIT_MEASURE",
            "UNIT_MULT", "OBS_STATUS", "OBS_CONF")
    writer = csv.writer(output)
    writer.writerow(cols)
    writer.writerows(rows)
    return output.getvalue()


def row(key, quarter, value, status="A", confidentiality="F", unit="6"):
    return (bis.DATAFLOW, *key.split("."), quarter.replace("Q", "-Q"), value,
            "USD", unit, status, confidentiality)


class BisIngestionTests(unittest.TestCase):
    def test_zero_and_confidentiality_are_distinct(self):
        key = bis.key("F")
        result = bis.parse_csv(response([
            row(key, "2026Q1", "0"),
            row(key, "2026Q2", "452.5", confidentiality="C"),
            row(key, "2026Q3", "", status="M"),
        ]), {key})[key]
        self.assertEqual(result["2026Q1"]["value_mn"], 0)
        self.assertEqual(result["2026Q2"]["state"], "confidential")
        self.assertIsNone(result["2026Q2"]["value_mn"])
        self.assertEqual(result["2026Q3"]["state"], "missing")

    def test_header_key_and_unit_are_validated(self):
        key = bis.key("S")
        with self.assertRaises(ValueError):
            bis.parse_csv("TIME_PERIOD,OBS_VALUE\n2026-Q2,123\n", {key})
        with self.assertRaises(ValueError):
            bis.parse_csv(response([row(bis.key("F"), "2026Q2", 123)]), {key})
        with self.assertRaises(ValueError):
            bis.parse_csv(response([row(key, "2026Q2", 123, unit="3")]), {key})

    def test_empty_and_partial_download_preserve_snapshot(self):
        saved = bis.SNAPSHOT.read_bytes()
        original = json.loads(saved)
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            target = Path(directory) / "snapshot.json"
            target.write_bytes(saved)
            with self.assertRaises(ValueError):
                bis.refresh(target, lambda *_: response([]))
            self.assertEqual(target.read_bytes(), saved)
            with self.assertRaises(ValueError):
                bis.refresh(target, lambda key, _: response([
                    row(key, q, entry["value_mn"], entry["obs_status"], entry["obs_conf"])
                    for q, entry in original["series"].get(key, {}).items() if q != "2020Q1"
                ]))
            self.assertEqual(target.read_bytes(), saved)

    def test_official_revisions_are_accepted_and_identical_pulls_are_stable(self):
        original = json.loads(bis.SNAPSHOT.read_bytes())
        stock = bis.key("S")
        flow = bis.key("F")

        def fetch(key, _):
            keys = [key] if key in {stock, flow} else [k for k in original["series"] if k not in {stock, flow}]
            return response([
                row(k, q, item["value_mn"] + 1 if k == stock and q == "2020Q1" else item["value_mn"],
                    item["obs_status"], item["obs_conf"])
                for k in keys for q, item in original["series"][k].items()
            ])

        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            target = Path(directory) / "snapshot.json"
            target.write_text(json.dumps(original), encoding="utf-8")
            bis.refresh(target, fetch)
            updated = target.read_bytes()
            revised = json.loads(updated)
            self.assertNotEqual(revised["version"], original["version"])
            self.assertEqual(revised["series"][stock]["2020Q1"]["value_mn"],
                             original["series"][stock]["2020Q1"]["value_mn"] + 1)
            bis.refresh(target, fetch)
            self.assertEqual(target.read_bytes(), updated)


if __name__ == "__main__":
    unittest.main()
