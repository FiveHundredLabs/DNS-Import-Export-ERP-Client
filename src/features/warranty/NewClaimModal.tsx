import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { WarrantyRecord } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { isWarrantyValid } from '../../rules/warrantyRules';
import { formatDate } from '../../utils/formatters';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
import { AlertTriangle, CheckCircle, ShieldAlert, Search } from 'lucide-react';

interface NewClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedRecord?: WarrantyRecord | null;
}

export function NewClaimModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedRecord,
}: NewClaimModalProps) {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [warrantySearch, setWarrantySearch] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [complaintDate, setComplaintDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [complaintReason, setComplaintReason] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setComplaintReason('');
      setWarrantySearch('');
      const today = new Date().toISOString().split('T')[0];
      setComplaintDate(today);

      if (preselectedRecord) {
        setSelectedCustomerId(preselectedRecord.customerId);
        setSelectedRecordId(preselectedRecord.id);
        setSerialNumber(preselectedRecord.serialNumber || '');
        setRecords([preselectedRecord]);
      } else {
        setSelectedCustomerId('ALL');
        warrantyService.getWarrantyRecords({ status: 'ACTIVE', pageSize: 100 }).then((res) => {
          setRecords(res.data);
          if (res.data.length > 0) {
            setSelectedRecordId(res.data[0].id);
            setSerialNumber(res.data[0].serialNumber || '');
          }
        });
      }
    }
  }, [open, preselectedRecord]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchCustomer = selectedCustomerId === 'ALL' || r.customerId === selectedCustomerId;
      const q = warrantySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        (r.serialNumber && r.serialNumber.toLowerCase().includes(q));
      return matchCustomer && matchSearch;
    });
  }, [records, selectedCustomerId, warrantySearch]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId);
  const isExpired = selectedRecord
    ? !isWarrantyValid(selectedRecord.warrantyExpiryDate, complaintDate, selectedRecord.warrantyStartDate)
    : false;

  const handleRecordChange = (recordId: string) => {
    setSelectedRecordId(recordId);
    const rec = records.find((r) => r.id === recordId);
    if (rec) {
      setSerialNumber(rec.serialNumber || '');
    }
  };

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const matching = records.filter((r) => custId === 'ALL' || r.customerId === custId);
    if (matching.length > 0 && !matching.some((r) => r.id === selectedRecordId)) {
      setSelectedRecordId(matching[0].id);
      setSerialNumber(matching[0].serialNumber || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) {
      setError('Please select an active warranty record.');
      return;
    }
    if (!complaintReason.trim()) {
      setError('Please provide a detailed complaint / defect description.');
      return;
    }
    if (isExpired) {
      setError(`Cannot submit claim: warranty expired on ${formatDate(selectedRecord.warrantyExpiryDate)}.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await warrantyService.createClaim(
        {
          warrantyRecordId: selectedRecord.id,
          complaintDate,
          complaintReason: complaintReason.trim(),
          serialNumber: serialNumber.trim() || undefined,
        },
        currentUser
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit warranty claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900">
          <ShieldAlert className="h-5 w-5 text-indigo-600" />
          Lodge Warranty Claim
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Customer Selector & Search */}
        {!preselectedRecord && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Customers</option>
                {MOCK_CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Search Invoice / Product
              </label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter invoice, SKU, serial..."
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* Warranty Record Selector */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Registered Warranty Record <span className="text-rose-500">*</span>
          </label>
          {preselectedRecord ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900">{preselectedRecord.productName}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                SKU: {preselectedRecord.sku} | Invoice: {preselectedRecord.invoiceNumber} | Customer: {preselectedRecord.customerName}
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500">
              No matching warranty records found.
            </div>
          ) : (
            <select
              value={selectedRecordId}
              onChange={(e) => handleRecordChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {filteredRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.productName} ({r.sku}) - {r.customerName} [Exp: {r.warrantyExpiryDate}]
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Warranty Validity Indicator */}
        {selectedRecord && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isExpired
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {isExpired ? (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>
                {isExpired
                  ? `Warranty EXPIRED on ${formatDate(selectedRecord.warrantyExpiryDate)}`
                  : `Warranty ACTIVE until ${formatDate(selectedRecord.warrantyExpiryDate)}`}
              </span>
            </div>
            <span className="font-medium text-[11px]">
              Channel: {selectedRecord.saleType}
            </span>
          </div>
        )}

        {/* Complaint Date & Serial Number */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Complaint Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={complaintDate}
              onChange={(e) => setComplaintDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Unit Serial Number
            </label>
            <Input
              type="text"
              placeholder="e.g. SN-SCH-2025-..."
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Complaint Reason */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Defect / Complaint Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={complaintReason}
            onChange={(e) => setComplaintReason(e.target.value)}
            placeholder="Describe the failure, test observations, and customer report..."
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <DialogFooter className="mt-4 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading || isExpired || !selectedRecord}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Submitting...' : 'Lodge Claim'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
