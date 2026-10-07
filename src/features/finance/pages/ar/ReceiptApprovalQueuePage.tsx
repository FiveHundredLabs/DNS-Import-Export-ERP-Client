import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { arService, ARReceiptItem, AROpenInvoice } from '../../services/arService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
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
} from 'lucide-react';
import { toast } from 'sonner';

export function ReceiptApprovalQueuePage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ARReceiptItem[]>(() => arService.getReceipts());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_APPROVAL');

  // Selected item for Side Sheet Detail View
  const [selectedReceipt, setSelectedReceipt] = useState<ARReceiptItem | null>(null);

  // Approve Modal State (Inline Settlement)
  const [approvingItem, setApprovingItem] = useState<ARReceiptItem | null>(null);
  const [autoFIFO, setAutoFIFO] = useState<boolean>(true);
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

  // Open Invoices & FIFO preview for the receipt being approved
  const customerOpenInvoices: AROpenInvoice[] = useMemo(() => {
    if (!approvingItem) return [];
    return arService.getOpenInvoicesForCustomer(approvingItem.customerId);
  }, [approvingItem]);

  const fifoAllocations: Record<string, number> = useMemo(() => {
    if (!approvingItem) return {};
    return arService.calculateAutoFIFO(approvingItem.customerId, approvingItem.amount);
  }, [approvingItem]);

  const totalFIFOAllocated = useMemo(() => {
    return Object.values(fifoAllocations).reduce((sum, v) => sum + v, 0);
  }, [fifoAllocations]);

  const handleOpenApprove = (receipt: ARReceiptItem) => {
    setApprovingItem(receipt);
    setAutoFIFO(true);
    if (receipt.paymentMethod === 'CHEQUE') {
      setChequeNumber(receipt.chequeNumber || `CHQ-${Math.floor(100000 + Math.random() * 900000)}`);
      setDrawerBank(receipt.drawerBank || 'Commercial Bank of Ceylon');
      setChequeDate(receipt.chequeDate || new Date().toISOString().slice(0, 10));
      setDepositAccountId('acc-1018');
    } else if (receipt.paymentMethod === 'CASH') {
      setDepositAccountId('acc-1040');
    } else {
      setDepositAccountId('acc-1010');
    }
  };

  const handleConfirmApprove = async () => {
    if (!approvingItem) return;
    try {
      setProcessingId(approvingItem.id);
      await arService.approveReceipt(approvingItem.id, {
        depositAccountId,
        autoFIFO,
        chequeDetails:
          approvingItem.paymentMethod === 'CHEQUE'
            ? {
                chequeNumber,
                drawerBank,
                chequeDate,
              }
            : undefined,
      });

      const methodMsg =
        approvingItem.paymentMethod === 'CHEQUE'
          ? 'Cheque routed to 1018 Cheques in Hand (PDC Vault)'
          : 'Bank deposit verified';
      const fifoMsg = autoFIFO ? 'and settled oldest unpaid invoices via Auto-FIFO' : '';

      toast.success(
        `Receipt ${approvingItem.receiptNumber} approved! ${methodMsg} ${fifoMsg}, customer credit limit restored.`
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Receipt Approval Queue
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              AR Collections & Credit Control
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Finance verification of field collections by sales representatives with inline Auto-FIFO settlement and PDC Vault custody.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/pdc-vault')}
            className="text-xs gap-1.5 border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60"
          >
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>PDC Vault (1018)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/credit-notes')}
            className="text-xs gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Credit Notes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/allocate')}
            className="text-xs gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Batch Invoice Allocation</span>
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Approval</span>
            <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Approved</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected</span>
            <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Receipts
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, customer, rep..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Receipts Table / List */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Receipt Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                    No receipts found in this category.
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
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {receipt.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{receipt.customerName}</div>
                        <span className="font-mono text-[11px] text-slate-400">{receipt.customerCode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {receipt.collectorName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
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
                            <span className="text-[10px] text-amber-700 font-medium">PDC 1018</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {receipt.status === 'PENDING_APPROVAL' && (
                          <Badge variant="warning" className="text-[10px]">Pending Approval</Badge>
                        )}
                        {receipt.status === 'APPROVED' && (
                          <Badge variant="success" className="text-[10px]">Approved</Badge>
                        )}
                        {receipt.status === 'REJECTED' && (
                          <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1 justify-end">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(receipt)}
                                className="h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprove(receipt)}
                                disabled={processingId === receipt.id}
                                className="h-7 px-2.5 bg-primary hover:bg-primary-hover text-white text-xs gap-1"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Details <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
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

      {/* Detail View Side Sheet */}
      {selectedReceipt && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Side Sheet Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">{selectedReceipt.receiptNumber}</span>
                <Badge variant={selectedReceipt.status === 'APPROVED' ? 'success' : selectedReceipt.status === 'REJECTED' ? 'destructive' : 'warning'} className="text-[10px]">
                  {selectedReceipt.status}
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                Receipt Verification Detail
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReceipt(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Side Sheet Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Customer & Amount Banner */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Customer</span>
                  <span className="text-sm font-bold text-slate-900">{selectedReceipt.customerName}</span>
                  <span className="text-slate-500 block font-mono">{selectedReceipt.customerCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Collection Amount</span>
                  <span className="text-lg font-bold font-mono text-primary tabular-nums">
                    {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Payment Method</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Sales Representative</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.collectorName}</span>
                </div>
              </div>

              {selectedReceipt.paymentMethod === 'CHEQUE' && (
                <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="font-semibold text-[11px] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <span>PDC Vault Asset Account 1018 Routing</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Cheques are kept in 1018 Cheques in Hand custody until maturity and realization into 1010 Bank cash.
                  </p>
                </div>
              )}
            </div>

            {/* Attached Deposit Slip / Cheque Image Preview */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                Physical Bank Deposit Slip / Cheque Attachment:
              </span>

              {selectedReceipt.attachmentUrl ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-900/5 group relative">
                  <img
                    src={selectedReceipt.attachmentUrl}
                    alt="Deposit slip or cheque proof"
                    className="w-full h-52 object-cover transition-transform group-hover:scale-105 duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={selectedReceipt.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white text-slate-900 px-3 py-1.5 rounded-md font-semibold text-xs shadow-md flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> View Full Slip
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  No image proof attached
                </div>
              )}
            </div>

            {/* Rejection Note (if rejected) */}
            {selectedReceipt.status === 'REJECTED' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                <span className="font-bold block">Rejection Reason:</span>
                <p className="text-xs">{selectedReceipt.rejectionReason}</p>
              </div>
            )}

            {/* Allocation Link */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full justify-between text-xs"
                onClick={() => {
                  setSelectedReceipt(null);
                  navigate(`/finance/ar/allocate?receiptId=${selectedReceipt.id}`);
                }}
              >
                <span>Allocate Collection to Customer Invoices</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Side Sheet Footer Actions */}
          {selectedReceipt.status === 'PENDING_APPROVAL' && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => handleOpenReject(selectedReceipt)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
              >
                Reject Receipt
              </Button>

              <Button
                onClick={() => handleOpenApprove(selectedReceipt)}
                disabled={processingId === selectedReceipt.id}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Confirm Bank Clearing & Restore Credit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Unified Receipt Approval Modal with Inline Auto-FIFO Settlement */}
      <Dialog
        open={Boolean(approvingItem)}
        onOpenChange={(open) => !open && setApprovingItem(null)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Verify & Approve Customer Collection Receipt</span>
          </DialogTitle>
          <DialogDescription>
            Confirm receipt verification, ledger account routing, and perform inline Auto-FIFO invoice settlement.
          </DialogDescription>
        </DialogHeader>

        {approvingItem && (
          <div className="space-y-4 py-2 text-xs max-h-[75vh] overflow-y-auto">
            {/* Receipt Summary Card */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-primary">{approvingItem.receiptNumber}</span>
                  <div className="font-semibold text-slate-800">{approvingItem.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Amount</div>
                  <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(approvingItem.amount)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/80">
                <span>Collector: {approvingItem.collectorName}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Method: {approvingItem.paymentMethod}
                </Badge>
              </div>
            </div>

            {/* Cheque Specific Fields (PDC Vault Rule) */}
            {approvingItem.paymentMethod === 'CHEQUE' ? (
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Post-Dated Cheque (PDC) Vault Routing</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Per Phase 3 accounting controls, un-cleared cheques are routed to{' '}
                  <strong className="font-mono font-bold text-slate-900">1018 Cheques in Hand</strong> (Debit) instead of{' '}
                  <span className="font-mono line-through text-slate-500">1010 Bank</span> cash. Transfer to Bank will occur upon manual realization in the PDC Vault.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cheque Number <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. CHQ-88201"
                      className="h-8 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Drawer Bank
                    </label>
                    <Input
                      value={drawerBank}
                      onChange={(e) => setDrawerBank(e.target.value)}
                      placeholder="e.g. Commercial Bank"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Realization Date
                    </label>
                    <Input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Deposit Account (Cash / Bank)
                </label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white text-slate-800"
                >
                  <option value="acc-1010">1010 - Bank Account (Corporate Checking)</option>
                  <option value="acc-1040">1040 - Cash in Hand (Showroom Petty Cash Float)</option>
                </select>
              </div>
            )}

            {/* Inline Settlement Section with Auto-FIFO Checkbox */}
            <div className="p-3.5 rounded-lg border border-primary-border bg-primary-light/40 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="auto-fifo-checkbox"
                  checked={autoFIFO}
                  onChange={(e) => setAutoFIFO(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <div className="flex-1">
                  <label
                    htmlFor="auto-fifo-checkbox"
                    className="font-bold text-slate-900 cursor-pointer block text-xs"
                  >
                    Apply via Auto-FIFO (Instant Invoice Settlement & Credit Restoration)
                  </label>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Finance Manager single-click settlement: verifies bank deposit, restores customer available credit limit, and automatically settles the oldest unpaid invoices sequentially without navigating to a separate allocation screen.
                  </p>
                </div>
              </div>

              {autoFIFO && (
                <div className="pt-2 border-t border-primary-border/60 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">
                      Open Invoices for {approvingItem.customerName} ({customerOpenInvoices.length}):
                    </span>
                    <span className="font-mono font-bold text-primary">
                      Auto-FIFO Settling: {formatCurrency(totalFIFOAllocated)}
                    </span>
                  </div>

                  {customerOpenInvoices.length === 0 ? (
                    <div className="p-3 rounded bg-white/70 border border-slate-200 text-slate-500 text-center text-[11px]">
                      No open overdue invoices found for this dealer. Full receipt amount will be credited to customer A/R balance.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-2">Invoice #</th>
                            <th className="p-2">Date</th>
                            <th className="p-2 text-right">Balance Due</th>
                            <th className="p-2 text-right text-emerald-700">Auto-FIFO Applied</th>
                            <th className="p-2 text-right">New Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {customerOpenInvoices.map((inv) => {
                            const applied = fifoAllocations[inv.id] || 0;
                            const newBal = Math.max(0, inv.balanceDue - applied);
                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-800">{inv.invoiceNumber}</td>
                                <td className="p-2 text-slate-500 font-sans">{formatDate(inv.date)}</td>
                                <td className="p-2 text-right text-slate-700">{formatCurrency(inv.balanceDue)}</td>
                                <td className="p-2 text-right font-bold text-emerald-600">
                                  {applied > 0 ? `-${formatCurrency(applied)}` : 'LKR 0.00'}
                                </td>
                                <td className="p-2 text-right font-semibold text-slate-900">
                                  {formatCurrency(newBal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {approvingItem.amount > totalFIFOAllocated && customerOpenInvoices.length > 0 && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex items-center justify-between">
                      <span>Overpayment / Remaining Credit to A/R:</span>
                      <strong className="font-mono">
                        {formatCurrency(approvingItem.amount - totalFIFOAllocated)}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accounting Voucher Preview */}
            <div className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] space-y-1.5 font-mono">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Universal Journal Entry Voucher Preview
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>
                  Dr {approvingItem.paymentMethod === 'CHEQUE' ? '1018 Cheques in Hand (Vault)' : '1010 Bank / Cash Account'}
                </span>
                <span>{formatCurrency(approvingItem.amount)}</span>
              </div>
              <div className="flex justify-between text-blue-400">
                <span>Cr 1020 Accounts Receivable ({approvingItem.customerName})</span>
                <span>{formatCurrency(approvingItem.amount)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApprovingItem(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmApprove}
            disabled={processingId !== null}
            className="bg-primary hover:bg-primary-hover text-white gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirm Approval & Inline Settle</span>
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={Boolean(rejectingItem)} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogHeader>
          <DialogTitle>Reject Customer Payment Receipt</DialogTitle>
          <DialogDescription>
            Specify the operational or banking discrepancy. This note will be returned to {rejectingItem?.collectorName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="block text-xs font-semibold text-slate-700">
            Rejection Reason & Explanation <span className="text-rose-500">*</span>
          </label>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Bank deposit slip seal is illegible, or cheque date has expired..."
            rows={3}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRejectingItem(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmReject}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
