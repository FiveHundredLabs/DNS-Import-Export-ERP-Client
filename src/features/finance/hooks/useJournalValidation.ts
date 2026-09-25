import { useMemo } from 'react';
import { JournalLineItemState } from '../components/DebitCreditRow';

export function useJournalValidation(lines: JournalLineItemState[]) {
  const totalDebit = useMemo(() => {
    const sum = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
    return Number(sum.toFixed(2));
  }, [lines]);

  const totalCredit = useMemo(() => {
    const sum = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
    return Number(sum.toFixed(2));
  }, [lines]);

  const difference = useMemo(() => {
    return Number(Math.abs(totalDebit - totalCredit).toFixed(2));
  }, [totalDebit, totalCredit]);

  const isBalanced = useMemo(() => {
    return difference === 0 && totalDebit > 0;
  }, [difference, totalDebit]);

  const hasEmptyAccounts = useMemo(() => {
    return lines.some((l) => !l.accountId);
  }, [lines]);

  const isValid = useMemo(() => {
    return isBalanced && !hasEmptyAccounts && lines.length >= 2;
  }, [isBalanced, hasEmptyAccounts, lines.length]);

  return {
    totalDebit,
    totalCredit,
    difference,
    isBalanced,
    hasEmptyAccounts,
    isValid,
  };
}
