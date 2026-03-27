/**
 * Currency formatting utilities using Intl.NumberFormat.
 */

/** Supported currency codes. */
export enum CurrencyCode {
  USD = 'USD', // US Dollar
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound
  INR = 'INR', // Indian Rupee
  JPY = 'JPY', // Japanese Yen
  CNY = 'CNY', // Chinese Yuan
  CAD = 'CAD', // Canadian Dollar
  AUD = 'AUD', // Australian Dollar
}

/** Display names for currency codes. */
export const CURRENCY_DISPLAY_NAMES: Record<CurrencyCode, string> = {
  [CurrencyCode.USD]: 'US Dollar ($)',
  [CurrencyCode.EUR]: 'Euro (€)',
  [CurrencyCode.GBP]: 'British Pound (£)',
  [CurrencyCode.INR]: 'Indian Rupee (₹)',
  [CurrencyCode.JPY]: 'Japanese Yen (¥)',
  [CurrencyCode.CNY]: 'Chinese Yuan (¥)',
  [CurrencyCode.CAD]: 'Canadian Dollar ($)',
  [CurrencyCode.AUD]: 'Australian Dollar ($)',
};

export interface FormatCurrencyOptions {
  /** Number of decimal places. If not specified, uses currency's default. */
  decimals?: number;
}

/**
 * Format a number as currency using Intl.NumberFormat.
 *
 * Uses the browser's built-in internationalization API for proper
 * locale-aware formatting including symbol placement and number grouping.
 *
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (default: 'USD')
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$1,000.00" or "₹1,00,000.00")
 *
 * @example
 * formatCurrency(1000) // "$1,000.00"
 * formatCurrency(1000, 'EUR') // "€1,000.00"
 * formatCurrency(100000, 'INR') // "₹1,00,000.00"
 * formatCurrency(1000, 'USD', { decimals: 0 }) // "$1,000"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options: FormatCurrencyOptions = {},
): string {
  const {decimals} = options;

  // Determine locale based on currency for proper formatting
  // (e.g., INR uses Indian numbering system with lakhs/crores)
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    EUR: 'de-DE', // Euro with proper European formatting
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
  };
  const locale = localeMap[currencyCode] ?? 'en-US';

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
  };

  // Only override decimal places if explicitly specified
  if (decimals !== undefined) {
    formatOptions.minimumFractionDigits = decimals;
    formatOptions.maximumFractionDigits = decimals;
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount);
  } catch {
    // Fallback for invalid currency codes
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}
