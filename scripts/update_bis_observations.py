"""Refresh published BIS observations used by the Atlas research workspace."""

import argparse
import csv
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from pathlib import Path
import re
import tempfile
from urllib.parse import urlencode
from urllib.request import Request, urlopen


SNAPSHOT = Path(__file__).resolve().parents[1] / "src/data/bis_observations.json"
FLOW = "BIS,WS_LBS_D_PUB,1.0"
DATAFLOW = "BIS:WS_LBS_D_PUB(1.0)"
API = f"https://stats.bis.org/api/v1/data/{FLOW}/"
CSV_TYPE = "application/vnd.sdmx.data+csv;version=1.0.0"
DIMENSIONS = (
    "FREQ", "L_MEASURE", "L_POSITION", "L_INSTR", "L_DENOM", "L_CURR_TYPE",
    "L_PARENT_CTY", "L_REP_BANK_TYPE", "L_REP_CTY", "L_CP_SECTOR", "L_CP_COUNTRY",
    "L_POS_TYPE",
)
PILOT = (("JP", "US"), ("GB", "US"), ("DE", "US"), ("US", "GB"), ("GB", "JP"))
PUBLIC_STATUSES = {"A", "B", "E", "P", "R"}


def key(measure, reporter="5A", counterparty="5J"):
    return f"Q.{measure}.C.A.TO1.A.5J.A.{reporter}.A.{counterparty}.N"


def download(series_key, start_period):
    url = API + series_key + "?" + urlencode({"startPeriod": start_period})
    with urlopen(Request(url, headers={"Accept": CSV_TYPE}), timeout=45) as response:
        return response.read().decode("utf-8-sig")


def parse_csv(content, allowed_keys):
    reader = csv.DictReader(io.StringIO(content))
    required = {"DATAFLOW", *DIMENSIONS, "TIME_PERIOD", "OBS_VALUE", "UNIT_MEASURE",
                "UNIT_MULT", "OBS_STATUS", "OBS_CONF"}
    if not required.issubset(reader.fieldnames or ()):
        raise ValueError("BIS SDMX CSV is missing required columns")
    result = {}
    for row in reader:
        if None in row or any(row.get(field) is None for field in required):
            raise ValueError("Malformed BIS SDMX row")
        series = ".".join(row[name] for name in DIMENSIONS)
        if row["DATAFLOW"] != DATAFLOW or series not in allowed_keys:
            raise ValueError(f"Unexpected BIS series: {row['DATAFLOW']} / {series}")
        if row["UNIT_MEASURE"] != "USD" or row["UNIT_MULT"] != "6":
            raise ValueError(f"Unexpected monetary unit in {series}")
        period = row["TIME_PERIOD"]
        if not re.fullmatch(r"\d{4}-Q[1-4]", period):
            raise ValueError(f"Invalid BIS quarter: {period}")
        quarter = period.replace("-", "")
        status, confidentiality = row["OBS_STATUS"], row["OBS_CONF"]
        raw = row["OBS_VALUE"]
        if confidentiality not in {"", "F"}:
            value, state = None, "confidential"
        elif not raw or status not in PUBLIC_STATUSES:
            value, state = None, "missing"
        else:
            try:
                number = Decimal(raw)
            except InvalidOperation as error:
                raise ValueError(f"Invalid value in {series} / {period}") from error
            if not number.is_finite() or (row["L_MEASURE"] == "S" and number < 0):
                raise ValueError(f"Invalid value in {series} / {period}")
            value, state = float(number), "observed"
        observations = result.setdefault(series, {})
        if quarter in observations:
            raise ValueError(f"Duplicate BIS observation: {series} / {period}")
        observations[quarter] = {
            "value_mn": value, "state": state, "obs_status": status, "obs_conf": confidentiality,
        }
    if not result:
        raise ValueError("BIS returned no observations")
    return result


def quarter_range(first, last):
    start = int(first[:4]) * 4 + int(first[-1]) - 1
    end = int(last[:4]) * 4 + int(last[-1]) - 1
    return [f"{index // 4}Q{index % 4 + 1}" for index in range(start, end + 1)]


def refresh(path=SNAPSHOT, load=download):
    previous = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    previous_series = previous.get("series", {})
    stock_key, flow_key = key("S"), key("F")
    global_series = {}
    for series_key in (stock_key, flow_key):
        global_series.update(parse_csv(load(series_key, "2018-Q1"), {series_key}))

    stocks = global_series[stock_key]
    published = sorted(quarter for quarter, item in stocks.items() if item["state"] == "observed")
    if len(published) < 2 or published != quarter_range("2018Q1", published[-1]):
        raise ValueError("The global BIS stock series is incomplete")
    if previous and published[-1] < previous["latest_stock_quarter"]:
        raise ValueError("BIS stock data ends before the current snapshot")
    if any(item["state"] == "observed" and global_series[flow_key].get(quarter, {}).get("state") != "observed"
           for quarter, item in previous_series.get(flow_key, {}).items()):
        raise ValueError("The global BIS adjusted series lost previously published periods")
    if not any(item["state"] == "observed" for item in global_series[flow_key].values()):
        raise ValueError("The global BIS adjusted series has no public values")

    pilot_keys = {key(measure, reporter, counterparty)
                  for reporter, counterparty in PILOT for measure in ("S", "F")}
    reporters = "+".join(sorted({pair[0] for pair in PILOT}))
    counterparties = "+".join(sorted({pair[1] for pair in PILOT}))
    query_key = key("S+F", reporters, counterparties)
    permitted = {key(measure, reporter, counterparty) for measure in ("S", "F")
                 for reporter in reporters.split("+") for counterparty in counterparties.split("+")}
    recent = published[-3:]
    start = recent[0]
    pilot = parse_csv(load(query_key, start.replace("Q", "-Q")), permitted)
    if not any(item["state"] == "observed" and quarter == published[-1]
               for series_key in pilot_keys for quarter, item in pilot.get(series_key, {}).items()):
        raise ValueError("The pilot request returned no observations for the latest quarter")

    for series_key in sorted(pilot_keys):
        if series_key in previous_series and series_key not in pilot:
            raise ValueError(f"Pilot data omitted an existing series: {series_key}")
        observations = {q: item for q, item in previous_series.get(series_key, {}).items() if q < start}
        for quarter in recent:
            item = pilot.get(series_key, {}).get(quarter)
            observations[quarter] = item or {
                "value_mn": None, "state": "missing", "obs_status": "", "obs_conf": "",
            }
        global_series[series_key] = observations

    content = {"latest_stock_quarter": published[-1], "series": global_series}
    version = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()[:16]
    if previous.get("version") == version:
        print(f"BIS observations unchanged ({version})")
        return
    snapshot = {
        "version": version,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **content,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                     prefix=".bis-", delete=False) as staged:
        temporary = Path(staged.name)
        try:
            with staged:
                json.dump(snapshot, staged, indent=2, sort_keys=True, allow_nan=False)
                staged.write("\n")
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    print(f"BIS observations updated through {published[-1]} ({version})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv-dir", type=Path, help="Read archived stocks.csv, adjusted.csv and pilot.csv")
    args = parser.parse_args()
    if args.csv_dir:
        filenames = {key("S"): "stocks.csv", key("F"): "adjusted.csv"}
        refresh(load=lambda series, _: (args.csv_dir / filenames.get(series, "pilot.csv")).read_text(
            encoding="utf-8-sig"))
    else:
        refresh()
