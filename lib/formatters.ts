/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Format transaction amount with +/- prefix based on type
 */
export function formatTransactionAmount(amount: number, type: string): string {
  if (type === 'income') {
    return `+${formatCurrency(amount)}`;
  }
  return `-${formatCurrency(amount)}`;
}

/**
 * Calculate percentage of a value relative to a total
 */
export function getPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}