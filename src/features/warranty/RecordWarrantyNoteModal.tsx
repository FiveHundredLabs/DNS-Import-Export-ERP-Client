import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { WarrantyRecord } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Building2,
  Barcode,
  ScanLine,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface RecordWarrantyNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedRecord?: WarrantyRecord | null;
}

export function RecordWarrantyNoteModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedRecord,
}: RecordWarrantyNoteModalProps) {
  const { currentUser } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [barcodeLookupMessage, setBarcodeLookupMessage] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: {
      productName: string;
      sku: string;
      barcode?: string;
      serialNumber?: string;
      distributorName: string;
      invoiceNumber: string;
      saleDate: string;
      warrantyPeriodMonths: number;
    };
  } | null>(null);

  const [distributorId, setDistributorId] = useState<string>('ALL');
  const [availableRecords, setAvailableRecords] = useState<WarrantyRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [noteNumber, setNoteNumber] = useState<string>('');
  const [distributorSaleDate, setDistributorSaleDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endCustomerName, setEndCustomerName] = useState<string>('');
  const [endCustomerPhone, setEndCustomerPhone] = useState<string>('');
  const [verifyImmediately, setVerifyImmediately] = useState<boolean>(true);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate default note number
  const generateNoteNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `WN-${year}-${rand}`;
  };

  useEffect(() => {
    if (open) {
      setError(null);
      setBarcodeLookupMessage(null);
      const today = new Date().toISOString().split('T')[0];
      setReceivedDate(today);
      setDistributorSaleDate(today);
      setNoteNumber(generateNoteNumber());
      setEndCustomerName('');
      setEndCustomerPhone('');
      setReviewNotes('');
      setVerifyImmediately(true);

      if (preselectedRecord) {
        setBarcodeInput(preselectedRecord.barcode || preselectedRecord.serialNumber || '');
        setDistributorId(preselectedRecord.customerId);
        setSelectedRecordId(preselectedRecord.id);
        setAvailableRecords([preselectedRecord]);
        if (preselectedRecord.dealerSoldDate) {
          setDistributorSaleDate(preselectedRecord.dealerSoldDate);
        }
        setBarcodeLookupMessage({
          type: 'success',
          message: `Unit tracked: ${preselectedRecord.productName}`,
          details: {
            productName: preselectedRecord.productName,
            sku: preselectedRecord.sku,
            barcode: preselectedRecord.barcode,
            serialNumber: preselectedRecord.serialNumber,
            distributorName: preselectedRecord.customerName,
            invoiceNumber: preselectedRecord.invoiceNumber,
            saleDate: preselectedRecord.saleDate,
            warrantyPeriodMonths: preselectedRecord.warrantyPeriodMonths,
          },
        });
      } else {
        setBarcodeInput('');
        setDistributorId('ALL');
        warrantyService.getWarrantyRecords({ saleType: 'DEALER', pageSize: 100 }).then((res) => {
          setAvailableRecords(res.data);
          if (res.data.length > 0) {
            setSelectedRecordId(res.data[0].id);
            if (res.data[0].dealerSoldDate) {
              setDistributorSaleDate(res.data[0].dealerSoldDate);
            }
          }
        });
      }
    }
  }, [open, preselectedRecord]);

  const filteredRecords = useMemo(() => {
    if (distributorId === 'ALL') return availableRecords;
    return availableRecords.filter((r) => r.customerId === distributorId);
  }, [availableRecords, distributorId]);

  const selectedRecord = availableRecords.find((r) => r.id === selectedRecordId);

  // Track unit details through unit's unique barcode number
  const trackByBarcode = (query: string) => {
    const term = query.trim().toLowerCase();
    if (!term) {
      setBarcodeLookupMessage(null);
      return;
    }

    // Look through available distributor warranty records by unit's unique barcode or serial number.
    // Barcode is assigned to each individual unit of the product, not the product itself.
    const matchedRecord = availableRecords.find((r) => {
      const matchBarcode = r.barcode && r.barcode.toLowerCase() === term;
      const matchSerial = r.serialNumber && r.serialNumber.toLowerCase() === term;
      return matchBarcode || matchSerial;
    });

    if (matchedRecord) {
      setSelectedRecordId(matchedRecord.id);
      setDistributorId(matchedRecord.customerId);
      if (matchedRecord.dealerSoldDate) {
        setDistributorSaleDate(matchedRecord.dealerSoldDate);
      }
      setBarcodeLookupMessage({
        type: 'success',
        message: `Unique Unit Located & Tracked via Unit Barcode`,
        details: {
          productName: matchedRecord.productName,
          sku: matchedRecord.sku,
          barcode: matchedRecord.barcode || term,
          serialNumber: matchedRecord.serialNumber,
          distributorName: matchedRecord.customerName,
          invoiceNumber: matchedRecord.invoiceNumber,
          saleDate: matchedRecord.saleDate,
          warrantyPeriodMonths: matchedRecord.warrantyPeriodMonths,
        },
      });
      return;
    }

    // Substring match on unique unit barcode or unit serial number
    const partialMatch = availableRecords.find(
      (r) =>
        (r.barcode && r.barcode.toLowerCase().includes(term)) ||
        (r.serialNumber && r.serialNumber.toLowerCase().includes(term))
    );

    if (partialMatch) {
      setSelectedRecordId(partialMatch.id);
      setDistributorId(partialMatch.customerId);
      if (partialMatch.dealerSoldDate) {
        setDistributorSaleDate(partialMatch.dealerSoldDate);
      }
      setBarcodeLookupMessage({
        type: 'success',
        message: `Unique Unit Located & Tracked via Partial Barcode Match`,
        details: {
          productName: partialMatch.productName,
          sku: partialMatch.sku,
          barcode: partialMatch.barcode || term,
          serialNumber: partialMatch.serialNumber,
          distributorName: partialMatch.customerName,
          invoiceNumber: partialMatch.invoiceNumber,
          saleDate: partialMatch.saleDate,
          warrantyPeriodMonths: partialMatch.warrantyPeriodMonths,
        },
      });
      return;
    }

    setBarcodeLookupMessage({
      type: 'error',
      message: `No unit found with barcode "${query}". Each individual unit has its own unique barcode. Please verify the unit barcode sticker or select the unit from the list below.`,
    });
  };

  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    if (val.trim().length >= 6) {
      trackByBarcode(val);
    } else if (!val.trim()) {
      setBarcodeLookupMessage(null);
    }
  };

  const handleDistributorChange = (custId: string) => {
    setDistributorId(custId);
    const matching = custId === 'ALL'
      ? availableRecords
      : availableRecords.filter((r) => r.customerId === custId);
    if (matching.length > 0) {
      setSelectedRecordId(matching[0].id);
      if (matching[0].dealerSoldDate) {
        setDistributorSaleDate(matching[0].dealerSoldDate);
      }
      if (matching[0].barcode) {
        setBarcodeInput(matching[0].barcode);
      }
    } else {
      setSelectedRecordId('');
    }
  };

  const handleRecordChange = (recordId: string) => {
    setSelectedRecordId(recordId);
    const rec = availableRecords.find((r) => r.id === recordId);
    if (rec) {
      if (rec.barcode) {
        setBarcodeInput(rec.barcode);
      }
      if (rec.customerId && distributorId === 'ALL') {
        setDistributorId(rec.customerId);
      }
      setBarcodeLookupMessage({
        type: 'success',
        message: `Unit details loaded: ${rec.productName}`,
        details: {
          productName: rec.productName,
          sku: rec.sku,
          barcode: rec.barcode,
          serialNumber: rec.serialNumber,
          distributorName: rec.customerName,
          invoiceNumber: rec.invoiceNumber,
          saleDate: rec.saleDate,
          warrantyPeriodMonths: rec.warrantyPeriodMonths,
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) {
      setError('Please enter a barcode number or select an eligible sold unit record.');
      return;
    }
    if (!distributorSaleDate) {
      setError('Please enter the date when the distributor sold the unit to the customer.');
      return;
    }
    if (!endCustomerName.trim()) {
      setError('Please enter the end-customer name as indicated on the warranty note.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await warrantyService.recordWarrantyNote(
        {
          warrantyRecordId: selectedRecordId,
          noteNumber: noteNumber.trim(),
          barcode: barcodeInput.trim() || selectedRecord?.barcode,
          distributorSaleDate,
          receivedDate,
          endCustomerName: endCustomerName.trim(),
          endCustomerPhone: endCustomerPhone.trim() || undefined,
          serialNumber: selectedRecord?.serialNumber,
          reviewNotes: reviewNotes.trim() || (verifyImmediately ? 'Validated by Sales Manager upon receipt.' : undefined),
          verifyImmediately,
        },
        currentUser
      );

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record distributor warranty note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
          <FileCheck2 className="h-5 w-5 text-primary" />
          Record Distributor Warranty Note
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Context Alert */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block text-amber-950">
              Distributor Warranty Note Requirement
            </span>
            Our company sells products to wholesale distributors rather than directly to end customers.
            Entering and verifying the warranty note received from the distributor activates the customer warranty
            window and is required before any warranty claim can be approved or processed.
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Unit Unique Barcode Auto-Tracker Card */}
        <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-indigo-950 flex items-center gap-1.5 text-xs">
              <Barcode className="h-4 w-4 text-indigo-600" />
              Enter / Scan Unique Unit Barcode Number
            </label>
            <span className="text-[10px] text-indigo-600 font-medium">
              Unique per individual unit
            </span>
          </div>

          <p className="text-[11px] text-indigo-900/80 leading-relaxed">
            Each individual unit of the product has its own unique barcode sticker. Entering or scanning the unit barcode uniquely tracks all its details (product, model, serial, distributor & invoice).
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="h-4 w-4 absolute left-2.5 top-2.5 text-indigo-400" />
              <Input
                type="text"
                value={barcodeInput}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    trackByBarcode(barcodeInput);
                  }
                }}
                placeholder="Scan unique unit barcode (e.g. 8901020304011) or serial..."
                className="pl-9 text-xs font-mono h-9 bg-white border-indigo-200 focus:border-indigo-500"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => trackByBarcode(barcodeInput)}
              className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5 shrink-0 shadow-xs"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Track Unit
            </Button>
          </div>

          {/* Barcode Tracking Feedback Box */}
          {barcodeLookupMessage?.type === 'success' && barcodeLookupMessage.details && (
            <div className="p-3 bg-white rounded-lg border border-emerald-200 text-[11px] space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {barcodeLookupMessage.message}
                </span>
                <span className="font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-800 border border-emerald-200">
                  Barcode: {barcodeLookupMessage.details.barcode || barcodeInput}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-100 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Product / Model</span>
                  <span className="font-semibold text-slate-900 block truncate">{barcodeLookupMessage.details.productName}</span>
                  <span className="font-mono text-[10px] text-slate-500">SKU: {barcodeLookupMessage.details.sku}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Distributor / Sold To</span>
                  <span className="font-semibold text-slate-900 block truncate">{barcodeLookupMessage.details.distributorName}</span>
                  <span className="font-mono text-[10px] text-primary">
                    Invoice: {barcodeLookupMessage.details.invoiceNumber} ({formatDate(barcodeLookupMessage.details.saleDate)})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Unit Serial Number</span>
                  <span className="font-mono font-medium text-slate-800">{barcodeLookupMessage.details.serialNumber || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Warranty Coverage</span>
                  <span className="font-semibold text-emerald-700">{barcodeLookupMessage.details.warrantyPeriodMonths} Months Official</span>
                </div>
              </div>
            </div>
          )}

          {barcodeLookupMessage?.type === 'error' && (
            <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{barcodeLookupMessage.message}</span>
            </div>
          )}
        </div>

        {/* Distributor Selection & Warranty Note # */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              Distributor / Dealer *
            </label>
            <Select value={distributorId} onValueChange={handleDistributorChange}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select Distributor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Distributors</SelectItem>
                {MOCK_CUSTOMERS.filter((c) => c.status === 'ACTIVE').map((cust) => (
                  <SelectItem key={cust.id} value={cust.id}>
                    {cust.name} ({cust.customerCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Warranty Card / Note Number *
            </label>
            <div className="flex gap-1.5">
              <Input
                type="text"
                required
                value={noteNumber}
                onChange={(e) => setNoteNumber(e.target.value)}
                placeholder="e.g. WN-2026-1049"
                className="text-xs font-mono h-9 uppercase"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteNumber(generateNoteNumber())}
                title="Generate Note Number"
                className="h-9 px-2.5 text-slate-600"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Unit / Warranty Record Selection */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Sold Unit / Warranty Record *
          </label>
          <Select value={selectedRecordId} onValueChange={handleRecordChange}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select Product / Unit" />
            </SelectTrigger>
            <SelectContent>
              {filteredRecords.length === 0 ? (
                <SelectItem value="none" disabled>
                  No pending distributor records found
                </SelectItem>
              ) : (
                filteredRecords.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.productName} — Unit Barcode: {r.barcode || 'N/A'} (SN: {r.serialNumber || 'N/A'}, Inv: {r.invoiceNumber})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedRecord && !barcodeLookupMessage?.details && (
            <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Unit Barcode:</span>
                <span className="font-mono font-medium text-indigo-700">{selectedRecord.barcode || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Serial Number:</span>
                <span className="font-mono font-medium text-slate-800">{selectedRecord.serialNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Product SKU:</span>
                <span className="font-mono font-medium text-slate-800">{selectedRecord.sku}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Invoice Issue Date:</span>
                <span className="font-medium text-slate-800">{formatDate(selectedRecord.saleDate)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Distributor Sale Date (To End-Customer) *
            </label>
            <Input
              type="date"
              required
              value={distributorSaleDate}
              onChange={(e) => setDistributorSaleDate(e.target.value)}
              className="text-xs h-9"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Official retail purchase date stamped on card
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Date Note Received at DNS ERP *
            </label>
            <Input
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="text-xs h-9"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Date card arrived from distributor/courier
            </span>
          </div>
        </div>

        {/* End-Customer Information (Address removed as requested) */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <span className="font-semibold text-slate-800 block text-xs">
            Retail End-Customer Details (from Warranty Note)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                End-Customer Name *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Kasun Silva / Buildcorp Ltd"
                value={endCustomerName}
                onChange={(e) => setEndCustomerName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Customer Contact Phone
              </label>
              <Input
                type="text"
                placeholder="e.g. +94 77 123 4567"
                value={endCustomerPhone}
                onChange={(e) => setEndCustomerPhone(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Sales Manager Verification Toggle & Review Notes */}
        <div className="border-t border-slate-200 pt-3 space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifyImmediately}
              onChange={(e) => setVerifyImmediately(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="font-semibold text-slate-800 text-xs">
              Review & Verify Immediately (Sales Manager Approval)
            </span>
          </label>
          <span className="text-[11px] text-slate-500 block">
            {verifyImmediately
              ? 'Marks this warranty note as VERIFIED immediately. Future warranty claims on this unit can be processed without further delay.'
              : 'Saves the warranty note as PENDING_REVIEW. The Sales Manager can review and validate the note prior to claim processing.'}
          </span>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Inspection / Review Notes
            </label>
            <Input
              type="text"
              placeholder="e.g. Distributor stamp verified. Serial number matches delivery batch."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
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
            disabled={loading || !selectedRecordId}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            {loading ? 'Recording...' : verifyImmediately ? 'Record & Verify Note' : 'Record Warranty Note'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
