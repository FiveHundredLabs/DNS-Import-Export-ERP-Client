import { useState, useMemo } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  Search,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Receipt,
  User,
  Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';

export interface PendingVerificationItem {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerCode: string;
  collectorName: string;
  collectedAt: string;
  paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  depositAccountId?: string;
  approvedAt?: string;
}

const INITIAL_VERIFICATION_QUEUE: PendingVerificationItem[] = [
  {
    id: 'pver-101',
    receiptNumber: 'REC-2026-0491',
    invoiceNumber: 'INV-2026-0042',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    collectorName: 'Kasun Wickramasinghe (Sales Rep)',
    collectedAt: '2026-09-24T14:30:00.000Z',
    paymentMethod: 'BANK_TRANSFER',
    subtotal: 3250000.0,
    vatAmount: 585000.0,
    totalAmount: 3835000.0,
    status: 'PENDING',
  },
  {
    id: 'pver-102',
    receiptNumber: 'REC-2026-0492',
    invoiceNumber: 'INV-2026-0045',
    customerName: 'Muthurajawela Engineering Enterprises',
    customerCode: 'DLR-NEG-002',
    collectorName: 'Dinesh Rathnayake (Sales Rep)',
    collectedAt: '2026-09-25T09:15:00.000Z',
    paymentMethod: 'CASH',
    subtotal: 180000.0,
    vatAmount: 32400.0,
    totalAmount: 212400.0,
    status: 'PENDING',
  },
  {
    id: 'pver-103',
    receiptNumber: 'REC-2026-0493',
    invoiceNumber: 'INV-2026-0048',
    customerName: 'Southern Solar & Electric Centre',
    customerCode: 'DLR-GAL-003',
    collectorName: 'Pradeep Alwis (Sales Rep)',
    collectedAt: '2026-09-25T11:00:00.000Z',
    paymentMethod: 'CHEQUE',
    subtotal: 450000.0,
    vatAmount: 81000.0,
    totalAmount: 531000.0,
    status: 'PENDING',
  },
  {
    id: 'pver-104',
    receiptNumber: 'REC-2026-0480',
    invoiceNumber: 'INV-2026-0039',
    customerName: 'Kandy Industrial Power Systems',
    customerCode: 'DLR-KND-004',
    collectorName: 'Chaminda Silva (Sales Rep)',
    collectedAt: '2026-09-22T10:00:00.000Z',
    paymentMethod: 'BANK_TRANSFER',
    subtotal: 750000.0,
    vatAmount: 135000.0,
    totalAmount: 885000.0,
    status: 'APPROVED',
    depositAccountId: 'acc-1010',
    approvedAt: '2026-09-22T15:30:00.000Z',
  },
];

export function PaymentApprovalPage() {
  const { accounts, postJournalEntry, fetchAccounts } = useFinanceLedger();
  const [queue, setQueue] = useState<PendingVerificationItem[]>(INITIAL_VERIFICATION_QUEUE);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  // Modal State for Approval
  const [approveItem, setApproveItem] = useState<PendingVerificationItem | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-1010'); // Default Bank Account
  const [approving, setApproving] = useState(false);

  // Modal State for Rejection
  const [rejectItem, setRejectItem] = useState<PendingVerificationItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Eligible receiving accounts: Bank Account (acc-1010) or Cash in Hand (acc-1040)
  const receivingAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.accountSubClass === 'CURRENT_ASSET' && (a.code === '1010' || a.code === '1040' || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash'))
    );
  }, [accounts]);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (statusTab !== 'ALL' && item.status !== statusTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.receiptNumber.toLowerCase().includes(q) ||
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerCode.toLowerCase().includes(q) ||
        item.collectorName.toLowerCase().includes(q)
      );
    });
  }, [queue, search, statusTab]);

  const pendingCount = queue.filter((i) => i.status === 'PENDING').length;
  const pendingTotal = queue
    .filter((i) => i.status === 'PENDING')
    .reduce((s, i) => s + i.totalAmount, 0);

  const handleOpenApprove = (item: PendingVerificationItem) => {
    setApproveItem(item);
    if (item.paymentMethod === 'CASH') {
      const cashAcc = accounts.find((a) => a.code === '1040');
      setSelectedAccountId(cashAcc ? cashAcc.id : 'acc-1010');
    } else {
      setSelectedAccountId('acc-1010');
    }
  };

  const handleConfirmApproval = async () => {
    if (!approveItem) return;

    try {
      setApproving(true);
      let receivingAcc = accounts.find((a) => a.id === selectedAccountId) || accounts.find((a) => a.code === '1010');
      let arAcc = accounts.find((a) => a.code === '1020'); // Accounts Receivable

      if (!receivingAcc || !arAcc) {
        const allAccs = await fetchAccounts();
        receivingAcc = allAccs.find((a) => a.id === selectedAccountId) || allAccs.find((a) => a.code === '1010');
        arAcc = allAccs.find((a) => a.code === '1020');
      }

      if (!receivingAcc || !arAcc) {
        throw new Error('Designated receiving account or Accounts Receivable GL account not found');
      }

      // Post General Ledger Journal Entry automatically:
      // Debit: Selected Account (Bank / Cash)
      // Credit: Accounts Receivable
      await postJournalEntry({
        date: new Date().toISOString().slice(0, 10),
        description: `Payment Verification: ${approveItem.receiptNumber} for Invoice ${approveItem.invoiceNumber} (${approveItem.customerName})`,
        reference: approveItem.receiptNumber,
        source: 'PAYMENT',
        lines: [
          {
            accountId: receivingAcc.id,
            debit: approveItem.totalAmount,
            credit: 0,
            description: `Payment deposit via ${approveItem.paymentMethod} from ${approveItem.customerName}`,
          },
          {
            accountId: arAcc.id,
            debit: 0,
            credit: approveItem.totalAmount,
            description: `Receivable clearance for ${approveItem.invoiceNumber}`,
          },
        ],
      });

      // Update state
      setQueue((prev) =>
        prev.map((i) =>
          i.id === approveItem.id
            ? {
                ...i,
                status: 'APPROVED',
                depositAccountId: receivingAcc.id,
                approvedAt: new Date().toISOString(),
              }
            : i
        )
      );

      toast.success(
        `Payment ${approveItem.receiptNumber} approved! Posted ${formatCurrency(approveItem.totalAmount)} to ${receivingAcc.name}.`
      );
      setApproveItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReject = (item: PendingVerificationItem) => {
    setRejectItem(item);
    setRejectionNote('');
  };

  const handleConfirmRejection = () => {
    if (!rejectItem) return;
    if (!rejectionNote.trim()) {
      toast.error('Explicit audit note is required for payment rejection');
      return;
    }

    setRejecting(true);
    setQueue((prev) =>
      prev.map((i) =>
        i.id === rejectItem.id
          ? {
              ...i,
              status: 'REJECTED',
              rejectionReason: rejectionNote.trim(),
            }
          : i
      )
    );
    toast.error(`Receipt ${rejectItem.receiptNumber} rejected and returned to sales rep.`);
    setRejecting(false);
    setRejectItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cash Verification Desk</h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              Payment Approvals & Sub-Ledger
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Verify sales rep and POS cash collections, deposit into Bank or Cash float, and auto-post double-entry journal vouchers.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Awaiting Verification</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Verification Value
            </span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(pendingTotal)}</span>
            <span className="text-xs text-slate-500">To be Deposited</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Automated GL Workflow
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-emerald-700">Dr Bank/Cash | Cr AR</span>
            <span className="text-xs text-slate-400 font-normal">Real-Time Sync</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt #, invoice #, customer or sales rep..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusTab(tab)}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  statusTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'PENDING'
                  ? `Pending (${pendingCount})`
                  : tab === 'APPROVED'
                  ? 'Approved'
                  : tab === 'REJECTED'
                  ? 'Rejected'
                  : 'All History'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Desk Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Receipt & Invoice</th>
                <th className="px-4 py-3">Customer / Dealer</th>
                <th className="px-4 py-3">Collector Name</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">18% VAT</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No payment collections found in this queue.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{item.receiptNumber}</div>
                      <div className="font-mono text-[11px] text-indigo-600">{item.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(item.collectedAt)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{item.customerName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.customerCode}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{item.collectorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 border-slate-200">
                        {item.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {formatCurrency(item.vatAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.status === 'PENDING' ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                      ) : item.status === 'APPROVED' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenApprove(item)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(item)}
                            className="h-7 px-2.5 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : item.status === 'APPROVED' ? (
                        <div className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Cleared to GL</span>
                        </div>
                      ) : (
                        <div
                          className="text-[11px] text-rose-600 font-medium flex items-center justify-end gap-1 cursor-help"
                          title={item.rejectionReason}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[120px]">{item.rejectionReason}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Confirmation & Account Selector Modal */}
      <Dialog open={!!approveItem} onOpenChange={(open) => !open && setApproveItem(null)}>
        <DialogHeader>
          <DialogTitle>Approve Payment & Select Deposit Account</DialogTitle>
          <DialogDescription>
            Confirm receipt of collected funds and assign to the appropriate asset account for General Ledger double-entry posting.
          </DialogDescription>
        </DialogHeader>

        {approveItem && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt / Invoice:</span>
                <span className="font-semibold text-slate-800">
                  {approveItem.receiptNumber} ({approveItem.invoiceNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{approveItem.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collected By:</span>
                <span className="text-slate-700">{approveItem.collectorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-mono font-semibold text-slate-800">{approveItem.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total Settlement:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatCurrency(approveItem.totalAmount)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designated Receiving Account <span className="text-rose-500">*</span>
              </label>
              <Select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                {receivingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} (Current: {formatCurrency(acc.currentBalance)})
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">
                This transaction will Debit the selected receiving account and Credit Accounts Receivable (1020).
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setApproveItem(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmApproval}
                disabled={approving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {approving ? 'Posting Entry...' : 'Confirm & Post to Ledger'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Rejection Audit Modal */}
      <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
        <DialogHeader>
          <DialogTitle>Reject Payment Collection</DialogTitle>
          <DialogDescription>
            Provide an audit explanation for rejecting this payment submission.
          </DialogDescription>
        </DialogHeader>

        {rejectItem && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-md border border-rose-200 text-xs text-rose-800">
              Rejecting receipt <strong>{rejectItem.receiptNumber}</strong> ({formatCurrency(rejectItem.totalAmount)}).
              The sales representative will be notified to re-verify the physical funds or cheque details.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Audit Reason <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="e.g. Cheque signature mismatch, Cash shortfall of Rs. 2,000, or invalid transaction reference..."
                rows={3}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectItem(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmRejection}
                disabled={rejecting}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
