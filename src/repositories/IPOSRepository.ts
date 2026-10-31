import {
  POSSession,
  CashTransaction,
  POSTransaction,
  POSTransactionStatus,
  POSTerminal,
  POSManagerToken,
  ShowroomOffer,
  POSRefundRequest,
  POSVoidRequest,
} from '../types/pos';

export interface POSTransactionFilters {
  sessionId?: string;
  terminalId?: string;
  cashierId?: string;
  customerId?: string;
  status?: POSTransactionStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface IPOSRepository {
  // Session methods
  createSession(session: POSSession): Promise<POSSession>;
  updateSession(session: POSSession): Promise<POSSession>;
  getSessionById(id: string): Promise<POSSession | null>;
  getActiveSession(cashierId: string): Promise<POSSession | null>;
  getAllSessions(): Promise<POSSession[]>;

  // Cash movement methods
  addCashTransaction(cashTx: CashTransaction): Promise<CashTransaction>;
  getCashTransactionsBySession(sessionId: string): Promise<CashTransaction[]>;
  getAllCashTransactions(): Promise<CashTransaction[]>;

  // Transaction methods
  createTransaction(tx: POSTransaction): Promise<POSTransaction>;
  updateTransaction(tx: POSTransaction): Promise<POSTransaction>;
  getTransactionById(id: string): Promise<POSTransaction | null>;
  getAllTransactions(filters?: POSTransactionFilters): Promise<POSTransaction[]>;

  // POS Terminal Management
  getAllTerminals(): Promise<POSTerminal[]>;
  getTerminalById(id: string): Promise<POSTerminal | null>;
  updateTerminal(terminal: POSTerminal): Promise<POSTerminal>;

  // Manager Authorization Token System
  createToken(token: POSManagerToken): Promise<POSManagerToken>;
  getTokenByValue(tokenVal: string): Promise<POSManagerToken | null>;
  updateToken(token: POSManagerToken): Promise<POSManagerToken>;
  getAllTokens(): Promise<POSManagerToken[]>;

  // Showroom Offers Management
  createOffer(offer: ShowroomOffer): Promise<ShowroomOffer>;
  updateOffer(offer: ShowroomOffer): Promise<ShowroomOffer>;
  getOfferById(id: string): Promise<ShowroomOffer | null>;
  getAllOffers(): Promise<ShowroomOffer[]>;

  // Refund Requests
  createRefundRequest(req: POSRefundRequest): Promise<POSRefundRequest>;
  updateRefundRequest(req: POSRefundRequest): Promise<POSRefundRequest>;
  getAllRefundRequests(): Promise<POSRefundRequest[]>;

  // Void Requests
  createVoidRequest(req: POSVoidRequest): Promise<POSVoidRequest>;
  updateVoidRequest(req: POSVoidRequest): Promise<POSVoidRequest>;
  getAllVoidRequests(): Promise<POSVoidRequest[]>;
}
