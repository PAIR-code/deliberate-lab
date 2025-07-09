import {
  AssetAllocation,
  AssetAllocationStageConfig,
} from './asset_allocation_stage';
import {StockInfoStageConfig} from './stockinfo_stage';

// ************************************************************************* //
// DONUT CHART UTILITIES                                                     //
// ************************************************************************* //

export interface DonutChartConfig {
  centerX: number;
  centerY: number;
  radius: number;
  strokeWidth: number;
  labelRadius: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  fontSize: number;
}

export function calculateDonutChartConfig(): DonutChartConfig {
  // Define base size and scale everything proportionally
  const baseSize = 70; // Base radius for scaling
  const scale = 1.0; // Base size without scaling

  const radius = baseSize * scale;
  const strokeWidth = radius * 0.5; // 50% of radius
  const labelRadius = radius + strokeWidth + 25; // Small fixed margin
  const fontSize = radius * 0.3; // 30% of radius for proportional text

  // Calculate viewBox to fit labels with adequate padding
  const horizontalPadding = 100; // Extra space for horizontal text
  const verticalPadding = 20; // Reduced vertical padding
  const viewBoxWidth = (labelRadius + horizontalPadding) * 2;
  const viewBoxHeight = (labelRadius + verticalPadding) * 2;
  const centerX = viewBoxWidth / 2;
  const centerY = viewBoxHeight / 2;

  return {
    centerX,
    centerY,
    radius,
    strokeWidth,
    labelRadius,
    viewBoxWidth,
    viewBoxHeight,
    fontSize,
  };
}

export function generateDonutChartSVG(
  allocation: AssetAllocation,
  _stockNames: {stockA: string; stockB: string},
  stockTickers: {stockA: string; stockB: string},
): string {
  const config = calculateDonutChartConfig();
  const circumference = 2 * Math.PI * config.radius;

  // Calculate segment lengths
  const stockALength = (allocation.stockAPercentage / 100) * circumference;
  const stockBLength = (allocation.stockBPercentage / 100) * circumference;

  // Calculate label positions (adjusted for 90 degree rotation)
  const stockAAngleRadians =
    Math.PI / 2 + (allocation.stockAPercentage / 200) * 2 * Math.PI;
  const stockAEndAngle =
    Math.PI / 2 + (allocation.stockAPercentage / 100) * 2 * Math.PI;
  const stockBAngleRadians =
    stockAEndAngle + (allocation.stockBPercentage / 200) * 2 * Math.PI;

  const stockAX =
    config.centerX + config.labelRadius * Math.cos(stockAAngleRadians);
  const stockAY =
    config.centerY + config.labelRadius * Math.sin(stockAAngleRadians);
  const stockBX =
    config.centerX + config.labelRadius * Math.cos(stockBAngleRadians);
  const stockBY =
    config.centerY + config.labelRadius * Math.sin(stockBAngleRadians);

  return `
    <svg viewBox="0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}" class="donut-chart">
      <!-- Background circle -->
      <circle
        cx="${config.centerX}"
        cy="${config.centerY}"
        r="${config.radius}"
        fill="none"
        stroke="var(--md-sys-color-surface-variant)"
        stroke-width="${config.strokeWidth}"
      />
      
      <!-- Stock A segment -->
      <circle
        cx="${config.centerX}"
        cy="${config.centerY}"
        r="${config.radius}"
        fill="none"
        stroke="#2196F3"
        stroke-width="${config.strokeWidth}"
        stroke-dasharray="${stockALength} ${circumference}"
        stroke-dashoffset="0"
        transform="rotate(90 ${config.centerX} ${config.centerY})"
      />
      
      <!-- Stock B segment -->
      <circle
        cx="${config.centerX}"
        cy="${config.centerY}"
        r="${config.radius}"
        fill="none"
        stroke="#FF9800"
        stroke-width="${config.strokeWidth}"
        stroke-dasharray="${stockBLength} ${circumference}"
        stroke-dashoffset="${-stockALength}"
        transform="rotate(90 ${config.centerX} ${config.centerY})"
      />
      
      <!-- Stock A label -->
      <text 
        x="${stockAX}" 
        y="${stockAY}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="var(--md-sys-color-on-surface)"
        font-size="${config.fontSize}"
        font-weight="600"
      >
        ${stockTickers.stockA}: ${allocation.stockAPercentage}%
      </text>
      
      <!-- Stock B label -->
      <text 
        x="${stockBX}" 
        y="${stockBY}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="var(--md-sys-color-on-surface)"
        font-size="${config.fontSize}"
        font-weight="600"
      >
        ${stockTickers.stockB}: ${allocation.stockBPercentage}%
      </text>
    </svg>
  `;
}

// ************************************************************************* //
// STOCK NAME UTILITIES                                                      //
// ************************************************************************* //

export function getStockTicker(stockName: string): string {
  // Look for ticker in parentheses, e.g., "TechCorp Inc (TECH)"
  const tickerMatch = stockName.match(/\(([^)]+)\)/);
  if (tickerMatch) {
    return tickerMatch[1]; // Return just the ticker without parentheses
  }

  // If no ticker found, return the full name
  return stockName;
}

export function getStockNames(
  assetAllocationStage: AssetAllocationStageConfig,
  stockInfoStage: StockInfoStageConfig | null,
): {stockA: string; stockB: string} {
  if (stockInfoStage && stockInfoStage.stocks.length >= 2) {
    return {
      stockA: stockInfoStage.stocks[0].title,
      stockB: stockInfoStage.stocks[1].title,
    };
  }

  return {
    stockA: assetAllocationStage.simpleStockConfig!.stockA.name,
    stockB: assetAllocationStage.simpleStockConfig!.stockB.name,
  };
}

export function getStockTickers(
  assetAllocationStage: AssetAllocationStageConfig,
  stockInfoStage: StockInfoStageConfig | null,
): {stockA: string; stockB: string} {
  const names = getStockNames(assetAllocationStage, stockInfoStage);
  return {
    stockA: getStockTicker(names.stockA),
    stockB: getStockTicker(names.stockB),
  };
}
