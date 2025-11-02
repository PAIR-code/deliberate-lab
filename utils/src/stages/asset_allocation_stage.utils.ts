import {
  AssetAllocation,
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
} from './asset_allocation_stage';

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
  stockTickers: {stockA: string; stockB: string},
): string {
  const config = calculateDonutChartConfig();
  const circumference = 2 * Math.PI * config.radius;

  // Calculate segment lengths
  const stockALength = (allocation.stockA.percentage / 100) * circumference;
  const stockBLength = (allocation.stockB.percentage / 100) * circumference;

  // Calculate label positions (adjusted for 90 degree rotation)
  const stockAAngleRadians =
    Math.PI / 2 + (allocation.stockA.percentage / 200) * 2 * Math.PI;
  const stockAEndAngle =
    Math.PI / 2 + (allocation.stockA.percentage / 100) * 2 * Math.PI;
  const stockBAngleRadians =
    stockAEndAngle + (allocation.stockB.percentage / 200) * 2 * Math.PI;

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
        ${stockTickers.stockA}: ${allocation.stockA.percentage}%
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
        ${stockTickers.stockB}: ${allocation.stockB.percentage}%
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

// ************************************************************************* //
// PROMPT UTILITIES                                                          //
// ************************************************************************* //

export function getAssetAllocationSummaryText(
  stage: AssetAllocationStageConfig,
): string {
  const overview =
    '## Asset Allocation: User has $1,000 to allocate between two stocks:';

  return `${overview}\n* ${stage.stockConfig.stockA.name}\n* ${stage.stockConfig.stockB.name}`;
}

export function getAssetAllocationAnswersText(
  participantAnswers: Array<{
    participantPublicId: string;
    participantDisplayName: string;
    answer: AssetAllocationStageParticipantAnswer;
  }>,
  alwaysShowParticipantNames = false,
): string {
  if (participantAnswers.length === 0) {
    return '';
  }

  const answerSummaries = participantAnswers.map(
    ({participantPublicId, participantDisplayName, answer}) => {
      const allocation = answer.allocation;
      // Include participant names based on configuration or if multiple participants
      const showNames =
        alwaysShowParticipantNames || participantAnswers.length > 1;
      const prefix = showNames
        ? `Participant ${participantDisplayName}:\n`
        : '';

      return `${prefix}${allocation.stockA.name}: ${allocation.stockA.percentage}%, ${allocation.stockB.name}: ${allocation.stockB.percentage}%`;
    },
  );

  return `## Current Asset Allocation:\n${answerSummaries.join('\n')}`;
}
