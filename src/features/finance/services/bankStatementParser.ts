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

  // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD-Mon-YYYY or DD Mon YYYY (e.g. 02-Sep-2026, 15 Aug 2026, 05-Sep-26)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dMonYMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (dMonYMatch) {
    const day = String(parseInt(dMonYMatch[1], 10)).padStart(2, '0');
    const monStr = dMonYMatch[2].toLowerCase();
    const month = monthMap[monStr];
    if (month) {
      let yr = dMonYMatch[3];
      if (yr.length === 2) {
        const yy = parseInt(yr, 10);
        yr = yy >= 70 ? `19${yy}` : `20${String(yy).padStart(2, '0')}`;
      }
      return `${yr}-${month}-${day}`;
    }
  }

  // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, or MM/DD/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const n1 = parseInt(dmyMatch[1], 10);
    const n2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];

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

  // 2-digit year: DD/MM/YY, DD.MM.YY, DD-MM-YY
  const dmy2Match = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/);
  if (dmy2Match) {
    const n1 = parseInt(dmy2Match[1], 10);
    const n2 = parseInt(dmy2Match[2], 10);
    const yy = parseInt(dmy2Match[3], 10);
    const year = yy >= 70 ? `19${yy}` : `20${String(yy).padStart(2, '0')}`;
    const day = String(n1).padStart(2, '0');
    const month = String(n2).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // YYYYMMDD (8-digit ISO)
  if (/^\d{8}$/.test(clean)) {
    const year = clean.substring(0, 4);
    const mm = clean.substring(4, 6);
    const dd = clean.substring(6, 8);
    return `${year}-${mm}-${dd}`;
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
 * Parses numeric currency strings (removes commas, handles European decimals like 1.234,56 or 1234,56,
 * and preserves thousands commas like 450,000 or 1,250,000).
 */
export function parseAmount(val: string | number): number {
  if (typeof val === 'number') return Math.abs(val);
  if (!val) return 0;

  let cleaned = val.toString().trim().replace(/[LKR$€£]/gi, '').trim();

  // Handle parenthesized negative: (100.50) -> 100.50
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Both dot and comma present
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf(',') < cleaned.lastIndexOf('.')) {
      // 1,250,000.50 or 1,250.50 -> comma is thousand separator
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // 1.250.000,50 or 1.250,50 -> dot is thousand separator, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    // Only comma(s) present, no dot
    const commaCount = (cleaned.match(/,/g) || []).length;
    // If multiple commas (e.g. 1,250,000) or single comma followed by 3 digits (e.g. 450,000)
    if (commaCount > 1 || /^\d+,\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // European/SWIFT decimal e.g. 1250,50 or 885000,00
      cleaned = cleaned.replace(',', '.');
    }
  } else if (cleaned.includes('.')) {
    // Only dot(s) present, no comma
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      // European thousand separator e.g. 1.250.000
      cleaned = cleaned.replace(/\./g, '');
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

  // Find header row: scan first 10 lines for line containing date and amount/debit/credit/type
  let headerLineIdx = 0;
  let metadataAccount: string | undefined;

  for (let l = 0; l < Math.min(10, lines.length); l++) {
    const rawTokens = parseCSVRow(lines[l]).map((h) => h.toLowerCase().replace(/["']/g, ''));
    if (lines[l].toLowerCase().includes('account') && lines[l].includes(':')) {
      const parts = lines[l].split(':');
      metadataAccount = parts[1]?.trim();
    }
    const hasDate = rawTokens.some((h) => h.includes('date'));
    const hasAmountOrDebitCredit = rawTokens.some(
      (h) =>
        h.includes('amount') ||
        h.includes('debit') ||
        h.includes('credit') ||
        h.includes('balance') ||
        h.includes('withdrawal') ||
        h.includes('deposit')
    );
    if (hasDate && hasAmountOrDebitCredit) {
      headerLineIdx = l;
      break;
    }
  }

  // Parse header line with quote-aware row tokenizer
  const headerTokens = parseCSVRow(lines[headerLineIdx])
    .map((h) => h.toLowerCase().replace(/["']/g, ''));

  const dateIdx = headerTokens.findIndex((h) => h.includes('date'));
  const refIdx = headerTokens.findIndex(
    (h) =>
      h.includes('ref') ||
      h.includes('cheque') ||
      h.includes('check') ||
      h.includes('chq') ||
      h.includes('trans id') ||
      h.includes('txn') ||
      h.includes('doc')
  );
  const descIdx = headerTokens.findIndex(
    (h) =>
      h.includes('desc') ||
      h.includes('particular') ||
      h.includes('narrat') ||
      h.includes('detail') ||
      h.includes('memo') ||
      h.includes('remark')
  );
  const debitIdx = headerTokens.findIndex(
    (h) =>
      /\b(debit|debits|withdrawal|withdrawals|outflow|paid out|money out|payment|payments|dr)\b/i.test(h) &&
      !/\b(credit|credits|inflow|paid in|money in|receipt|receipts|cr)\b/i.test(h)
  );
  const creditIdx = headerTokens.findIndex(
    (h) =>
      /\b(credit|credits|deposit|deposits|inflow|paid in|money in|receipt|receipts|cr)\b/i.test(h) &&
      !/\b(debit|debits|outflow|paid out|money out|payment|payments|dr)\b/i.test(h)
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

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
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

      const rawType = (typeIdx !== -1 ? cols[typeIdx]?.trim().toUpperCase() : '') || '';
      const isNegative = rawAmt.includes('-') || (rawAmt.startsWith('(') && rawAmt.endsWith(')'));

      const isDepositType =
        /\b(cr|credit|dep|deposit|deposits|inflow|receipt|receipts|received|income|transfer in|collection)\b/i.test(rawType) ||
        rawType === 'C' ||
        rawType.includes('CR') ||
        rawType.includes('DEP');

      const isPaymentType =
        /\b(dr|debit|withdrawal|withdrawals|payment|payments|paid|outflow|charge|fee|expense|transfer out)\b/i.test(rawType) ||
        rawType === 'D' ||
        rawType.includes('DR') ||
        rawType.includes('WITH');

      if (isDepositType || (!isNegative && !isPaymentType && typeIdx === -1)) {
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
      accountNumber: metadataAccount,
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
  let lastTag = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tag :20: Statement Reference Number
    if (line.startsWith(':20:')) {
      lastTag = ':20:';
      if (currentTx && currentTx.date && currentTx.amount) {
        transactions.push(currentTx as ParsedStatementTransaction);
        currentTx = null;
      }
      metadata.statementNumber = line.substring(4).trim();
      continue;
    }

    // Tag :25: Account Identification
    if (line.startsWith(':25:')) {
      lastTag = ':25:';
      metadata.accountNumber = line.substring(4).trim();
      continue;
    }

    // Tag :60F: or :60M: Opening Balance
    // Format: :60F:C260901LKR2500000,00 or :60F:CR260901LKR2500000,00
    if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
      lastTag = ':60:';
      const payload = line.substring(5).trim();
      const balMatch = payload.match(/^([CD]R?|R[CD])(\d{6})([A-Z]{3})([0-9,.]+)/i);
      if (balMatch) {
        const mark = balMatch[1].toUpperCase();
        const rawDate = balMatch[2];
        const currency = balMatch[3];
        const amountStr = balMatch[4];
        const amount = parseAmount(amountStr);
        const isDebit = mark === 'D' || mark === 'DR' || mark === 'RD';

        metadata.openingDate = normalizeDate(rawDate);
        metadata.currency = currency;
        metadata.openingBalance = isDebit ? -amount : amount;
      }
      continue;
    }

    // Tag :61: Statement Line
    // Format: :61:2609020902CD885000,00NTRFDEP-8841//NONREF
    // or :61:260902C885000,00NTRFDEP-8841
    if (line.startsWith(':61:')) {
      lastTag = ':61:';
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

      // Debit/Credit mark: C (Credit), D (Debit), RC (Reversal Credit), RD (Reversal Debit), CR, DR
      let isCredit = true;
      if (rest.startsWith('RC') || rest.startsWith('CR')) {
        isCredit = true;
        rest = rest.substring(2);
      } else if (rest.startsWith('RD') || rest.startsWith('DR')) {
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
      // and Reference (e.g. DEP-8841//NONREF or NTRF//TXN-9988)
      let reference = `STMT-${txCounter}`;
      if (rest.length > 0) {
        // Strip 4-letter transaction code e.g. NTRF, NCHQ or 3-letter code
        if (/^[A-Z]{4}/.test(rest)) {
          rest = rest.substring(4);
        } else if (/^[A-Z]{3}\b/.test(rest)) {
          rest = rest.substring(3);
        }
        const parts = rest.split('//');
        const primaryRef = parts[0]?.trim();
        const secondaryRef = parts[1]?.trim();

        if (primaryRef && primaryRef !== 'NONREF') {
          reference = primaryRef;
        } else if (secondaryRef && secondaryRef !== 'NONREF') {
          reference = secondaryRef;
        } else if (primaryRef) {
          reference = primaryRef;
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
      lastTag = ':86:';
      let narrative = line.substring(4).trim();
      // Clean up common subfield code tags like ?00 or ?20
      narrative = narrative.replace(/\?[0-9]{2}/g, ' ').trim();
      if (currentTx) {
        // If currentTx reference is still generic (STMT-x or NONREF), see if narrative has a ref tag
        if (currentTx.reference?.startsWith('STMT-') || currentTx.reference === 'NONREF') {
          const refMatch = narrative.match(/(?:\/REFR?\/|\bREF:?\s*|\bCHQ:?\s*)([A-Za-z0-9-_]+)/i);
          if (refMatch) {
            currentTx.reference = refMatch[1];
          }
        }

        const fallbackPrefix = currentTx.type === 'DEPOSIT' ? 'Deposit / Credit' : 'Payment / Debit';
        if (currentTx.description?.startsWith(fallbackPrefix)) {
          currentTx.description = narrative;
        } else if (currentTx.description) {
          currentTx.description = `${currentTx.description} ${narrative}`;
        } else {
          currentTx.description = narrative;
        }
      }
      continue;
    }

    // Tag :62F: or :62M: Closing Balance
    // Format: :62F:C260930LKR2360400,00 or :62F:CR260930LKR2360400,00
    if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
      lastTag = ':62:';
      if (currentTx && currentTx.date && currentTx.amount) {
        transactions.push(currentTx as ParsedStatementTransaction);
        currentTx = null;
      }

      const payload = line.substring(5).trim();
      const balMatch = payload.match(/^([CD]R?|R[CD])(\d{6})([A-Z]{3})([0-9,.]+)/i);
      if (balMatch) {
        const mark = balMatch[1].toUpperCase();
        const rawDate = balMatch[2];
        const currency = balMatch[3];
        const amountStr = balMatch[4];
        const amount = parseAmount(amountStr);
        const isDebit = mark === 'D' || mark === 'DR' || mark === 'RD';

        metadata.closingDate = normalizeDate(rawDate);
        metadata.currency = currency;
        metadata.closingBalance = isDebit ? -amount : amount;
      }
      continue;
    }

    // Multiline continuation for narrative :86: or unlabelled SWIFT lines
    if (!line.startsWith(':') && line !== '-') {
      if (lastTag === ':86:' && currentTx) {
        currentTx.description = currentTx.description ? `${currentTx.description} ${line.trim()}` : line.trim();
      }
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
