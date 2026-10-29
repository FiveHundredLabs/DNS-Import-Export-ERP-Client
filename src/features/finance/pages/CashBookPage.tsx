import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { cashBookService } from '../../../services/CashBookService';
import { PaymentVoucher, CashBookSummary, CashVoucherType, CashVoucherCategory } from '../../../types/cashbook';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FormField } from '../../../components/common/FormField';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function CashBookPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [summary, setSummary] = useState<CashBookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  // Modal State
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherType, setVoucherType] = useState<CashVoucherType>('PAYMENT');
  const [category, setCategory] = useState<CashVoucherCategory>('OFFICE_EXPENSE');
  const [payeeOrPayer, setPayeeOrPayer] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [cashAccountCode, setCashAccountCode] = useState<'1010' | '1040'>('1040');
  const [offsetAccountCode, setOffsetAccountCode] = useState('5020');
  const [description, setDescription] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVoucherForReject, setSelectedVoucherForReject] = useState<PaymentVoucher | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const canApprove =
    currentUser?.role === 'DIRECTOR' ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'FINANCE_MANAGER';

  const loadData = async () => {
    try {
      setLoading(true);
      const [vList, sum] = await Promise.all([
        cashBookService.getVouchers(),
        cashBookService.getSummary(),
      ]);
      setVouchers(vList);
      setSummary(sum);
    } catch {
      toast.error('Failed to load cash book entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }
    if (!payeeOrPayer.trim()) {
      toast.error('Payee or Payer name is required.');
      return;
    }
    if (!description.trim()) {
      toast.error('Description / Narrative is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await cashBookService.createVoucher(
        {
          voucherType,
          category,
          payeeOrPayer,
          amount: numAmount,
          cashAccountCode,
          offsetAccountCode,
          description,
          autoApprove,
        },
        currentUser
      );

      if (created.status === 'APPROVED') {
        toast.success(
          `Voucher ${created.voucherNumber} approved! Posted Dr ${offsetAccountCode}, Cr ${cashAccountCode} to General Ledger.`
        );
      } else {
        toast.success(
          `Payment Voucher ${created.voucherNumber} submitted for Manager approval (MG-02).`
        );
      }

      setIsNewVoucherOpen(false);
      resetForm();
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payment voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (voucherId: string) => {
    try {
      const updated = await cashBookService.approveVoucher(voucherId, currentUser);
      toast.success(
        `Voucher ${updated.voucherNumber} approved! Live Cash in Hand updated and GL impact posted.`
      );
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    }
  };

  const handleReject = async () => {
    if (!selectedVoucherForReject) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting this voucher.');
      return;
    }

    try {
      await cashBookService.rejectVoucher(selectedVoucherForReject.id, rejectionReason, currentUser);
      toast.success(`Voucher ${selectedVoucherForReject.voucherNumber} rejected.`);
      setRejectModalOpen(false);
      setSelectedVoucherForReject(null);
      setRejectionReason('');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.');
    }
  };

  const resetForm = () => {
    setVoucherType('PAYMENT');
    setCategory('OFFICE_EXPENSE');
    setPayeeOrPayer('');
    setAmount('');
    setCashAccountCode('1040');
    setOffsetAccountCode('5020');
    setDescription('');
    setAutoApprove(false);
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        searchQuery === '' ||
        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.payeeOrPayer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchAccount = accountFilter === 'ALL' || v.cashAccountCode === accountFilter;

      return matchSearch && matchStatus && matchAccount;
    });
  }, [vouchers, searchQuery, statusFilter, accountFilter]);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Page Header */}
      <PageHeader
        title="Cash Book & Payment Vouchers"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Cash Book' },
        ]}
        onBack={() => navigate('/finance')}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/finance/reports/general-ledger">
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 font-medium">
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                View General Ledger
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setIsNewVoucherOpen(true)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-8 gap-1.5 font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Payment Voucher
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account 1010 */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Operating Float (1010)</span>
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
            {summary ? formatCurrency(summary.account1010Balance) : '---'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Cash in Hand / Checking
          </div>
        </Card>

        {/* Account 1040 Petty Cash */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Petty Cash Float (1040)</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
            {summary ? formatCurrency(summary.account1040Balance) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Showroom & warehouse expense float
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card className="p-4 border-amber-200 bg-amber-50/60 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Pending Approvals (MG-02)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-950 tabular-nums">
            {summary?.pendingApprovalsCount ?? 0} Vouchers
          </div>
          <div className="mt-1 text-[11px] text-amber-800 font-mono font-medium tabular-nums">
            LKR {summary?.pendingApprovalsAmount.toLocaleString() ?? '0.00'} awaiting review
          </div>
        </Card>

        {/* Monthly Disbursements */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Monthly Disbursements</span>
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
            {summary ? formatCurrency(summary.monthlyDisbursements) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total approved cash outflows
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Voucher #, Payee, Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Accounts</option>
            <option value="1010">1010 - Bank / Operating</option>
            <option value="1040">1040 - Petty Cash</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left tabular-nums">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type & Category</th>
                <th className="py-3 px-4">Payee / Description</th>
                <th className="py-3 px-3">Cash Account</th>
                <th className="py-3 px-3">Offset Account</th>
                <th className="py-3 px-4 text-right">Amount (LKR)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading cash book records...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No payment vouchers found matching filters.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isPayment = v.voucherType === 'PAYMENT';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {v.voucherNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {v.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant="outline"
                            className={
                              isPayment
                                ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                            }
                          >
                            {isPayment ? (
                              <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 mr-0.5 inline" />
                            )}
                            {v.voucherType}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {v.category.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {v.payeeOrPayer}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {v.description}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-slate-800">
                          {v.cashAccountCode}
                        </span>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[120px]">
                          {v.cashAccountName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-slate-800">
                          {v.offsetAccountCode}
                        </span>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[140px]">
                          {v.offsetAccountName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isPayment ? 'text-slate-900' : 'text-emerald-600'
                          }`}
                        >
                          {isPayment ? '-' : '+'} {formatCurrency(v.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge
                          status={v.status}
                          label={
                            v.status === 'PENDING_APPROVAL'
                              ? 'Pending Approval'
                              : v.status === 'APPROVED'
                              ? 'Approved'
                              : 'Rejected'
                          }
                        />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {v.status === 'PENDING_APPROVAL' && canApprove ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(v.id)}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVoucherForReject(v);
                                setRejectModalOpen(true);
                              }}
                              className="h-7 px-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px]"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        ) : v.status === 'APPROVED' ? (
                          <div className="text-[11px] text-slate-500">
                            Approved by <span className="font-medium text-slate-700">{v.approvedByName?.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-600 italic">Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payment Voucher Dialog */}
      <Dialog open={isNewVoucherOpen} onOpenChange={setIsNewVoucherOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Issue Cash Voucher / Payment Order
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateVoucher} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Voucher Type" required>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as CashVoucherType)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="PAYMENT">Payment (Outflow)</option>
                  <option value="RECEIPT">Receipt (Inflow / Float)</option>
                </select>
              </FormField>

              <FormField label="Category" required>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashVoucherCategory)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="OFFICE_EXPENSE">Office Expense</option>
                  <option value="PETTY_CASH">Petty Cash Supplies</option>
                  <option value="UTILITIES">Electricity & Utilities</option>
                  <option value="TRAVEL_TRANSPORT">Freight & Travel</option>
                  <option value="FLOAT_REPLENISHMENT">Float Replenishment</option>
                  <option value="OTHER">Other Disbursement</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Payee / Recipient Name" required>
                <Input
                  value={payeeOrPayer}
                  onChange={(e) => setPayeeOrPayer(e.target.value)}
                  placeholder="e.g. CEB, Vendor, Driver..."
                  className="h-8 text-xs font-medium"
                  required
                />
              </FormField>

              <FormField label="Disbursement Amount (LKR)" required>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cash Account (Source / Float)" required>
                <select
                  value={cashAccountCode}
                  onChange={(e) => setCashAccountCode(e.target.value as '1010' | '1040')}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="1040">1040 - Petty Cash Float</option>
                  <option value="1010">1010 - Bank / Operating Float</option>
                </select>
              </FormField>

              <FormField label="Offset GL Expense / Liability" required>
                <select
                  value={offsetAccountCode}
                  onChange={(e) => setOffsetAccountCode(e.target.value)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="5020">5020 - Office & Administrative</option>
                  <option value="5030">5030 - Electricity & Utilities</option>
                  <option value="5040">5040 - Freight & Delivery Transport</option>
                  <option value="2010">2010 - Accounts Payable (Vendor)</option>
                  <option value="1010">1010 - Operating Bank (Float transfer)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Narrative / Description" required>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Specific business reason or receipt details..."
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary font-sans"
                required
              />
            </FormField>

            {canApprove && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Auto-approve immediately as Manager (Direct GL Post)</span>
              </label>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewVoucherOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold"
              >
                {isSubmitting ? 'Submitting...' : 'Issue Voucher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Reject Payment Voucher {selectedVoucherForReject?.voucherNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600">
              Please enter an explicit reason for rejecting this disbursement. The narrative will be saved to the permanent audit trail:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Missing valid vendor tax invoice or exceeding monthly allowance..."
              className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReject}
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
