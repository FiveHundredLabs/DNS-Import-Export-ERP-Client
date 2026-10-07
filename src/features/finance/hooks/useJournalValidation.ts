import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { JournalLineItemState } from '../components/DebitCreditRow';

export function useJournalValidation(lines: JournalLineItemState[]) {
  const { totalDebit, totalCredit, difference, differenceAbs } = useMemo(() => {
    let deb = new Decimal(0);
    let cred = new Decimal(0);

    for (const l of lines) {
      if (l.debit) deb = deb.plus(new Decimal(l.debit || 0));
      if (l.credit) cred = cred.plus(new Decimal(l.credit || 0));
    }

    const diff = deb.minus(cred);
    return {
      totalDebit: deb.toNumber(),
      totalCredit: cred.toNumber(),
      difference: diff.toNumber(),
      differenceAbs: diff.abs().toNumber(),
    };
  }, [lines]);

  const isBalanced = useMemo(() => {
    return differenceAbs <= 0.001 && totalDebit > 0;
  }, [differenceAbs, totalDebit]);

  const hasEmptyAccounts = useMemo(() => {
    return lines.some((l) => !l.accountId);
  }, [lines]);

  const hasMissingEntityTags = useMemo(() => {
    return lines.some((l) => {
      if (l.accountCode === '1020') {
        return !l.customerId && !l.customerName;
      }
      if (l.accountCode === '2010') {
        return !l.supplierId && !l.supplierName;
      }
      return false;
    });
  }, [lines]);

  const isValid = useMemo(() => {
    return isBalanced && !hasEmptyAccounts && !hasMissingEntityTags && lines.length >= 2;
  }, [isBalanced, hasEmptyAccounts, hasMissingEntityTags, lines.length]);

  return {
    totalDebit,
    totalCredit,
    difference: differenceAbs,
    differenceRaw: difference,
    isBalanced,
    hasEmptyAccounts,
    hasMissingEntityTags,
    isValid,
  };
}
