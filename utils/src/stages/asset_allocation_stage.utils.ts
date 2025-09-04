import {AssetAllocation} from './asset_allocation_stage';

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

export function generateDonutChartSVG(allocation: AssetAllocation): string {
  const config = calculateDonutChartConfig();
  const circumference = 2 * Math.PI * config.radius;
  const allAllocations = [
    allocation.stockA,
    allocation.stockB,
    ...(allocation.additionalAllocations || []),
  ];
  const colors = [
    '#2196F3',
    '#FF9800',
    '#4CAF50',
    '#F44336',
    '#9C27B0',
    '#FFC107',
    '#00BCD4',
    '#8BC34A',
    '#E91E63',
    '#673AB7',
  ];

  let segments = '';
  let labels = '';
  let accumulatedPercentage = 0;

  allAllocations.forEach((stockAllocation, index) => {
    if (stockAllocation.percentage <= 0) return;

    const stockLength = (stockAllocation.percentage / 100) * circumference;
    const color = colors[index % colors.length];

    // Segment
    segments += `
      <circle
        cx="${config.centerX}"
        cy="${config.centerY}"
        r="${config.radius}"
        fill="none"
        stroke="${color}"
        stroke-width="${config.strokeWidth}"
        stroke-dasharray="${stockLength} ${circumference}"
        stroke-dashoffset="${(-accumulatedPercentage / 100) * circumference}"
        transform="rotate(90 ${config.centerX} ${config.centerY})"
      />`;

    // Label
    const midAngle =
      (accumulatedPercentage + stockAllocation.percentage / 2) / 100;
    const angleRadians = Math.PI / 2 + midAngle * 2 * Math.PI;
    const labelX = config.centerX + config.labelRadius * Math.cos(angleRadians);
    const labelY = config.centerY + config.labelRadius * Math.sin(angleRadians);
    const ticker = getStockTicker(stockAllocation.name);

    labels += `
      <text 
        x="${labelX}" 
        y="${labelY}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="var(--md-sys-color-on-surface)"
        font-size="${config.fontSize}"
        font-weight="600"
      >
        ${ticker}: ${stockAllocation.percentage.toFixed(0)}%
      </text>`;

    accumulatedPercentage += stockAllocation.percentage;
  });

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
      ${segments}
      ${labels}
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
