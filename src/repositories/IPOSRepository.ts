import { POSSession, CashTransaction, POSTransaction, POSTransactionStatus } from '../types/pos';

export interface POSTransactionFilters {
  sessionId?: string;
  cashierId?: string;
  customerId?: string;
  status?: POSTransactionStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface IPOSRepository {
  createSession(session: POSSession): Promise<POSSession>;
  updateSession(session: POSSession): Promise<POSSession>;
  getSessionById(id: string): Promise<POSSession | null>;
  getActiveSession(cashierId: string): Promise<POSSession | null>;
  getAllSessions(): Promise<POSSession[]>;

  addCashTransaction(cashTx: CashTransaction): Promise<CashTransaction>;
  getCashTransactionsBySession(sessionId: string): Promise<CashTransaction[]>;

  createTransaction(tx: POSTransaction): Promise<POSTransaction>;
  updateTransaction(tx: POSTransaction): Promise<POSTransaction>;
  getTransactionById(id: string): Promise<POSTransaction | null>;
  getAllTransactions(filters?: POSTransactionFilters): Promise<POSTransaction[]>;
}
