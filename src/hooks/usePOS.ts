import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { posService, CheckoutData } from '../services/POSService';
import {
  POSSession,
  POSTransaction,
  CashTransaction,
  SessionSummary,
  POSTransactionStatus,
} from '../types/pos';
import { POSTransactionFilters } from '../repositories/IPOSRepository';

export function usePOS() {
  const { currentUser } = useAuth();
  const [activeSession, setActiveSession] = useState<POSSession | null>(null);
  const [sessions, setSessions] = useState<POSSession[]>([]);
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveSession = useCallback(async () => {
    try {
      const session = await posService.getActiveSession(currentUser.id);
      setActiveSession(session);
    } catch (err: any) {
      console.error('Failed to fetch active session:', err);
    }
  }, [currentUser.id]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, allSessions, allTx] = await Promise.all([
        posService.getActiveSession(currentUser.id),
        posService.getAllSessions(),
        posService.getAllTransactions(),
      ]);
      setActiveSession(active);
      setSessions(allSessions);
      setTransactions(allTx);
    } catch (err: any) {
      setError(err.message || 'Failed to load POS data');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const openShift = async (openingBalance: number, notes?: string): Promise<POSSession> => {
    const session = await posService.openSession(
      { id: currentUser.id, name: currentUser.name },
      openingBalance,
      notes
    );
    setActiveSession(session);
    setSessions((prev) => [session, ...prev]);
    return session;
  };

  const closeShift = async (
    sessionId: string,
    actualCash: number,
    notes?: string
  ): Promise<POSSession> => {
    const closed = await posService.closeSession(sessionId, actualCash, notes);
    setActiveSession(null);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? closed : s)));
    return closed;
  };

  const recordCashMovement = async (
    sessionId: string,
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string
  ): Promise<CashTransaction> => {
    const cashTx = await posService.recordCashMovement(
      sessionId,
      type,
      amount,
      reason,
      { id: currentUser.id, name: currentUser.name }
    );
    await fetchActiveSession();
    return cashTx;
  };

  const checkout = async (data: CheckoutData): Promise<POSTransaction> => {
    if (!activeSession) {
      throw new Error('No active open shift session. Please open a shift before checking out.');
    }
    const tx = await posService.processCheckout(activeSession.id, data, {
      id: currentUser.id,
      name: currentUser.name,
    });
    setTransactions((prev) => [tx, ...prev]);
    await fetchActiveSession();
    return tx;
  };

  const refund = async (transactionId: string, reason: string): Promise<POSTransaction> => {
    const refundedTx = await posService.refundTransaction(transactionId, reason, {
      id: currentUser.id,
      name: currentUser.name,
    });
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? refundedTx : t))
    );
    await fetchActiveSession();
    return refundedTx;
  };

  const getSummary = async (sessionId: string): Promise<SessionSummary> => {
    return posService.getSessionSummary(sessionId);
  };

  const filterTransactions = async (filters: POSTransactionFilters): Promise<POSTransaction[]> => {
    return posService.getAllTransactions(filters);
  };

  return {
    activeSession,
    sessions,
    transactions,
    loading,
    error,
    refresh: fetchAllData,
    fetchActiveSession,
    openShift,
    closeShift,
    recordCashMovement,
    checkout,
    refund,
    getSummary,
    filterTransactions,
  };
}
