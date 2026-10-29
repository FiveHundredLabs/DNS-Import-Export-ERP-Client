import { PaymentVoucher, CreatePaymentVoucherDTO, CashBookSummary } from '../types/cashbook';
import { User } from '../types/auth';
import { financeRepository } from '../features/finance/api';
import { hasPermission } from '../rules/permissions';

class CashBookService {
  private vouchers: PaymentVoucher[] = [
    {
      id: 'pv-001',
      voucherNumber: 'PV-2026-0001',
      date: '2026-10-10',
      voucherType: 'PAYMENT',
      category: 'OFFICE_EXPENSE',
      payeeOrPayer: 'Colombo Stationery Suppliers',
      amount: 14500,
      cashAccountCode: '1040',
      cashAccountName: 'Cash in Hand (Petty Float)',
      offsetAccountId: 'acc-5020',
      offsetAccountCode: '5020',
      offsetAccountName: 'Administrative & Office Expenses',
      description: 'Purchased printer toner cartridges and filing folders for showroom billing counter',
      status: 'APPROVED',
      createdBy: 'usr-105',
      createdByName: 'Sunil Jayawardena (Accounts Clerk)',
      approvedBy: 'usr-101',
      approvedByName: 'Anura Perera (Purchasing/Finance Manager)',
      approvedAt: '2026-10-10T11:30:00.000Z',
      glJournalId: 'jnl-pv-001',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T11:30:00.000Z',
    },
    {
      id: 'pv-002',
      voucherNumber: 'PV-2026-0002',
      date: '2026-10-18',
      voucherType: 'PAYMENT',
      category: 'UTILITIES',
      payeeOrPayer: 'Ceylon Electricity Board (CEB)',
      amount: 68400,
      cashAccountCode: '1010',
      cashAccountName: 'Operating Bank / Cash Account',
      offsetAccountId: 'acc-5030',
      offsetAccountCode: '5030',
      offsetAccountName: 'Electricity & Utility Expenses',
      description: 'Monthly showroom and warehouse electricity bill settlement for September 2026',
      status: 'APPROVED',
      createdBy: 'usr-105',
      createdByName: 'Sunil Jayawardena (Accounts Clerk)',
      approvedBy: 'usr-101',
      approvedByName: 'Anura Perera (Purchasing/Finance Manager)',
      approvedAt: '2026-10-18T15:00:00.000Z',
      glJournalId: 'jnl-pv-002',
      createdAt: '2026-10-18T14:00:00.000Z',
      updatedAt: '2026-10-18T15:00:00.000Z',
    },
    {
      id: 'pv-003',
      voucherNumber: 'PV-2026-0003',
      date: '2026-10-28',
      voucherType: 'PAYMENT',
      category: 'PETTY_CASH',
      payeeOrPayer: 'Dilmah Tea & Refreshments Store',
      amount: 8250,
      cashAccountCode: '1040',
      cashAccountName: 'Cash in Hand (Petty Float)',
      offsetAccountId: 'acc-5020',
      offsetAccountCode: '5020',
      offsetAccountName: 'Staff Refreshments & Amenities',
      description: 'Weekly tea, coffee, milk powder, and biscuits for warehouse logistics team',
      status: 'PENDING_APPROVAL',
      createdBy: 'usr-105',
      createdByName: 'Sunil Jayawardena (Accounts Clerk)',
      createdAt: '2026-10-28T09:30:00.000Z',
      updatedAt: '2026-10-28T09:30:00.000Z',
    },
    {
      id: 'pv-004',
      voucherNumber: 'PV-2026-0004',
      date: '2026-10-29',
      voucherType: 'PAYMENT',
      category: 'TRAVEL_TRANSPORT',
      payeeOrPayer: 'Pronto Lanka Express Couriers',
      amount: 12500,
      cashAccountCode: '1010',
      cashAccountName: 'Operating Bank / Cash Account',
      offsetAccountId: 'acc-5040',
      offsetAccountCode: '5040',
      offsetAccountName: 'Freight, Dispatch & Courier Charges',
      description: 'Emergency urgent warranty PCB delivery dispatched to Kandy branch showroom',
      status: 'PENDING_APPROVAL',
      createdBy: 'usr-105',
      createdByName: 'Sunil Jayawardena (Accounts Clerk)',
      createdAt: '2026-10-29T16:15:00.000Z',
      updatedAt: '2026-10-29T16:15:00.000Z',
    },
    {
      id: 'pv-005',
      voucherNumber: 'RV-2026-0001',
      date: '2026-10-12',
      voucherType: 'RECEIPT',
      category: 'FLOAT_REPLENISHMENT',
      payeeOrPayer: 'Commercial Bank Operating Cheque #884912',
      amount: 50000,
      cashAccountCode: '1040',
      cashAccountName: 'Cash in Hand (Petty Float)',
      offsetAccountId: 'acc-1010',
      offsetAccountCode: '1010',
      offsetAccountName: 'Operating Bank Account',
      description: 'Petty cash monthly float replenishment withdrawn via cash cheque',
      status: 'APPROVED',
      createdBy: 'usr-105',
      createdByName: 'Sunil Jayawardena (Accounts Clerk)',
      approvedBy: 'usr-101',
      approvedByName: 'Anura Perera (Purchasing/Finance Manager)',
      approvedAt: '2026-10-12T10:00:00.000Z',
      glJournalId: 'jnl-rv-001',
      createdAt: '2026-10-12T09:00:00.000Z',
      updatedAt: '2026-10-12T10:00:00.000Z',
    },
  ];

  async getVouchers(): Promise<PaymentVoucher[]> {
    return [...this.vouchers];
  }

  async getSummary(): Promise<CashBookSummary> {
    const accounts = await financeRepository.getAccounts();
    const acc1010 = accounts.find((a) => a.code === '1010');
    const acc1040 = accounts.find((a) => a.code === '1040');

    const base1010 = acc1010 ? acc1010.currentBalance : 2500000;
    const base1040 = acc1040 ? acc1040.currentBalance : 75000;

    const pending = this.vouchers.filter((v) => v.status === 'PENDING_APPROVAL');
    const pendingAmount = pending.reduce((sum, v) => sum + v.amount, 0);

    const approvedThisMonth = this.vouchers.filter((v) => v.status === 'APPROVED');
    const monthlyDisbursements = approvedThisMonth
      .filter((v) => v.voucherType === 'PAYMENT')
      .reduce((sum, v) => sum + v.amount, 0);

    const monthlyReceipts = approvedThisMonth
      .filter((v) => v.voucherType === 'RECEIPT')
      .reduce((sum, v) => sum + v.amount, 0);

    return {
      account1010Balance: base1010,
      account1040Balance: base1040,
      pendingApprovalsCount: pending.length,
      pendingApprovalsAmount: pendingAmount,
      monthlyDisbursements,
      monthlyReceipts,
    };
  }

  async createVoucher(dto: CreatePaymentVoucherDTO, currentUser: User): Promise<PaymentVoucher> {
    if (!dto.amount || dto.amount <= 0) {
      throw new Error('Voucher amount must be strictly greater than zero.');
    }
    if (!dto.payeeOrPayer || dto.payeeOrPayer.trim().length === 0) {
      throw new Error('Payee or Payer name is required.');
    }
    if (!dto.description || dto.description.trim().length === 0) {
      throw new Error('Voucher narrative description is required.');
    }

    const summary = await this.getSummary();
    const availableBalance =
      dto.cashAccountCode === '1010' ? summary.account1010Balance : summary.account1040Balance;

    if (dto.voucherType === 'PAYMENT' && dto.amount > availableBalance) {
      throw new Error(
        `Insufficient funds in Cash Account ${dto.cashAccountCode}. Requested: LKR ${dto.amount.toLocaleString()}, Available: LKR ${availableBalance.toLocaleString()}`
      );
    }

    const accounts = await financeRepository.getAccounts();
    const offsetAcc = accounts.find((a) => a.code === dto.offsetAccountCode) || {
      id: `acc-${dto.offsetAccountCode}`,
      code: dto.offsetAccountCode,
      name: dto.offsetAccountName || 'Operating Expense Account',
    };

    const isPayment = dto.voucherType === 'PAYMENT';
    const prefix = isPayment ? 'PV' : 'RV';
    const voucherNumber = `${prefix}-2026-${String(Math.floor(10 + Math.random() * 90)).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const voucher: PaymentVoucher = {
      id: `pv-${Date.now()}`,
      voucherNumber,
      date: dto.date || now.split('T')[0],
      voucherType: dto.voucherType,
      category: dto.category,
      payeeOrPayer: dto.payeeOrPayer.trim(),
      amount: dto.amount,
      cashAccountCode: dto.cashAccountCode,
      cashAccountName:
        dto.cashAccountCode === '1010' ? 'Operating Bank / Cash Account' : 'Cash in Hand (Petty Float)',
      offsetAccountId: offsetAcc.id,
      offsetAccountCode: offsetAcc.code,
      offsetAccountName: offsetAcc.name,
      description: dto.description.trim(),
      status: 'PENDING_APPROVAL',
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    this.vouchers.unshift(voucher);

    // If autoApprove requested and user has authorization (MG-02)
    if (
      dto.autoApprove &&
      (currentUser.role === 'DIRECTOR' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'FINANCE_MANAGER' ||
        hasPermission(currentUser.role, 'finance:voucher_approve'))
    ) {
      return this.approveVoucher(voucher.id, currentUser);
    }

    return voucher;
  }

  async approveVoucher(voucherId: string, currentUser: User): Promise<PaymentVoucher> {
    const voucher = this.vouchers.find((v) => v.id === voucherId);
    if (!voucher) {
      throw new Error(`Voucher record ${voucherId} not found.`);
    }

    // Role check: MG-02 requires Manager or Director
    const canApprove =
      currentUser.role === 'DIRECTOR' ||
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'FINANCE_MANAGER' ||
      hasPermission(currentUser.role, 'finance:voucher_approve');

    if (!canApprove) {
      throw new Error('Only Finance Manager, General Manager, or Director can approve cash disbursements.');
    }

    if (voucher.status === 'APPROVED') {
      return voucher;
    }

    // Post double-entry journal entry to GL
    const accounts = await financeRepository.getAccounts();
    const cashAcc = accounts.find((a) => a.code === voucher.cashAccountCode);
    const offsetAcc = accounts.find((a) => a.code === voucher.offsetAccountCode);

    if (cashAcc) {
      // For PAYMENT: Dr Offset Account, Cr Cash Account (reduces cash balance)
      // For RECEIPT: Dr Cash Account, Cr Offset Account (increases cash balance)
      try {
        const jnl = await financeRepository.createJournalEntry({
          date: voucher.date,
          reference: voucher.voucherNumber,
          description: `${voucher.voucherType === 'PAYMENT' ? 'Cash Disbursement' : 'Cash Intake'}: ${voucher.payeeOrPayer} - ${voucher.description}`,
          lines: [
            {
              accountId: voucher.voucherType === 'PAYMENT' ? offsetAcc?.id || 'acc-5020' : cashAcc.id,
              debit: voucher.amount,
              credit: 0,
              description: voucher.description,
            },
            {
              accountId: voucher.voucherType === 'PAYMENT' ? cashAcc.id : offsetAcc?.id || 'acc-5020',
              debit: 0,
              credit: voucher.amount,
              description: voucher.description,
            },
          ],
        });
        voucher.glJournalId = jnl.id;
      } catch {
        // Fallback for mocked environment
        voucher.glJournalId = `jnl-${voucher.voucherNumber.toLowerCase()}`;
      }
    }

    voucher.status = 'APPROVED';
    voucher.approvedBy = currentUser.id;
    voucher.approvedByName = currentUser.name;
    voucher.approvedAt = new Date().toISOString();
    voucher.updatedAt = new Date().toISOString();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cashbook-voucher-approved', { detail: voucher }));
    }

    return voucher;
  }

  async rejectVoucher(voucherId: string, reason: string, currentUser: User): Promise<PaymentVoucher> {
    const voucher = this.vouchers.find((v) => v.id === voucherId);
    if (!voucher) {
      throw new Error(`Voucher record ${voucherId} not found.`);
    }

    const canApprove =
      currentUser.role === 'DIRECTOR' ||
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'FINANCE_MANAGER' ||
      hasPermission(currentUser.role, 'finance:voucher_approve');

    if (!canApprove) {
      throw new Error('Only Finance Manager, General Manager, or Director can reject cash disbursements.');
    }

    voucher.status = 'REJECTED';
    voucher.rejectionReason = reason;
    voucher.updatedAt = new Date().toISOString();
    return voucher;
  }
}

export const cashBookService = new CashBookService();
