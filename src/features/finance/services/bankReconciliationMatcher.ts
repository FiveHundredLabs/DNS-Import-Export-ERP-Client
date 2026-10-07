import Decimal from 'decimal.js';
import { BankStatementTransaction } from '../pages/reconciliation/BankReconciliationPage';

export interface MatchCandidate {
  systemTxId: string;
  statementLineId: string;
  score: number;
  confidence: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY';
  reason: string;
}

export interface AutoMatchOptions {
  dateToleranceDays?: number; // Default 3 days
  amountTolerance?: number;    // Default 0.01
}

export interface AutoMatchResult<TSystem = BankStatementTransaction, TStatement = BankStatementTransaction> {
  matchedCount: number;
  totalSystemCount: number;
  totalStatementCount: number;
  matchRatePercentage: number;
  systemTransactions: TSystem[];
  statementTransactions: TStatement[];
  matchedPairs: Array<{
    systemId: string;
    statementId: string;
    score: number;
    confidence: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY';
  }>;
}

/**
 * Calculates absolute difference in calendar days between two YYYY-MM-DD date strings
 */
export function getDaysDifference(date1: string, date2: string): number {
  try {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    if (isNaN(d1) || isNaN(d2)) return 999;
    const diffMs = Math.abs(d1 - d2);
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Normalizes alphanumeric tokens from references or descriptions for fuzzy matching
 */
export function extractKeyTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3);
}

/**
 * Evaluates match quality between one system transaction and one statement transaction
 */
export function calculateMatchScore(
  sys: BankStatementTransaction,
  stmt: BankStatementTransaction,
  options: AutoMatchOptions = {}
): { score: number; confidence: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY'; reason: string } | null {
  const dateTolerance = options.dateToleranceDays ?? 3;
  const amountTolerance = options.amountTolerance ?? 0.01;

  // 1. Direction check:
  // System DEPOSIT (Dr Bank) <-> Bank DEPOSIT (Cr Bank)
  // System PAYMENT (Cr Bank) <-> Bank PAYMENT (Dr Bank)
  if (sys.type !== stmt.type) {
    return null;
  }

  // 2. Amount check
  const amountDiff = new Decimal(sys.amount).minus(new Decimal(stmt.amount)).abs().toNumber();
  if (amountDiff > amountTolerance) {
    return null;
  }

  // 3. Date proximity
  const daysDiff = getDaysDifference(sys.date, stmt.date);
  if (daysDiff > dateTolerance) {
    return null;
  }

  let baseScore = 0;
  if (daysDiff === 0) {
    baseScore = 100;
  } else if (daysDiff === 1) {
    baseScore = 90;
  } else if (daysDiff === 2) {
    baseScore = 80;
  } else if (daysDiff <= dateTolerance) {
    baseScore = Math.max(50, 80 - (daysDiff - 2) * 10);
  }

  // 4. Reference & Text heuristics
  let refBonus = 0;
  let reason = `Exact amount match (LKR ${sys.amount.toLocaleString()}) with ${daysDiff} day(s) date difference`;

  const sysRefClean = sys.reference.trim().toUpperCase();
  const stmtRefClean = stmt.reference.trim().toUpperCase();

  if (sysRefClean && stmtRefClean && sysRefClean === stmtRefClean) {
    refBonus += 60;
    reason += ` and identical reference (${sys.reference})`;
  } else if (
    (sysRefClean && stmt.description.toUpperCase().includes(sysRefClean)) ||
    (stmtRefClean && sys.description.toUpperCase().includes(stmtRefClean))
  ) {
    refBonus += 45;
    reason += ` and reference token found in statement description`;
  } else {
    // Check keyword token overlap
    const sysTokens = extractKeyTokens(sys.description);
    const stmtTokens = extractKeyTokens(stmt.description);
    const commonTokens = sysTokens.filter((t) => stmtTokens.includes(t));
    if (commonTokens.length > 0) {
      refBonus += Math.min(30, commonTokens.length * 10);
      reason += ` and keyword match (${commonTokens.join(', ')})`;
    }
  }

  const totalScore = baseScore + refBonus;
  let confidence: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY' = 'FUZZY';
  if (totalScore >= 140) {
    confidence = 'EXACT';
  } else if (totalScore >= 80) {
    confidence = 'DATE_TOLERANCE';
  }

  return {
    score: totalScore,
    confidence,
    reason,
  };
}

/**
 * Heuristic Auto-matching engine.
 * Matches uncleared system records against uncleared bank rows greedily by best match score.
 */
export function autoMatchTransactions(
  systemTxs: BankStatementTransaction[],
  statementTxs: BankStatementTransaction[],
  options: AutoMatchOptions = {}
): AutoMatchResult {
  const candidates: MatchCandidate[] = [];

  // Generate all viable candidate pairs among uncleared items
  for (const sys of systemTxs) {
    if (sys.isCleared) continue;

    for (const stmt of statementTxs) {
      if (stmt.isCleared) continue;

      const evalResult = calculateMatchScore(sys, stmt, options);
      if (evalResult) {
        candidates.push({
          systemTxId: sys.id,
          statementLineId: stmt.id,
          score: evalResult.score,
          confidence: evalResult.confidence,
          reason: evalResult.reason,
        });
      }
    }
  }

  // Sort candidates by score descending (highest quality matches first)
  candidates.sort((a, b) => b.score - a.score);

  const matchedSystemIds = new Set<string>();
  const matchedStatementIds = new Set<string>();
  const matchedPairs: Array<{
    systemId: string;
    statementId: string;
    score: number;
    confidence: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY';
  }> = [];

  for (const cand of candidates) {
    if (matchedSystemIds.has(cand.systemTxId) || matchedStatementIds.has(cand.statementLineId)) {
      continue;
    }

    matchedSystemIds.add(cand.systemTxId);
    matchedStatementIds.add(cand.statementLineId);
    matchedPairs.push({
      systemId: cand.systemTxId,
      statementId: cand.statementLineId,
      score: cand.score,
      confidence: cand.confidence,
    });
  }

  // Produce updated immutably mapped transaction lists
  const updatedSystem = systemTxs.map((sys) => {
    const pair = matchedPairs.find((p) => p.systemId === sys.id);
    if (pair) {
      return {
        ...sys,
        isCleared: true,
        matchedStatementLineId: pair.statementId,
        matchConfidence: pair.confidence,
      };
    }
    return sys;
  });

  const updatedStatement = statementTxs.map((stmt) => {
    const pair = matchedPairs.find((p) => p.statementId === stmt.id);
    if (pair) {
      return {
        ...stmt,
        isCleared: true,
        matchedSystemTxId: pair.systemId,
        matchConfidence: pair.confidence,
      };
    }
    return stmt;
  });

  const totalPossible = Math.max(systemTxs.length, statementTxs.length);
  const matchRate = totalPossible > 0 ? (matchedPairs.length / totalPossible) * 100 : 0;

  return {
    matchedCount: matchedPairs.length,
    totalSystemCount: systemTxs.length,
    totalStatementCount: statementTxs.length,
    matchRatePercentage: Math.round(matchRate * 10) / 10,
    systemTransactions: updatedSystem,
    statementTransactions: updatedStatement,
    matchedPairs,
  };
}
