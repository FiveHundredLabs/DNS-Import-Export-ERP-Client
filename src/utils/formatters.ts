/**
 * Formats a number as Sri Lankan Rupee currency (LKR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/\u00A0/g, ' ');
}

/**
 * Formats a percentage value
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Formats standard ISO date string to human-readable date
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Formats standard ISO date string to date and time
 */
export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Converts a numerical amount in LKR to formal legal words for Sri Lankan tax invoices
 */
export function numberToWordsLKR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Sri Lankan Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(num: number): string {
    let out = '';
    if (num >= 100) {
      out += `${ones[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num >= 20) {
      out += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) {
      out += `${ones[num]} `;
    }
    return out.trim();
  }

  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const intPart = Math.floor(rounded);
  const cents = Math.round((rounded - intPart) * 100);

  let remaining = intPart;
  const parts: string[] = [];

  const billions = Math.floor(remaining / 1_000_000_000);
  if (billions > 0) {
    parts.push(`${convertGroup(billions)} Billion`);
    remaining %= 1_000_000_000;
  }

  const millions = Math.floor(remaining / 1_000_000);
  if (millions > 0) {
    parts.push(`${convertGroup(millions)} Million`);
    remaining %= 1_000_000;
  }

  const thousands = Math.floor(remaining / 1_000);
  if (thousands > 0) {
    parts.push(`${convertGroup(thousands)} Thousand`);
    remaining %= 1_000;
  }

  if (remaining > 0) {
    parts.push(convertGroup(remaining));
  }

  const rupeesStr = parts.join(' ') || 'Zero';
  const centsStr = cents > 0 ? ` and Cents ${convertGroup(cents)}` : '';

  return `Sri Lankan Rupees ${rupeesStr}${centsStr} Only`;
}
