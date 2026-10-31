import { IPOSRepository, POSTransactionFilters } from '../IPOSRepository';
import {
  POSSession,
  CashTransaction,
  POSTransaction,
  POSTerminal,
  POSManagerToken,
  ShowroomOffer,
  POSRefundRequest,
  POSVoidRequest,
} from '../../types/pos';
import {
  MOCK_POS_SESSIONS,
  MOCK_CASH_TRANSACTIONS,
  MOCK_POS_TRANSACTIONS,
  MOCK_POS_TERMINALS,
  MOCK_POS_MANAGER_TOKENS,
  MOCK_SHOWROOM_OFFERS,
  MOCK_POS_REFUND_REQUESTS,
  MOCK_POS_VOID_REQUESTS,
} from '../../mock/mockPOS';

export class MockPOSRepository implements IPOSRepository {
  private sessions: POSSession[];
  private cashTransactions: CashTransaction[];
  private transactions: POSTransaction[];
  private terminals: POSTerminal[];
  private tokens: POSManagerToken[];
  private offers: ShowroomOffer[];
  private refundRequests: POSRefundRequest[];
  private voidRequests: POSVoidRequest[];

  constructor(
    initialSessions?: POSSession[],
    initialCashTx?: CashTransaction[],
    initialTx?: POSTransaction[]
  ) {
    this.sessions = initialSessions ? [...initialSessions] : JSON.parse(JSON.stringify(MOCK_POS_SESSIONS));
    this.cashTransactions = initialCashTx ? [...initialCashTx] : JSON.parse(JSON.stringify(MOCK_CASH_TRANSACTIONS));
    this.transactions = initialTx ? [...initialTx] : JSON.parse(JSON.stringify(MOCK_POS_TRANSACTIONS));
    this.terminals = JSON.parse(JSON.stringify(MOCK_POS_TERMINALS));
    this.tokens = JSON.parse(JSON.stringify(MOCK_POS_MANAGER_TOKENS));
    this.offers = JSON.parse(JSON.stringify(MOCK_SHOWROOM_OFFERS));
    this.refundRequests = JSON.parse(JSON.stringify(MOCK_POS_REFUND_REQUESTS));
    this.voidRequests = JSON.parse(JSON.stringify(MOCK_POS_VOID_REQUESTS));
  }

  // -------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Cash Transactions
  // -------------------------------------------------------------
  async addCashTransaction(cashTx: CashTransaction): Promise<CashTransaction> {
    const clone = JSON.parse(JSON.stringify(cashTx));
    this.cashTransactions.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async getCashTransactionsBySession(sessionId: string): Promise<CashTransaction[]> {
    const list = this.cashTransactions.filter((c) => c.sessionId === sessionId);
    return JSON.parse(JSON.stringify(list));
  }

  async getAllCashTransactions(): Promise<CashTransaction[]> {
    return JSON.parse(JSON.stringify(this.cashTransactions));
  }

  // -------------------------------------------------------------
  // POS Transactions
  // -------------------------------------------------------------
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
    if (filters?.terminalId) {
      result = result.filter((t) => t.terminalId === filters.terminalId);
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
    if (filters?.startDate) {
      result = result.filter((t) => t.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter((t) => t.createdAt <= filters.endDate!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.receiptNumber.toLowerCase().includes(q) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          t.cashierName.toLowerCase().includes(q) ||
          t.items.some(
            (it) =>
              it.productNameSnapshot.toLowerCase().includes(q) ||
              it.skuSnapshot.toLowerCase().includes(q) ||
              it.barcodeSnapshot.toLowerCase().includes(q)
          )
      );
    }

    return JSON.parse(JSON.stringify(result));
  }

  // -------------------------------------------------------------
  // POS Terminals
  // -------------------------------------------------------------
  async getAllTerminals(): Promise<POSTerminal[]> {
    return JSON.parse(JSON.stringify(this.terminals));
  }

  async getTerminalById(id: string): Promise<POSTerminal | null> {
    const terminal = this.terminals.find((t) => t.id === id || t.terminalCode === id);
    return terminal ? JSON.parse(JSON.stringify(terminal)) : null;
  }

  async updateTerminal(terminal: POSTerminal): Promise<POSTerminal> {
    const index = this.terminals.findIndex((t) => t.id === terminal.id);
    if (index === -1) {
      throw new Error(`POS Terminal with ID ${terminal.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(terminal));
    this.terminals[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  // -------------------------------------------------------------
  // Manager Authorization Tokens
  // -------------------------------------------------------------
  async createToken(token: POSManagerToken): Promise<POSManagerToken> {
    const clone = JSON.parse(JSON.stringify(token));
    this.tokens.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async getTokenByValue(tokenVal: string): Promise<POSManagerToken | null> {
    const token = this.tokens.find((t) => t.token.trim().toUpperCase() === tokenVal.trim().toUpperCase());
    return token ? JSON.parse(JSON.stringify(token)) : null;
  }

  async updateToken(token: POSManagerToken): Promise<POSManagerToken> {
    const index = this.tokens.findIndex((t) => t.id === token.id);
    if (index === -1) {
      throw new Error(`Manager Token with ID ${token.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(token));
    this.tokens[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getAllTokens(): Promise<POSManagerToken[]> {
    return JSON.parse(JSON.stringify(this.tokens));
  }

  // -------------------------------------------------------------
  // Showroom Offers
  // -------------------------------------------------------------
  async createOffer(offer: ShowroomOffer): Promise<ShowroomOffer> {
    const clone = JSON.parse(JSON.stringify(offer));
    this.offers.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async updateOffer(offer: ShowroomOffer): Promise<ShowroomOffer> {
    const index = this.offers.findIndex((o) => o.id === offer.id);
    if (index === -1) {
      throw new Error(`Showroom Offer with ID ${offer.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(offer));
    this.offers[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getOfferById(id: string): Promise<ShowroomOffer | null> {
    const offer = this.offers.find((o) => o.id === id);
    return offer ? JSON.parse(JSON.stringify(offer)) : null;
  }

  async getAllOffers(): Promise<ShowroomOffer[]> {
    return JSON.parse(JSON.stringify(this.offers));
  }

  // -------------------------------------------------------------
  // Refund Requests
  // -------------------------------------------------------------
  async createRefundRequest(req: POSRefundRequest): Promise<POSRefundRequest> {
    const clone = JSON.parse(JSON.stringify(req));
    this.refundRequests.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async updateRefundRequest(req: POSRefundRequest): Promise<POSRefundRequest> {
    const index = this.refundRequests.findIndex((r) => r.id === req.id);
    if (index === -1) {
      throw new Error(`Refund request with ID ${req.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(req));
    this.refundRequests[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getAllRefundRequests(): Promise<POSRefundRequest[]> {
    return JSON.parse(JSON.stringify(this.refundRequests));
  }

  // -------------------------------------------------------------
  // Void Requests
  // -------------------------------------------------------------
  async createVoidRequest(req: POSVoidRequest): Promise<POSVoidRequest> {
    const clone = JSON.parse(JSON.stringify(req));
    this.voidRequests.unshift(clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async updateVoidRequest(req: POSVoidRequest): Promise<POSVoidRequest> {
    const index = this.voidRequests.findIndex((v) => v.id === req.id);
    if (index === -1) {
      throw new Error(`Void request with ID ${req.id} not found.`);
    }
    const clone = JSON.parse(JSON.stringify(req));
    this.voidRequests[index] = clone;
    return JSON.parse(JSON.stringify(clone));
  }

  async getAllVoidRequests(): Promise<POSVoidRequest[]> {
    return JSON.parse(JSON.stringify(this.voidRequests));
  }
}
