import { getDataClassification } from './dataClassification';

/**
 * Universal Canvas Watermark Utility for BIS Global Capital Flow Atlas
 * Injects canonical data classification (官方观测 / 待公布估算 / 前瞻情景),
 * provenance source, and timestamp into exported images.
 * 
 * Prevents forward scenarios from being misrepresented as historical audited facts.
 * 
 * @param {string} dataUrl - Raw image data URL from ECharts or HTML Canvas
 * @param {string} quarter - Selected quarter (e.g. '2026Q1')
 * @param {string} chartTitle - Descriptive chart name
 * @returns {Promise<string>} - Watermarked PNG data URL
 */
export function addWatermarkToDataUrl(dataUrl, quarter, chartTitle = 'BIS IBS Capital Flow') {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // 1. Draw base chart image
      ctx.drawImage(img, 0, 0);

      const classification = getDataClassification(quarter);

      // 2. Top Watermark Banner (34px height)
      const bannerHeight = 34;
      ctx.fillStyle = classification.isScenario 
        ? 'rgba(88, 28, 135, 0.92)' 
        : classification.type === 'PENDING_ESTIMATE'
          ? 'rgba(120, 53, 15, 0.92)'
          : 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, canvas.width, bannerHeight);

      // Top-left: Title & Branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Global Capital Flow Atlas · ${chartTitle} · ${quarter}`, 14, bannerHeight / 2);

      // Top-right: Data Classification Pill
      const statusText = `[ ${classification.label} ] ${classification.provenance}`;
      ctx.font = 'bold 12px "SF Pro Display", monospace';
      ctx.fillStyle = classification.isScenario ? '#e9d5ff' : classification.type === 'PENDING_ESTIMATE' ? '#fde68a' : '#a7f3d0';
      const textWidth = ctx.measureText(statusText).width;
      ctx.fillText(statusText, canvas.width - textWidth - 14, bannerHeight / 2);

      // 3. Subtle Scenario Watermark Pattern (Diagonal corner stripe if Scenario)
      if (classification.isScenario) {
        ctx.save();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.rotate(-Math.PI / 12);
        ctx.fillText('FORWARD SCENARIO PROJECTION · NON-OFFICIAL', 40, canvas.height - 80);
        ctx.restore();
      }

      // 4. Bottom Metadata Bar (24px height)
      const footerHeight = 24;
      ctx.fillStyle = 'rgba(11, 15, 25, 0.92)';
      ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `BIS LBS / CBS Matrix Calibrated · Exported: ${new Date().toISOString().split('T')[0]} · https://hantrleko.github.io/global-capital-flow-atlas/`,
        14,
        canvas.height - footerHeight / 2
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export default {
  addWatermarkToDataUrl
};
