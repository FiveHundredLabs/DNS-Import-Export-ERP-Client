export interface ReportAccountRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: string;
}

export interface GeneralLedgerLine {
  id: string;
  transactionDate: string;
  entryNumber: string;
  sourceType: string;
  referenceNumber: string | null;
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface GeneralLedgerReportResponse {
  account: {
    id: string;
    code: string;
    name: string;
    normalBalance: string;
    category?: {
      code: string;
      name: string;
      rootClass: string;
    };
  };
  openingBalance: string;
  closingBalance: string;
  totalDebit: string;
  totalCredit: string;
  lines: GeneralLedgerLine[];
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  rootClass: string;
  normalBalance: string;
  totalDebit: string;
  totalCredit: string;
  netDebit: string;
  netCredit: string;
}

export interface TrialBalanceReportResponse {
  asAtDate: string;
  fiscalPeriodId: string | null;
  rows: TrialBalanceRow[];
  grandTotalDebit: string;
  grandTotalCredit: string;
  grandNetDebit: string;
  grandNetCredit: string;
  isBalanced: boolean;
  variance: string;
}

export interface ProfitLossReportResponse {
  period: {
    startDate: string;
    endDate: string;
    fiscalPeriodId?: string;
  };
  revenue: {
    rows: ReportAccountRow[];
    total: string;
  };
  cogs: {
    rows: ReportAccountRow[];
    total: string;
  };
  grossProfit: string;
  operatingExpenses: {
    rows: ReportAccountRow[];
    total: string;
  };
  operatingIncome: string;
  netProfit: string;
}

export interface BalanceSheetReportResponse {
  asAtDate: string;
  fiscalPeriodId: string | null;
  assets: {
    currentAssets: { rows: ReportAccountRow[]; total: string };
    nonCurrentAssets: { rows: ReportAccountRow[]; total: string };
    totalAssets: string;
  };
  liabilities: {
    currentLiabilities: { rows: ReportAccountRow[]; total: string };
    nonCurrentLiabilities: { rows: ReportAccountRow[]; total: string };
    totalLiabilities: string;
  };
  equity: {
    rows: ReportAccountRow[];
    unclosedNetIncome: string;
    totalEquity: string;
  };
  isBalanced: boolean;
  variance: string;
}

export interface VatSummaryReportResponse {
  period: {
    startDate: string;
    endDate: string;
    fiscalPeriodId?: string;
  };
  outputVat: {
    totalCredit: string;
    totalDebit: string;
    netOutputVat: string;
  };
  inputVat: {
    totalDebit: string;
    totalCredit: string;
    netInputVat: string;
  };
  netVatPayable: string;
  vatRate: number;
}

export interface GeneralLedgerQueryParams {
  accountId: string;
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
}

export interface TrialBalanceQueryParams {
  asAtDate?: string;
  fiscalPeriodId?: string;
  includeZeroBalance?: boolean;
}

export interface ProfitLossQueryParams {
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
}

export interface BalanceSheetQueryParams {
  asAtDate?: string;
  fiscalPeriodId?: string;
}

export interface VatSummaryQueryParams {
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
}
