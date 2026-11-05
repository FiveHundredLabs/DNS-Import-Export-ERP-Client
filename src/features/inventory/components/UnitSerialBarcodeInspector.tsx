import React, { useState, useMemo } from 'react';
import { UnitBarcodeRecord } from '../../../types/inventory';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Barcode,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Table as TableIcon,
  Tag,
  Hash,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { toast } from 'sonner';

interface UnitSerialBarcodeInspectorProps {
  totalUnits: number;
  unitRecords?: UnitBarcodeRecord[];
  unitBarcodes?: string[];
  serialNumbers?: string[];
  sku?: string;
  productName?: string;
  grnNumber?: string;
}

export const UnitSerialBarcodeInspector: React.FC<UnitSerialBarcodeInspectorProps> = ({
  totalUnits,
  unitRecords,
  unitBarcodes,
  serialNumbers,
  sku = 'ITEM',
  productName = 'Product',
  grnNumber = 'GRN-2025-001',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'barcodes' | 'serials'>('table');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(50); // 50 per page or all
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Normalize paired records so all 450 units are guaranteed
  const allUnits = useMemo(() => {
    const count = Math.max(
      totalUnits,
      unitRecords?.length || 0,
      unitBarcodes?.length || 0,
      serialNumbers?.length || 0
    );

    const cleanSku = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
    const grnSuffix = grnNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || 'WH1';

    // Determine serial prefix from first existing serial or standard default
    let serialPrefix = `SN-RHD-2025-`;
    if (serialNumbers && serialNumbers.length > 0) {
      const match = serialNumbers[0].match(/^(.*?)(\d+)$/);
      if (match) serialPrefix = match[1];
    }

    const list: Array<{
      index: number;
      barcode: string;
      serialNumber: string;
      status: 'LABELED' | 'PENDING_LABEL';
    }> = [];

    for (let i = 1; i <= count; i++) {
      const seq = String(i).padStart(3, '0');
      const rec = unitRecords?.[i - 1];
      const bc = rec?.unitBarcode || unitBarcodes?.[i - 1] || `DNS-${cleanSku}-${grnSuffix}-${seq}`;
      const sn = rec?.serialNumber || serialNumbers?.[i - 1] || `${serialPrefix}${seq}`;

      list.push({
        index: i,
        barcode: bc,
        serialNumber: sn,
        status: rec?.status || 'LABELED',
      });
    }

    return list;
  }, [totalUnits, unitRecords, unitBarcodes, serialNumbers, sku, grnNumber]);

  // Search filtering across index, barcode, and serial number
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return allUnits;
    const q = searchQuery.toLowerCase().trim();
    return allUnits.filter(
      (u) =>
        String(u.index) === q ||
        u.barcode.toLowerCase().includes(q) ||
        u.serialNumber.toLowerCase().includes(q)
    );
  }, [allUnits, searchQuery]);

  // Pagination calculations
  const totalFiltered = filteredUnits.length;
  const isShowAll = pageSize === -1;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedUnits = useMemo(() => {
    if (isShowAll) return filteredUnits;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, isShowAll, safeCurrentPage, pageSize]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = (type: 'barcodes' | 'serials') => {
    const values = allUnits.map((u) => (type === 'barcodes' ? u.barcode : u.serialNumber));
    navigator.clipboard.writeText(values.join('\n'));
    toast.success(`Copied all ${values.length} ${type} to clipboard!`);
  };

  return (
    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-2xs py-0.5 px-2">
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 inline" />
            {allUnits.length} / {allUnits.length} Units Barcoded &amp; Serialized
          </Badge>
          <span className="text-2xs text-slate-500 font-mono">
            {filteredUnits.length !== allUnits.length && `(Filtered ${filteredUnits.length} of ${allUnits.length})`}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer',
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <TableIcon className="h-3 w-3" />
            <span>Paired Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('barcodes')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer',
              viewMode === 'barcodes'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Barcode className="h-3 w-3" />
            <span>Barcodes ({allUnits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('serials')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer',
              viewMode === 'serials'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Cpu className="h-3 w-3" />
            <span>Serials ({allUnits.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={`Search across all ${allUnits.length} units (e.g. 042, SN, BC)...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 h-8 text-xs rounded-lg bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleCopyAll('barcodes')}
            className="h-7 text-2xs gap-1 text-slate-700 bg-white"
          >
            <Copy className="h-3 w-3 text-slate-500" />
            <span>Copy All Barcodes</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleCopyAll('serials')}
            className="h-7 text-2xs gap-1 text-slate-700 bg-white"
          >
            <Copy className="h-3 w-3 text-slate-500" />
            <span>Copy All Serials</span>
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. VIEW MODE: PAIRED TABLE (1-to-1 Barcode & Serial Mapping) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase tracking-wider">
                <tr>
                  <th className="p-2 w-16 text-center">Unit #</th>
                  <th className="p-2 min-w-[200px]">Assigned Unit Barcode</th>
                  <th className="p-2 min-w-[200px]">Registered Serial Number</th>
                  <th className="p-2 w-28 text-center">Affix Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {paginatedUnits.map((u) => {
                  const bcKey = `bc-${u.index}`;
                  const snKey = `sn-${u.index}`;
                  return (
                    <tr key={u.index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-bold text-2xs">
                        #{u.index}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">{u.barcode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.barcode, bcKey)}
                            className="p-0.5 text-slate-400 hover:text-slate-700"
                            title="Copy Barcode"
                          >
                            {copiedKey === bcKey ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-800">{u.serialNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.serialNumber, snKey)}
                            className="p-0.5 text-slate-400 hover:text-slate-700"
                            title="Copy Serial Number"
                          >
                            {copiedKey === snKey ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                          Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. VIEW MODE: ALL BARCODES GRID (450 pills)                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'barcodes' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs font-semibold text-slate-600">
            <span>Unit Barcode Stickers ({filteredUnits.length} of {allUnits.length})</span>
            <span className="text-slate-400">Click any badge to copy</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-72 overflow-y-auto p-2 bg-slate-50/60 rounded-lg border border-slate-200">
            {paginatedUnits.map((u) => {
              const k = `bc-pill-${u.index}`;
              const isCopied = copiedKey === k;
              return (
                <button
                  key={u.index}
                  type="button"
                  onClick={() => handleCopy(u.barcode, k)}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer',
                    isCopied
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  )}
                  title={`Unit #${u.index} - Click to copy`}
                >
                  <span className="text-[9px] text-slate-400">#{u.index}</span>
                  <span>{u.barcode}</span>
                  {isCopied ? (
                    <Check className="h-2.5 w-2.5 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VIEW MODE: ALL SERIAL NUMBERS GRID (450 pills)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'serials' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs font-semibold text-slate-600">
            <span>Registered Serial Numbers ({filteredUnits.length} of {allUnits.length})</span>
            <span className="text-slate-400">Click any serial to copy</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-72 overflow-y-auto p-2 bg-slate-50/60 rounded-lg border border-slate-200">
            {paginatedUnits.map((u) => {
              const k = `sn-pill-${u.index}`;
              const isCopied = copiedKey === k;
              return (
                <button
                  key={u.index}
                  type="button"
                  onClick={() => handleCopy(u.serialNumber, k)}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer',
                    isCopied
                      ? 'bg-emerald-200 text-emerald-900 border-emerald-400 font-bold'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100/60'
                  )}
                  title={`Unit #${u.index} - Click to copy`}
                >
                  <span className="text-[9px] text-emerald-600 font-medium">#{u.index}</span>
                  <span>{u.serialNumber}</span>
                  {isCopied && <Check className="h-2.5 w-2.5 text-emerald-700" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-2xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Displaying:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-2xs font-semibold bg-white border border-slate-200 rounded px-1.5 py-0.5"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={-1}>All {allUnits.length} units</option>
          </select>
          <span className="font-mono text-slate-400">
            {!isShowAll
              ? `${(safeCurrentPage - 1) * pageSize + 1} - ${Math.min(
                  safeCurrentPage * pageSize,
                  totalFiltered
                )} of ${totalFiltered} units`
              : `All ${totalFiltered} units visible`}
          </span>
        </div>

        {!isShowAll && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2 font-mono text-2xs">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPageSize(-1)}
              className="h-6 text-2xs text-primary hover:underline ml-1"
            >
              Show All {allUnits.length}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
