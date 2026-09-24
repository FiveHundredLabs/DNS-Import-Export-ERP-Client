import { IPOSRepository, POSTransactionFilters } from '../IPOSRepository';
import { POSSession, CashTransaction, POSTransaction } from '../../types/pos';
import {
  MOCK_POS_SESSIONS,
  MOCK_CASH_TRANSACTIONS,
  MOCK_POS_TRANSACTIONS,
} from '../../mock/mockPOS';

export class MockPOSRepository implements IPOSRepository {
  private sessions: POSSession[];
  private cashTransactions: CashTransaction[];
  private transactions: POSTransaction[];

  constructor(
    initialSessions?: POSSession[],
    initialCashTx?: CashTransaction[],
    initialTx?: POSTransaction[]
  ) {
    this.sessions = initialSessions ? [...initialSessions] : JSON.parse(JSON.stringify(MOCK_POS_SESSIONS));
    this.cashTransactions = initialCashTx ? [...initialCashTx] : JSON.parse(JSON.stringify(MOCK_CASH_TRANSACTIONS));
    this.transactions = initialTx ? [...initialTx] : JSON.parse(JSON.stringify(MOCK_POS_TRANSACTIONS));
  }

  async createSession(session: POSSession): Promise<POSSession> {
    const clone = JSON.parse(JSON.stringify(session));
    this.sessions.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async updateSession(session: POSSession): Promise<POSSession> {
    const index = this.sessions.findIndex((s) => s.id === session.id);
    if (index === -1) {
      throw new Error(`POS session with ID ${session.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(session));
    this.sessions[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getSessionById(id: string): Promise<POSSession | null> {
    const session = this.sessions.find((s) => s.id === id);
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  async getActiveSession(cashierId: string): Promise<POSSession | null> {
    const session = this.sessions.find(
      (s) => s.cashierId === cashierId && s.status === 'OPEN'
    );
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  async getAllSessions(): Promise<POSSession[]> {
    return JSON.parse(JSON.stringify(this.sessions));
  }

  async addCashTransaction(cashTx: CashTransaction): Promise<CashTransaction> {
    const clone = JSON.parse(JSON.stringify(cashTx));
    this.cashTransactions.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async getCashTransactionsBySession(sessionId: string): Promise<CashTransaction[]> {
    const list = this.cashTransactions.filter((c) => c.sessionId === sessionId);
    return JSON.parse(JSON.stringify(list));
  }

  async createTransaction(tx: POSTransaction): Promise<POSTransaction> {
    const clone = JSON.parse(JSON.stringify(tx));
    this.transactions.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async updateTransaction(tx: POSTransaction): Promise<POSTransaction> {
    const index = this.transactions.findIndex((t) => t.id === tx.id);
    if (index === -1) {
      throw new Error(`POS Transaction with ID ${tx.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(tx));
    this.transactions[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getTransactionById(id: string): Promise<POSTransaction | null> {
    const tx = this.transactions.find((t) => t.id === id);
    return tx ? JSON.parse(JSON.stringify(tx)) : null;
  }

  async getAllTransactions(filters?: POSTransactionFilters): Promise<POSTransaction[]> {
    let result = [...this.transactions];

    if (filters?.sessionId) {
      result = result.filter((t) => t.sessionId === filters.sessionId);
    }

    if (filters?.cashierId) {
      result = result.filter((t) => t.cashierId === filters.cashierId);
    }

    if (filters?.customerId) {
      result = result.filter((t) => t.customerId === filters.customerId);
    }

    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.receiptNumber.toLowerCase().includes(q) ||
          t.customerName?.toLowerCase().includes(q) ||
          t.items.some(
            (i) =>
              i.productNameSnapshot.toLowerCase().includes(q) ||
              i.skuSnapshot.toLowerCase().includes(q) ||
              i.barcodeSnapshot.includes(q)
          )
      );
    }

    return JSON.parse(JSON.stringify(result));
  }
}
