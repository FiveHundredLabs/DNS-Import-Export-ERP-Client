export interface ParsedStatementTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  reference: string;
  description: string;
  type: 'DEPOSIT' | 'PAYMENT';
  amount: number;
  debit: number;  // Outflow / payment from bank perspective
  credit: number; // Inflow / deposit from bank perspective
  isCleared: boolean;
}

export interface StatementMetadata {
  format: 'CSV' | 'MT940';
  accountNumber?: string;
  statementNumber?: string;
  currency?: string;
  openingBalance?: number;
  openingDate?: string;
  closingBalance?: number;
  closingDate?: string;
  totalTransactions: number;
}

export interface ParseBankStatementResult {
  success: boolean;
  transactions: ParsedStatementTransaction[];
  metadata: StatementMetadata;
  errors: string[];
}

/**
 * Standardizes date string to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YYYY or MM/DD/YYYY with slash or hyphen
  const slashMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const n1 = parseInt(slashMatch[1], 10);
    const n2 = parseInt(slashMatch[2], 10);
    const year = slashMatch[3];

    // If n2 > 12, it must be MM/DD/YYYY
    if (n2 > 12) {
      const month = String(n1).padStart(2, '0');
      const day = String(n2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Default to DD/MM/YYYY (UK/Commonwealth/Sri Lanka standard)
      const day = String(n1).padStart(2, '0');
      const month = String(n2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // YYMMDD (SWIFT MT940 format)
  if (/^\d{6}$/.test(clean)) {
    const yy = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const dd = clean.substring(4, 6);
    const year = parseInt(yy, 10) >= 70 ? `19${yy}` : `20${yy}`;
    return `${year}-${mm}-${dd}`;
  }

  return clean;
}

/**
 * Parses numeric currency strings (removes commas, handles European decimals like 1.234,56 or 1234,56)
 */
export function parseAmount(val: string | number): number {
  if (typeof val === 'number') return Math.abs(val);
  if (!val) return 0;

  let cleaned = val.toString().trim().replace(/[LKR$€£]/gi, '').trim();

  // Handle parenthesized negative: (100.50) -> -100.50
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }

  // If comma is decimal separator (e.g. 1250,50 or 1.250,50)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    // e.g. 1,250.50 vs 1.250,50
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      // 1,250.50
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // 1.250,50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < row.length; j++) {
    const char = row[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses electronic bank statements in CSV format.
 * Supports multiple standard column layouts:
 * - Date, Reference, Description, Debit, Credit
 * - Date, Reference, Description, Amount, Type
 * - Date, Reference, Description, Amount (+/-)
 */
export function parseCSVBankStatement(content: string): ParseBankStatementResult {
  const errors: string[] = [];
  const transactions: ParsedStatementTransaction[] = [];
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    return {
      success: false,
      transactions: [],
      metadata: { format: 'CSV', totalTransactions: 0 },
      errors: ['CSV file is empty or missing headers.'],
    };
  }

  // Parse header line with quote-aware row tokenizer
  const headerTokens = parseCSVRow(lines[0])
    .map((h) => h.toLowerCase().replace(/["']/g, ''));

  const dateIdx = headerTokens.findIndex((h) => h.includes('date'));
  const refIdx = headerTokens.findIndex(
    (h) => h.includes('ref') || h.includes('cheque') || h.includes('check') || h.includes('trans id')
  );
  const descIdx = headerTokens.findIndex(
    (h) => h.includes('desc') || h.includes('particular') || h.includes('narrat') || h.includes('detail')
  );
  const debitIdx = headerTokens.findIndex(
    (h) => (h.includes('debit') || h.includes('withdrawal') || h.includes('outflow') || h.includes('payment')) && !h.includes('credit')
  );
  const creditIdx = headerTokens.findIndex(
    (h) => (h.includes('credit') || h.includes('deposit') || h.includes('inflow')) && !h.includes('debit')
  );
  const amountIdx = headerTokens.findIndex(
    (h) => h.includes('amount') || h.includes('total')
  );
  const typeIdx = headerTokens.findIndex(
    (h) => h.includes('type') || h.includes('cr/dr') || h.includes('dr/cr')
  );

  if (dateIdx === -1) {
    errors.push('Could not identify a "Date" column in CSV header.');
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Split CSV handling quoted commas
    const cols = parseCSVRow(line);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] || '';
    const date = normalizeDate(rawDate);
    const reference = (refIdx !== -1 ? cols[refIdx] : '') || `REF-${i}`;
    const description = (descIdx !== -1 ? cols[descIdx] : '') || 'Bank Transaction';

    let debit = 0;
    let credit = 0;
    let amount = 0;
    let type: 'DEPOSIT' | 'PAYMENT' = 'DEPOSIT';

    if (debitIdx !== -1 && creditIdx !== -1) {
      debit = parseAmount(cols[debitIdx] || '0');
      credit = parseAmount(cols[creditIdx] || '0');

      if (credit > 0) {
        amount = credit;
        type = 'DEPOSIT';
      } else if (debit > 0) {
        amount = debit;
        type = 'PAYMENT';
      } else {
        continue; // Zero amount
      }
    } else if (amountIdx !== -1) {
      const rawAmt = cols[amountIdx] || '0';
      const parsed = parseAmount(rawAmt);
      amount = parsed;

      const rawType = typeIdx !== -1 ? cols[typeIdx]?.toUpperCase() : '';
      const isNegative = rawAmt.includes('-') || (rawAmt.startsWith('(') && rawAmt.endsWith(')'));

      if (rawType.includes('CR') || rawType.includes('DEP') || (!isNegative && typeIdx === -1)) {
        type = 'DEPOSIT';
        credit = amount;
      } else {
        type = 'PAYMENT';
        debit = amount;
      }
    } else {
      errors.push(`Row ${i}: Unable to detect transaction amount.`);
      continue;
    }

    transactions.push({
      id: `stmt-csv-${Date.now()}-${i}`,
      date,
      reference,
      description,
      type,
      amount,
      debit,
      credit,
      isCleared: false,
    });
  }

  return {
    success: transactions.length > 0,
    transactions,
    metadata: {
      format: 'CSV',
      totalTransactions: transactions.length,
    },
    errors,
  };
}

/**
 * Parses SWIFT MT940 electronic bank statement files.
 * Handles tags:
 * :20: Transaction Reference Number
 * :25: Account Identification
 * :28C: Statement Number
 * :60F: or :60M: Opening Balance
 * :61: Statement Line
 * :86: Information to Account Owner
 * :62F: or :62M: Closing Balance
 */
export function parseMT940BankStatement(content: string): ParseBankStatementResult {
  const errors: string[] = [];
  const transactions: ParsedStatementTransaction[] = [];
  const metadata: StatementMetadata = {
    format: 'MT940',
    totalTransactions: 0,
  };

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentTx: Partial<ParsedStatementTransaction> | null = null;
  let txCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tag :20: Statement Reference Number
    if (line.startsWith(':20:')) {
      metadata.statementNumber = line.substring(4).trim();
      continue;
    }

    // Tag :25: Account Identification
    if (line.startsWith(':25:')) {
      metadata.accountNumber = line.substring(4).trim();
      continue;
    }

    // Tag :60F: or :60M: Opening Balance
    // Format: :60F:C260901LKR2500000,00
    if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
      const payload = line.substring(5).trim();
      const mark = payload.charAt(0); // C or D
      const rawDate = payload.substring(1, 7); // YYMMDD
      const currency = payload.substring(7, 10); // LKR
      const amountStr = payload.substring(10);
      const amount = parseAmount(amountStr);

      metadata.openingDate = normalizeDate(rawDate);
      metadata.currency = currency;
      metadata.openingBalance = mark === 'D' ? -amount : amount;
      continue;
    }

    // Tag :61: Statement Line
    // Format: :61:2609020902CD885000,00NTRFDEP-8841//NONREF
    // or :61:260902C885000,00NTRFDEP-8841
    if (line.startsWith(':61:')) {
      if (currentTx && currentTx.date && currentTx.amount) {
        transactions.push(currentTx as ParsedStatementTransaction);
      }

      txCounter++;
      const tagContent = line.substring(4).trim();

      // Extract 6-digit value date YYMMDD
      const rawDate = tagContent.substring(0, 6);
      const date = normalizeDate(rawDate);

      // Remaining after date
      let rest = tagContent.substring(6);
      // Optional 4-digit entry date MMDD
      if (/^\d{4}/.test(rest)) {
        rest = rest.substring(4);
      }

      // Debit/Credit mark: C (Credit), D (Debit), RC (Reversal Credit), RD (Reversal Debit)
      let isCredit = true;
      if (rest.startsWith('RC')) {
        isCredit = true;
        rest = rest.substring(2);
      } else if (rest.startsWith('RD')) {
        isCredit = false;
        rest = rest.substring(2);
      } else if (rest.startsWith('C')) {
        isCredit = true;
        rest = rest.substring(1);
      } else if (rest.startsWith('D')) {
        isCredit = false;
        rest = rest.substring(1);
      }

      // Optional funds code letter (e.g. 'N', 'D')
      if (/^[A-Za-z]/.test(rest) && !/^[A-Za-z]{3}/.test(rest)) {
        rest = rest.substring(1);
      }

      // Amount: digits with comma or dot decimal
      const amtMatch = rest.match(/^([0-9]+(?:[,.][0-9]+)?)/);
      let amount = 0;
      if (amtMatch) {
        amount = parseAmount(amtMatch[1]);
        rest = rest.substring(amtMatch[1].length);
      }

      // Transaction type (3-4 chars, e.g. NTRF, NCHQ, FMSC, etc.)
      // and Reference (e.g. DEP-8841//NONREF)
      let reference = `STMT-${txCounter}`;
      if (rest.length > 0) {
        // Strip 4-letter transaction code e.g. NTRF, NCHQ
        if (/^[A-Z]{4}/.test(rest)) {
          rest = rest.substring(4);
        }
        const refParts = rest.split('//')[0].trim();
        if (refParts) {
          reference = refParts;
        }
      }

      const type = isCredit ? 'DEPOSIT' : 'PAYMENT';

      currentTx = {
        id: `stmt-mt940-${Date.now()}-${txCounter}`,
        date,
        reference,
        description: `${type === 'DEPOSIT' ? 'Deposit / Credit' : 'Payment / Debit'} ${reference}`,
        type,
        amount,
        debit: type === 'PAYMENT' ? amount : 0,
        credit: type === 'DEPOSIT' ? amount : 0,
        isCleared: false,
      };
      continue;
    }

    // Tag :86: Information to Account Owner (Narrative / Description)
    if (line.startsWith(':86:')) {
      const narrative = line.substring(4).trim();
      if (currentTx) {
        currentTx.description = narrative;
      }
      continue;
    }

    // Tag :62F: or :62M: Closing Balance
    // Format: :62F:C260930LKR2360400,00
    if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
      if (currentTx && currentTx.date && currentTx.amount) {
        transactions.push(currentTx as ParsedStatementTransaction);
        currentTx = null;
      }

      const payload = line.substring(5).trim();
      const mark = payload.charAt(0);
      const rawDate = payload.substring(1, 7);
      const currency = payload.substring(7, 10);
      const amountStr = payload.substring(10);
      const amount = parseAmount(amountStr);

      metadata.closingDate = normalizeDate(rawDate);
      metadata.currency = currency;
      metadata.closingBalance = mark === 'D' ? -amount : amount;
      continue;
    }
  }

  // Push pending last transaction
  if (currentTx && currentTx.date && currentTx.amount) {
    transactions.push(currentTx as ParsedStatementTransaction);
  }

  metadata.totalTransactions = transactions.length;

  return {
    success: transactions.length > 0,
    transactions,
    metadata,
    errors,
  };
}

/**
 * Universal dispatcher: parses content detecting CSV vs MT940 format
 */
export function parseBankStatement(content: string, filename?: string): ParseBankStatementResult {
  const trimmed = content.trim();

  // If explicit MT940 extension or SWIFT tag patterns
  if (
    filename?.toLowerCase().endsWith('.940') ||
    filename?.toLowerCase().endsWith('.sta') ||
    trimmed.startsWith(':20:') ||
    trimmed.includes(':61:') ||
    trimmed.includes(':60F:')
  ) {
    return parseMT940BankStatement(trimmed);
  }

  // Fallback to CSV parser
  return parseCSVBankStatement(trimmed);
}

/**
 * Sample generator templates for quick user testing
 */
export const SAMPLE_CSV_STATEMENT = `Date,Reference,Description,Debit,Credit,Balance
2026-09-02,DEP-8841,Customer bulk payment deposit (REC-2026-0480),0,885000,3385000
2026-09-05,CHQ-1049,Supplier settlement Kelani Cables PLC (BILL-2026-003),450000,0,2935000
2026-09-12,DEP-9012,Wholesale dealer direct transfer Muthurajawela,0,212400,3147400
2026-09-18,CHQ-1052,Vendor payment Schneider Electric (BILL-2026-001),1318000,0,1829400
2026-09-22,DEP-9045,Southern Solar deposit (REC-2026-0493),0,531000,2360400`;

export const SAMPLE_MT940_STATEMENT = `:20:STMT-SEP-2026
:25:1010-009283-001
:28C:00009/001
:60F:C260901LKR2500000,00
:61:2609020902C885000,00NTRFDEP-8841//NONREF
:86:Customer bulk payment deposit REC-2026-0480
:61:2609050905D450000,00NCHQCHQ-1049//NONREF
:86:Supplier settlement Kelani Cables PLC BILL-2026-003
:61:2609120912C212400,00NTRFDEP-9012//NONREF
:86:Wholesale dealer direct transfer Muthurajawela
:61:2609180918D1318000,00NCHQCHQ-1052//NONREF
:86:Vendor payment Schneider Electric BILL-2026-001
:61:2609220922C531000,00NTRFDEP-9045//NONREF
:86:Southern Solar deposit REC-2026-0493
:62F:C260930LKR2360400,00
-`;
