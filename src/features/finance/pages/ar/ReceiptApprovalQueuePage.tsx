import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { arService, ARReceiptItem, AROpenInvoice } from '../../services/arService';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardContent } from '../../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { formatCurrency, formatDate, formatDateTime } from '../../../../utils/formatters';
import { printerService } from '../../../../services/PrinterService';
import { pdfService } from '../../../../services/PdfService';
import { whatsAppService } from '../../../../services/WhatsAppService';
import {
  Search,
  ExternalLink,
  ChevronRight,
  X,
  ShieldCheck,
  Image as ImageIcon,
  SlidersHorizontal,
  ArrowRight,
  Landmark,
  Wallet,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Send,
  Building,
  User,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export function ReceiptApprovalQueuePage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ARReceiptItem[]>(() => arService.getReceipts());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_APPROVAL');

  // Selected item for Detailed Cash Receipt Inspection Modal (aligned with Sales Rep view)
  const [selectedReceipt, setSelectedReceipt] = useState<ARReceiptItem | null>(null);

  // Approve Modal State (Inline Settlement)
  const [approvingItem, setApprovingItem] = useState<ARReceiptItem | null>(null);
  const [autoFIFO, setAutoFIFO] = useState<boolean>(true);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});
  const [depositAccountId, setDepositAccountId] = useState<string>('acc-1010');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [drawerBank, setDrawerBank] = useState<string>('Commercial Bank of Ceylon');
  const [chequeDate, setChequeDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Reject Modal State
  const [rejectingItem, setRejectingItem] = useState<ARReceiptItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Processing state
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refreshReceipts = () => {
    setReceipts(arService.getReceipts());
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.collectorName.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [receipts, statusFilter, search]);

  const pendingCount = receipts.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const approvedCount = receipts.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = receipts.filter((r) => r.status === 'REJECTED').length;

  // Open Invoices & allocations for the receipt being approved
  const customerOpenInvoices: AROpenInvoice[] = useMemo(() => {
    if (!approvingItem) return [];
    return arService.getOpenInvoicesForCustomer(approvingItem.customerId);
  }, [approvingItem]);

  const totalAllocated = useMemo(() => {
    return Object.values(customAllocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [customAllocations]);

  const remainingReceiptAmount = useMemo(() => {
    if (!approvingItem) return 0;
    return Math.max(0, approvingItem.amount - totalAllocated);
  }, [approvingItem, totalAllocated]);

  const handleApplyAutoFIFO = () => {
    if (!approvingItem) return;
    const fifo = arService.calculateAutoFIFO(approvingItem.customerId, approvingItem.amount);
    setCustomAllocations(fifo);
    setAutoFIFO(true);
    toast.info('Applied Auto-FIFO: oldest invoices allocated sequentially.');
  };

  const handleClearAllAllocations = () => {
    setCustomAllocations({});
    setAutoFIFO(false);
  };

  const handleOpenApprove = (receipt: ARReceiptItem) => {
    setApprovingItem(receipt);
    const fifo = arService.calculateAutoFIFO(receipt.customerId, receipt.amount);
    setCustomAllocations(fifo);
    setAutoFIFO(true);
    setDepositAccountId(
      receipt.paymentMethod === 'CHEQUE'
        ? 'acc-1018'
        : receipt.paymentMethod === 'CASH'
        ? 'acc-1040'
        : 'acc-1010'
    );
    setChequeNumber(receipt.chequeNumber || '');
    setDrawerBank(receipt.bankName || 'Commercial Bank of Ceylon');
  };

  const handleConfirmApproval = () => {
    if (!approvingItem) return;

    if (totalAllocated <= 0 && customerOpenInvoices.length > 0) {
      toast.error('Please allocate at least a portion of this collection to outstanding customer invoices.');
      return;
    }

    try {
      setProcessingId(approvingItem.id);
      const allocationArray = Object.entries(customAllocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, allocatedAmount]) => ({
          invoiceId,
          allocatedAmount,
        }));

      const approved = arService.approveReceipt(
        approvingItem.id,
        depositAccountId,
        allocationArray,
        approvingItem.paymentMethod === 'CHEQUE'
          ? {
              chequeNumber: chequeNumber || 'CHQ-89012',
              drawerBank,
              maturityDate: chequeDate,
            }
          : undefined
      );

      toast.success(
        `Receipt ${approved.receiptNumber} approved! Posted Dr ${depositAccountId === 'acc-1018' ? '1018 (PDC Vault)' : depositAccountId === 'acc-1040' ? '1040 (Cash in Hand)' : '1010 (Bank)'}, Cr 1020 A/R with FIFO invoice settlement.`
      );

      refreshReceipts();
      if (selectedReceipt?.id === approvingItem.id) {
        setSelectedReceipt(arService.getReceiptById(approvingItem.id));
      }
      setApprovingItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (receipt: ARReceiptItem) => {
    setRejectingItem(receipt);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }

    try {
      arService.rejectReceipt(rejectingItem.id, rejectionReason);
      toast.info(`Receipt ${rejectingItem.receiptNumber} rejected and returned to sales representative.`);
      refreshReceipts();
      if (selectedReceipt?.id === rejectingItem.id) {
        setSelectedReceipt(arService.getReceiptById(rejectingItem.id));
      }
      setRejectingItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  // Convert ARReceiptItem to Payment-like structure for thermal print / PDF
  const asPaymentRecord = (r: ARReceiptItem) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    customerId: r.customerId,
    customerName: r.customerName,
    customerCode: r.customerCode,
    amount: r.amount,
    paymentMethod: r.paymentMethod,
    salesRepId: 'usr-rep',
    salesRepName: r.collectorName,
    collectedAt: r.collectedAt,
    status: r.status as any,
    bankName: r.bankName,
    chequeNumber: r.chequeNumber,
    notes: r.rejectionReason,
  });

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Canonical Page Header */}
      <PageHeader
        title="Receipt Approval Queue"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'AR Approvals' },
        ]}
        onBack={() => navigate('/finance')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/pdc-vault')}
              className="text-xs h-8 gap-1.5 border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60 font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-amber-700" />
              <span>PDC Vault (1018)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/credit-notes')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Credit Notes</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/allocate')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              <span>Batch Allocation</span>
            </Button>
          </div>
        }
      />

      {/* Queue Metric Cards & Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'PENDING_APPROVAL', label: 'Pending Approval', count: pendingCount, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { id: 'APPROVED', label: 'Approved & Cleared', count: approvedCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { id: 'REJECTED', label: 'Rejected / Returned', count: rejectedCount, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          { id: 'ALL', label: 'All Receipts', count: receipts.length, color: 'text-slate-700 bg-slate-50 border-slate-200' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === tab.id
                ? `${tab.color} ring-2 ring-primary/20 shadow-xs font-semibold`
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-medium text-slate-500">{tab.label}</div>
            <div className="text-xl font-bold font-mono mt-1 tabular-nums">{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, customer name, collector..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filteredReceipts.length}</span> receipt(s)
        </div>
      </div>

      {/* Standardized Industrial Receipts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Sales Rep</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount (LKR)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No receipts found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => {
                  const isPending = receipt.status === 'PENDING_APPROVAL';

                  return (
                    <tr
                      key={receipt.id}
                      onClick={() => setSelectedReceipt(receipt)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {receipt.receiptNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{receipt.customerName}</div>
                        <span className="font-mono text-[11px] text-slate-400">{receipt.customerCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {receipt.collectorName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono font-semibold ${
                              receipt.paymentMethod === 'CHEQUE'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : receipt.paymentMethod === 'CASH'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-blue-300 bg-blue-50 text-blue-800'
                            }`}
                          >
                            {receipt.paymentMethod}
                          </Badge>
                          {receipt.paymentMethod === 'CHEQUE' && (
                            <span className="text-[10px] text-amber-700 font-medium font-mono">PDC 1018</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge
                          status={receipt.status}
                          label={
                            receipt.status === 'PENDING_APPROVAL'
                              ? 'Pending Approval'
                              : receipt.status === 'APPROVED'
                              ? 'Approved'
                              : 'Rejected'
                          }
                        />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="h-7 text-xs px-2.5 text-slate-600 hover:text-slate-900 font-medium gap-1"
                            title="Inspect high-detail cash receipt"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprove(receipt)}
                                disabled={processingId === receipt.id}
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(receipt)}
                                className="h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-medium"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Detail Cash Receipt Inspection Dialog (Aligned with Sales Rep Cash Receipt) */}
      <Dialog
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
        maxWidth="max-w-3xl"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-primary">
                      {selectedReceipt.receiptNumber}
                    </span>
                    <StatusBadge
                      status={selectedReceipt.status}
                      label={
                        selectedReceipt.status === 'PENDING_APPROVAL'
                          ? 'Pending Finance Approval'
                          : selectedReceipt.status === 'APPROVED'
                          ? 'Approved & Cleared'
                          : 'Rejected'
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Collected on {new Date(selectedReceipt.collectedAt).toLocaleString()}</span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Amount Collected
                  </span>
                  <div className="font-mono text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {formatCurrency(selectedReceipt.amount)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    Method: <span className="font-mono font-semibold text-slate-900">{selectedReceipt.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Print & Share Utility Toolbar */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Receipt Output Options:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printerService.printPaymentReceipt(asPaymentRecord(selectedReceipt))}
                  className="h-7 text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  Thermal ESC/POS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pdfService.downloadReceiptPdf(asPaymentRecord(selectedReceipt))}
                  className="h-7 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => whatsAppService.sharePaymentReceipt(asPaymentRecord(selectedReceipt))}
                  className="h-7 text-xs gap-1.5 text-emerald-700 hover:text-emerald-800"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-600" />
                  WhatsApp
                </Button>
              </div>
            </div>

            {/* High-Detail 2-Column Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
              {/* Customer Information */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Customer & Route Information
                </span>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedReceipt.customerName}
                </div>
                <div className="text-slate-600 font-mono">
                  Dealer Code: <span className="font-semibold text-slate-800">{selectedReceipt.customerCode}</span>
                </div>
                <div className="text-slate-600">
                  Collecting Officer: <span className="font-medium text-slate-800">{selectedReceipt.collectorName}</span>
                </div>
              </div>

              {/* Banking & Verification */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Payment Clearing & Routing
                </span>
                {selectedReceipt.chequeNumber && (
                  <div>
                    <span className="text-slate-500">Cheque Number: </span>
                    <span className="font-mono font-bold text-slate-900">{selectedReceipt.chequeNumber}</span>
                  </div>
                )}
                {selectedReceipt.bankName && (
                  <div>
                    <span className="text-slate-500">Drawee Bank: </span>
                    <span className="font-semibold text-slate-800">{selectedReceipt.bankName}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Asset Account: </span>
                  <span className="font-mono font-semibold text-primary">
                    {selectedReceipt.paymentMethod === 'CHEQUE'
                      ? '1018 - Cheques in Hand (PDC Vault)'
                      : selectedReceipt.paymentMethod === 'CASH'
                      ? '1040 - Cash in Hand (Petty Float)'
                      : '1010 - Operating Bank Account'}
                  </span>
                </div>
              </div>
            </div>

            {/* Physical Cheque or Deposit Slip Attachment */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" />
                Physical Bank Deposit Slip / Cheque Attachment:
              </span>

              {selectedReceipt.attachmentUrl ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 relative group max-h-56">
                  <img
                    src={selectedReceipt.attachmentUrl}
                    alt="Deposit slip or cheque proof"
                    className="w-full h-56 object-cover transition-transform group-hover:scale-102 duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={selectedReceipt.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white text-slate-900 px-3.5 py-2 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Full Size Slip
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                  No physical image attached to this collection.
                </div>
              )}
            </div>

            {/* Rejection Note (if rejected) */}
            {selectedReceipt.status === 'REJECTED' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1 text-xs">
                <span className="font-bold block">Rejection Justification:</span>
                <p>{selectedReceipt.rejectionReason}</p>
              </div>
            )}

            {/* Double-Entry GL Ledger Impact Preview */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-primary" />
                  General Ledger Double-Entry Impact
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Real-Time Posting</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900">
                  <span className="font-bold block">DEBIT:</span>
                  <span>{selectedReceipt.paymentMethod === 'CHEQUE' ? '1018 PDC Vault' : selectedReceipt.paymentMethod === 'CASH' ? '1040 Cash in Hand' : '1010 Bank Account'}</span>
                  <span className="float-right font-bold">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-blue-900">
                  <span className="font-bold block">CREDIT:</span>
                  <span>1020 Accounts Receivable ({selectedReceipt.customerName.slice(0, 16)}...)</span>
                  <span className="float-right font-bold">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="text-xs"
              >
                Close Receipt
              </Button>

              {selectedReceipt.status === 'PENDING_APPROVAL' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const item = selectedReceipt;
                      setSelectedReceipt(null);
                      handleOpenReject(item);
                    }}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium"
                  >
                    Reject Receipt
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const item = selectedReceipt;
                      setSelectedReceipt(null);
                      handleOpenApprove(item);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify & Settle Invoices
                  </Button>
                </div>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Inline Auto-FIFO Settlement & Approval Modal */}
      <Dialog
        open={Boolean(approvingItem)}
        onOpenChange={(open) => !open && setApprovingItem(null)}
        maxWidth="max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Verify & Approve Customer Collection Receipt</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Confirm receipt verification, ledger account routing, and perform inline Auto-FIFO invoice settlement.
          </DialogDescription>
        </DialogHeader>

        {approvingItem && (
          <div className="space-y-4 py-2 text-xs max-h-[75vh] overflow-y-auto">
            {/* Receipt Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Receipt</span>
                  <div className="font-mono font-bold text-primary text-sm">{approvingItem.receiptNumber}</div>
                  <div className="font-bold text-slate-800">{approvingItem.customerName} ({approvingItem.customerCode})</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Collection Total</span>
                  <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(approvingItem.amount)}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                    {approvingItem.paymentMethod}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Account Routing Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Deposit Account
                </label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="acc-1010">1010 - Commercial Bank Operating Account</option>
                  <option value="acc-1040">1040 - Cash in Hand (Petty Float)</option>
                  <option value="acc-1018">1018 - Cheques in Hand (PDC Vault)</option>
                </select>
              </div>

              {approvingItem.paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cheque # & Maturity Date
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Cheque #"
                      className="h-9 text-xs font-mono"
                    />
                    <Input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Open Invoices Auto-FIFO Settlement Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Customer Open Invoices Settlement</h4>
                  <p className="text-[11px] text-slate-500">
                    Allocate collection across pending unpaid invoices. Auto-FIFO allocates oldest debts first.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyAutoFIFO}
                    className="h-7 text-xs font-medium text-primary hover:bg-primary-light"
                  >
                    Auto-FIFO
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllAllocations}
                    className="h-7 text-xs text-slate-400"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-right">Allocated (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerOpenInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No open unpaid invoices found for this customer. Total collection will be credited to customer account float.
                        </td>
                      </tr>
                    ) : (
                      customerOpenInvoices.map((inv) => {
                        const allocated = customAllocations[inv.id] || 0;
                        const remaining = Math.max(0, inv.balance - allocated);

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{inv.date}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                              {formatCurrency(inv.balance)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={inv.balance}
                                value={allocated || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCustomAllocations((prev) => ({
                                    ...prev,
                                    [inv.id]: Math.min(val, inv.balance),
                                  }));
                                  setAutoFIFO(false);
                                }}
                                className="h-7 w-28 text-right font-mono font-bold text-xs border border-slate-300 rounded px-2 focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {formatCurrency(remaining)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Allocation Summary Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                <span className="text-slate-600 font-medium">
                  Total Allocated: <span className="font-bold text-primary">{formatCurrency(totalAllocated)}</span>
                </span>
                <span className="text-slate-600 font-medium">
                  Unallocated Float: <span className="font-bold text-slate-900">{formatCurrency(remainingReceiptAmount)}</span>
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmApproval}
                disabled={processingId === approvingItem.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Bank Clearing & Post to Ledger</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={Boolean(rejectingItem)} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>Reject Receipt {rejectingItem?.receiptNumber}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-600">
              Please enter an explicit rejection justification. The receipt will be returned to the collecting sales representative:
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Deposit slip unreadable, cheque signature mismatch, or wrong drawee bank..."
              className="text-xs font-sans"
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingItem(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
