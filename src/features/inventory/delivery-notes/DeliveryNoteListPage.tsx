import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatCard } from '../../../components/common/StatCard';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { DeliveryNote, DeliveryNoteStatus } from '../../../types/deliveryNote';
import { PrintableDeliveryNote } from './PrintableDeliveryNote';
import { CustomerRejectionModal } from './CustomerRejectionModal';
import { useAuth } from '../../../hooks/useAuth';
import {
  Truck,
  PlusCircle,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  Eye,
  X,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

export const DeliveryNoteListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryNoteStatus | 'ALL'>('ALL');

  // Modals
  const [selectedNoteForPrint, setSelectedNoteForPrint] = useState<DeliveryNote | null>(null);
  const [selectedNoteForRejection, setSelectedNoteForRejection] = useState<DeliveryNote | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await deliveryNoteService.getAll();
      setNotes(data);
    } catch (err: any) {
      toast.error('Failed to load delivery notes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Filtered Delivery Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (statusFilter !== 'ALL' && n.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        return (
          n.deliveryNoteNumber.toLowerCase().includes(q) ||
          n.invoiceNumber.toLowerCase().includes(q) ||
          n.customerName.toLowerCase().includes(q) ||
          n.customerCode.toLowerCase().includes(q) ||
          n.driverName.toLowerCase().includes(q) ||
          n.vehicleNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notes, search, statusFilter]);

  // Operational KPIs
  const totalCount = notes.length;
  const inTransitCount = notes.filter((n) => n.status === 'DISPATCHED').length;
  const deliveredCount = notes.filter((n) => n.status === 'DELIVERED').length;
  const pendingApprovalCount = notes.filter(
    (n) => n.status === 'REJECTION_PENDING_APPROVAL'
  ).length;
  const totalRejectedUnitsCount = notes.reduce(
    (sum, n) => sum + (n.totalRejectedUnits || 0),
    0
  );

  const getStatusBadge = (status: DeliveryNoteStatus) => {
    switch (status) {
      case 'DISPATCHED':
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-bold text-[11px] gap-1">
            <Truck className="h-3 w-3" />
            Dispatched / In Transit
          </Badge>
        );
      case 'DELIVERED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Delivered & Accepted
          </Badge>
        );
      case 'REJECTION_PENDING_APPROVAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[11px] gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            Rejection Pending Approval
          </Badge>
        );
      case 'REJECTION_APPROVED':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[11px] gap-1">
            <ShieldCheck className="h-3 w-3" />
            Rejection Approved
          </Badge>
        );
      case 'REJECTION_DECLINED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[11px] gap-1">
            <X className="h-3 w-3" />
            Rejection Declined
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRejectionSubmit = async (payload: any) => {
    if (!selectedNoteForRejection) return;
    const user = currentUser || {
      id: 'usr-01',
      name: 'Amal Perera',
      role: 'STOCK_KEEPER',
    };
    await deliveryNoteService.submitRejection(selectedNoteForRejection.id, payload, user as any);
    await fetchNotes();
  };

  return (
    <div className="w-full space-y-5">
      {/* Canonical Page Header */}
      <PageHeader
        title="Warehouse Delivery Notes"
        subtitle="Physical goods dispatch notes created from draft invoices with scanned unit barcodes and customer sign-off."
        badge={
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold"
          >
            Stock Keeper Dispatch Hub
          </Badge>
        }
        actions={
          <Button
            onClick={() => navigate('/inventory/delivery-notes/new')}
            className="gap-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs h-9"
          >
            <PlusCircle className="h-4 w-4" />
            + New Delivery Note
          </Button>
        }
      />

      {/* ── Operational KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Notes"
          value={totalCount}
          subtitle="All created dispatch notes"
          icon={Truck}
          variant="indigo"
        />

        <StatCard
          title="In Transit / Dispatched"
          value={inTransitCount}
          subtitle="With delivery drivers"
          icon={Clock}
          variant="blue"
        />

        <StatCard
          title="Delivered & Accepted"
          value={deliveredCount}
          subtitle="100% Customer accepted"
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          title="Rejection Approvals"
          value={pendingApprovalCount}
          subtitle="Requires Manager Sign-Off"
          icon={ShieldAlert}
          variant="amber"
        />

        <StatCard
          title="Total Rejected Units"
          value={totalRejectedUnitsCount}
          subtitle="Quarantine / Return log"
          icon={AlertTriangle}
          variant="rose"
        />
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Notes ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DISPATCHED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'DISPATCHED'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dispatched ({inTransitCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DELIVERED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'DELIVERED'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered ({deliveredCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTION_PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'REJECTION_PENDING_APPROVAL'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Approval ({pendingApprovalCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DN #, Invoice #, customer, driver..."
            className="text-xs pl-9 h-9"
          />
        </div>
      </div>

      {/* ── Delivery Notes Table ── */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-32">Delivery Note #</TableHead>
                <TableHead className="w-28">Invoice Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Driver & Vehicle</TableHead>
                <TableHead className="w-24 text-center">Dispatched Units</TableHead>
                <TableHead className="w-24 text-center">Accepted / Rejected</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-36 text-center">Status</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Loading delivery notes...
                  </TableCell>
                </TableRow>
              ) : filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500 space-y-2">
                    <Truck className="h-8 w-8 text-slate-300 mx-auto" />
                    <div>No delivery notes match your filter.</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/inventory/delivery-notes/new')}
                      className="text-xs mt-1"
                    >
                      + Create Delivery Note from Draft Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <TableRow
                    key={note.id}
                    className="border-b border-slate-200 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* DN Number */}
                    <TableCell className="font-mono font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => navigate(`/inventory/delivery-notes/${note.id}`)}
                        className="text-primary hover:underline"
                      >
                        {note.deliveryNoteNumber}
                      </button>
                    </TableCell>

                    {/* Invoice Reference */}
                    <TableCell className="font-mono text-slate-600 font-semibold">
                      {note.invoiceNumber}
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="font-bold text-slate-900 line-clamp-1">
                        {note.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {note.customerCode}
                      </div>
                    </TableCell>

                    {/* Driver & Vehicle */}
                    <TableCell>
                      <div className="font-medium text-slate-900">{note.driverName}</div>
                      <div className="text-[11px] text-slate-500 font-mono uppercase">
                        {note.vehicleNumber}
                      </div>
                    </TableCell>

                    {/* Dispatched Units */}
                    <TableCell className="text-center font-bold text-slate-900">
                      {note.totalDispatchedUnits} Units
                    </TableCell>

                    {/* Accepted vs Rejected */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold">
                        <span className="text-emerald-700">{note.totalAcceptedUnits} OK</span>
                        {note.totalRejectedUnits > 0 && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                            {note.totalRejectedUnits} REJ
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Dispatch Date */}
                    <TableCell className="text-slate-600 font-medium">
                      {note.dispatchDate}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-center">
                      {getStatusBadge(note.status)}
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/inventory/delivery-notes/${note.id}`)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedNoteForPrint(note)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-primary"
                          title="Print Delivery Slip"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>

                        {note.status === 'DISPATCHED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedNoteForRejection(note)}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            title="Process Customer Rejections"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Rejection
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Printable Modal ── */}
      {selectedNoteForPrint && (
        <PrintableDeliveryNote
          note={selectedNoteForPrint}
          onClose={() => setSelectedNoteForPrint(null)}
        />
      )}

      {/* ── Customer Rejection Processing Modal ── */}
      {selectedNoteForRejection && (
        <CustomerRejectionModal
          note={selectedNoteForRejection}
          isOpen={!!selectedNoteForRejection}
          onClose={() => setSelectedNoteForRejection(null)}
          onSubmit={handleRejectionSubmit}
        />
      )}
    </div>
  );
};
