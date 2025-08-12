import {
  StockDataPoint,
  StockInfoCard,
  StockInfoStageConfig,
} from './stockinfo_stage';

// ************************************************************************* //
// CHART CONFIGURATION                                                       //
// ************************************************************************* //

export interface ChartConfig {
  width: number;
  height: number;
  leftPadding: number;
  padding: number;
  isInvestmentGrowth: boolean;
  useQuarterlyMarkers: boolean;
}

// ************************************************************************* //
// CHART GENERATION UTILITIES                                                //
// ************************************************************************* //

export interface ChartBounds {
  chartMin: number;
  chartMax: number;
  chartRange: number;
  increment: number;
}

function calculateChartBounds(
  chartData: number[],
  config: ChartConfig,
): ChartBounds {
  const dataMinValue = Math.min(...chartData);
  const dataMaxValue = Math.max(...chartData);

  // Determine order of magnitude for rounding
  const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(dataMaxValue)));
  const chartMin = config.isInvestmentGrowth
    ? 0
    : Math.max(
        0,
        Math.floor(dataMinValue / orderOfMagnitude) * orderOfMagnitude,
      );
  const chartMax =
    Math.ceil(dataMaxValue / orderOfMagnitude) * orderOfMagnitude;
  const chartRange = chartMax - chartMin;
  const increment = orderOfMagnitude;

  return {chartMin, chartMax, chartRange, increment};
}

export function calculateChartConfig(options: {
  isInvestmentGrowth?: boolean;
  useQuarterlyMarkers?: boolean;
}): ChartConfig {
  return {
    width: 600,
    height: 300,
    leftPadding: 60,
    padding: 30,
    isInvestmentGrowth: options.isInvestmentGrowth || false,
    useQuarterlyMarkers: options.useQuarterlyMarkers || false,
  };
}

export function normalizeChartValues(
  data: StockDataPoint[],
  isInvestmentGrowth: boolean,
): number[] {
  if (isInvestmentGrowth) {
    const initialPrice = data[0].close;
    return data.map((point) => (point.close / initialPrice) * 1000);
  }
  return data.map((d) => d.close);
}

export function generateSVGChartPoints(
  chartData: number[],
  config: ChartConfig,
): string {
  const {chartMin, chartRange} = calculateChartBounds(chartData, config);
  const svgWidth = config.width - config.leftPadding - config.padding;

  return chartData
    .map((value, index) => {
      const svgX =
        config.leftPadding + (index / (chartData.length - 1)) * svgWidth;
      const svgY =
        config.padding +
        (1 - (value - chartMin) / chartRange) *
          (config.height - 2 * config.padding);
      return `${svgX},${svgY}`;
    })
    .join(' ');
}

export function generateSVGDateMarkers(
  data: StockDataPoint[],
  config: ChartConfig,
): string {
  const startDate = new Date(data[0].date);
  const endDate = new Date(data[data.length - 1].date);
  const chartWidth = config.width - config.leftPadding - config.padding;
  const totalTimeMs = endDate.getTime() - startDate.getTime();
  const axisY = config.height - config.padding;
  let markers = '';

  // Year markers
  for (
    let year = startDate.getFullYear();
    year <= endDate.getFullYear();
    year++
  ) {
    const yearStart = new Date(year, 0, 1);
    const relativePosition =
      (yearStart.getTime() - startDate.getTime()) / totalTimeMs;
    const x = config.leftPadding + relativePosition * chartWidth;

    markers += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 8}" stroke="var(--md-sys-color-outline)" stroke-width="2"/>`;
    markers += `<text x="${x}" y="${axisY + 22}" font-size="11" fill="var(--md-sys-color-on-surface)" text-anchor="middle" font-weight="600">${year}</text>`;
  }

  // Month/quarter markers
  const periods = config.useQuarterlyMarkers
    ? [{months: [3, 6, 9], labels: ['Q2', 'Q3', 'Q4'], offset: 6, yOffset: 18}]
    : [
        {
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          labels: ['F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
          offset: 4,
          yOffset: 15,
        },
      ];

  periods[0].months.forEach((month, index) => {
    for (
      let year = startDate.getFullYear();
      year <= endDate.getFullYear();
      year++
    ) {
      const periodDate = new Date(year, month, 1);
      const relativePosition =
        (periodDate.getTime() - startDate.getTime()) / totalTimeMs;
      const x = config.leftPadding + relativePosition * chartWidth;

      if (x >= config.leftPadding && x <= config.width - config.padding) {
        markers += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + periods[0].offset}" stroke="var(--md-sys-color-outline-variant)" stroke-width="1"/>`;
        markers += `<text x="${x}" y="${axisY + periods[0].yOffset}" font-size="9" fill="var(--md-sys-color-on-surface-variant)" text-anchor="middle">${periods[0].labels[index]}</text>`;
      }
    }
  });

  return markers;
}

export function generateSVGReferenceLine(
  config: ChartConfig,
  chartData?: number[],
): string {
  if (!config.isInvestmentGrowth || !chartData) return '';

  const {chartMin, chartRange} = calculateChartBounds(chartData, config);
  const dataMaxValue = Math.max(...chartData);
  const dataMinValue = Math.min(...chartData);

  let referenceLines = '';

  // Initial investment line at $1,000
  const initialInvestmentValue = 1000;
  const initialSvgY =
    config.padding +
    (1 - (initialInvestmentValue - chartMin) / chartRange) *
      (config.height - 2 * config.padding);
  referenceLines += `
    <line x1="${config.leftPadding}" y1="${initialSvgY}" x2="${config.width - config.padding}" y2="${initialSvgY}" stroke="var(--md-sys-color-outline)" stroke-width="1" stroke-dasharray="4,4" />
    <text x="${config.width - config.padding - 5}" y="${initialSvgY - 5}" font-size="11" fill="var(--md-sys-color-on-surface-variant)" text-anchor="end">Initial investment</text>`;

  // Maximum investment line
  const maxSvgY =
    config.padding +
    (1 - (dataMaxValue - chartMin) / chartRange) *
      (config.height - 2 * config.padding);
  referenceLines += `
    <line x1="${config.leftPadding}" y1="${maxSvgY}" x2="${config.width - config.padding}" y2="${maxSvgY}" stroke="var(--md-sys-color-primary)" stroke-width="1" stroke-dasharray="2,2" />
    <text x="${config.width - config.padding - 5}" y="${maxSvgY - 5}" font-size="11" fill="var(--md-sys-color-primary)" text-anchor="end">High: $${Math.round(dataMaxValue).toLocaleString()}</text>`;

  // Minimum investment line (only if different from initial and not too close)
  if (Math.abs(dataMinValue - initialInvestmentValue) > 50) {
    const minSvgY =
      config.padding +
      (1 - (dataMinValue - chartMin) / chartRange) *
        (config.height - 2 * config.padding);
    referenceLines += `
      <line x1="${config.leftPadding}" y1="${minSvgY}" x2="${config.width - config.padding}" y2="${minSvgY}" stroke="var(--md-sys-color-error)" stroke-width="1" stroke-dasharray="2,2" />
      <text x="${config.width - config.padding - 5}" y="${minSvgY + 12}" font-size="11" fill="var(--md-sys-color-error)" text-anchor="end">Low: $${Math.round(dataMinValue).toLocaleString()}</text>`;
  }

  return referenceLines;
}

export function generateSVGValueLabels(
  chartData: number[],
  config: ChartConfig,
): string {
  const {chartMin, chartMax, chartRange, increment} = calculateChartBounds(
    chartData,
    config,
  );
  let labels = '';

  // Add tick marks at regular increments
  for (let value = chartMin; value <= chartMax; value += increment) {
    const tickY =
      config.padding +
      (1 - (value - chartMin) / chartRange) *
        (config.height - 2 * config.padding);
    labels += `<text x="${config.leftPadding - 5}" y="${tickY + 5}" font-size="12" fill="var(--md-sys-color-on-surface-variant)" text-anchor="end">$${value.toLocaleString()}</text>`;
  }

  return labels;
}

export function generateSVGChart(
  stockData: StockDataPoint[],
  options: {
    isInvestmentGrowth?: boolean;
    useQuarterlyMarkers?: boolean;
  } = {},
): string {
  const chartConfig = calculateChartConfig(options);
  const chartData = normalizeChartValues(
    stockData,
    chartConfig.isInvestmentGrowth,
  );
  const chartPoints = generateSVGChartPoints(chartData, chartConfig);
  const dateMarkers = generateSVGDateMarkers(stockData, chartConfig);
  const referenceLine = generateSVGReferenceLine(chartConfig, chartData);
  const valueLabels = generateSVGValueLabels(chartData, chartConfig);

  return `
    <svg width="${chartConfig.width}" height="${chartConfig.height}" viewBox="0 0 ${chartConfig.width} ${chartConfig.height}">
      <polyline points="${chartPoints}" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2" />
      <line x1="${chartConfig.leftPadding}" y1="${chartConfig.padding}" x2="${chartConfig.leftPadding}" y2="${chartConfig.height - chartConfig.padding}" stroke="var(--md-sys-color-outline)" stroke-width="1" />
      <line x1="${chartConfig.leftPadding}" y1="${chartConfig.height - chartConfig.padding}" x2="${chartConfig.width - chartConfig.padding}" y2="${chartConfig.height - chartConfig.padding}" stroke="var(--md-sys-color-outline)" stroke-width="1" />
      ${referenceLine}
      ${dateMarkers}
      ${valueLabels}
    </svg>
  `;
}

// ************************************************************************* //
// STOCK PERFORMANCE UTILITIES                                               //
// ************************************************************************* //

/** Calculate year-over-year performance for $1000 investment. */
export function calculateYearOverYearPerformance(
  data: StockDataPoint[],
): Array<{
  year: number;
  dollarChange: number;
  percentChange: number;
}> {
  if (data.length === 0) return [];

  const yearlyData: Record<number, {start: number; end: number}> = {};

  // Group data by year
  data.forEach((point) => {
    // Parse date as local date to avoid timezone issues
    const [yearStr] = point.date.split('-');
    const year = parseInt(yearStr);
    if (!yearlyData[year]) {
      yearlyData[year] = {start: point.close, end: point.close};
    } else {
      yearlyData[year].end = point.close;
    }
  });

  const performance = [];
  for (const [yearStr, {start, end}] of Object.entries(yearlyData)) {
    const year = parseInt(yearStr);
    const percentChange = ((end - start) / start) * 100;
    const dollarChange = (percentChange / 100) * 1000;
    performance.push({year, dollarChange, percentChange});
  }

  return performance;
}

/** Get best and worst year performance. */
export function getBestAndWorstYearPerformance(data: StockDataPoint[]): {
  best: {year: number; dollarChange: number; percentChange: number} | null;
  worst: {year: number; dollarChange: number; percentChange: number} | null;
} {
  const performance = calculateYearOverYearPerformance(data);
  if (performance.length === 0) return {best: null, worst: null};

  const best = performance.reduce((max, current) =>
    current.dollarChange > max.dollarChange ? current : max,
  );

  const worst = performance.reduce((min, current) =>
    current.dollarChange < min.dollarChange ? current : min,
  );

  return {best, worst};
}

// ************************************************************************* //
// CSV PARSING UTILITIES                                                     //
// ************************************************************************* //

export function parseStockData(csvData: string): StockDataPoint[] {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  const data: StockDataPoint[] = [];
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const [date, closeStr] = lines[i].split(',');
    const close = parseFloat(closeStr);
    if (date && !isNaN(close)) {
      data.push({date: date.trim(), close});
    }
  }

  return data.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function validateStockData(data: StockDataPoint[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push('No valid data points found');
  }

  if (data.length < 2) {
    errors.push('At least 2 data points are required');
  }

  // Check for valid dates
  const invalidDates = data.filter((point) =>
    isNaN(new Date(point.date).getTime()),
  );
  if (invalidDates.length > 0) {
    errors.push(`Invalid dates found: ${invalidDates.length} entries`);
  }

  // Check for negative prices
  const negativePrices = data.filter((point) => point.close < 0);
  if (negativePrices.length > 0) {
    errors.push(`Negative prices found: ${negativePrices.length} entries`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ************************************************************************* //
// CARD GENERATION UTILITIES                                                 //
// ************************************************************************* //

/** Generate all info cards for a stock (performance + custom cards). */
export function generateStockInfoCards(
  stock: {parsedData: StockDataPoint[]; customCards: StockInfoCard[]},
  stage: {showBestYearCard?: boolean; showWorstYearCard?: boolean},
): StockInfoCard[] {
  const cards: StockInfoCard[] = [];

  // Add default cards if enabled
  if (stage.showBestYearCard || stage.showWorstYearCard) {
    const performance = getBestAndWorstYearPerformance(stock.parsedData);

    if (stage.showBestYearCard && performance.best) {
      cards.push({
        id: 'best-year',
        title: 'Best Year Performance',
        value: `$${Math.abs(performance.best.dollarChange).toFixed(0)}`,
        subtext: `${performance.best.percentChange.toFixed(1)}% (${performance.best.year})`,
        enabled: true,
      });
    }

    if (stage.showWorstYearCard && performance.worst) {
      cards.push({
        id: 'worst-year',
        title: 'Worst Year Performance',
        value: `$${Math.abs(performance.worst.dollarChange).toFixed(0)}`,
        subtext: `${performance.worst.percentChange.toFixed(1)}% (${performance.worst.year})`,
        enabled: true,
      });
    }
  }

  // Add custom cards
  cards.push(...stock.customCards.filter((card) => card.enabled));

  return cards;
}

// ************************************************************************* //
// PROMPT UTILITIES                                                          //
// ************************************************************************* //

export function getStockInfoSummaryText(stage: StockInfoStageConfig): string {
  const stockDisplay = stage.stocks.map((stock) => {
    const stockInfo = [
      `## Stock Information: ${stock.name}`,
      stock.description,
    ];

    // Generate all cards using the shared utility
    const cards = generateStockInfoCards(stock, stage);

    if (cards.length > 0) {
      stockInfo.push('Key Information:');
      cards.forEach((card) => {
        stockInfo.push(`- ${card.title}: ${card.value}`);
        if (card.subtext) {
          stockInfo.push(`  ${card.subtext}`);
        }
      });
    }

    return stockInfo.join('\n');
  });
  return stockDisplay.join('\n\n');
}
