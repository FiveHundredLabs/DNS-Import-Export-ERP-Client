import { useState, useMemo } from 'react';
import { AreaItem as Area, useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  Edit3,
  Trash2,
  Plus,
  Map,
  Briefcase,
  Hash,
  MapPin,
  Users,
  Building2,
  Phone,
  Mail,
  Search,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';

export function AreaListPage() {
  const { role } = useAuth();
  const canCreate = role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';
  const canEdit = role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';
  const canDelete = role === 'DIRECTOR' || role === 'MANAGER';

  const { areas, loading: areasLoading, createArea, updateArea, deleteArea } = useAreas();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', region: '', areaManagerId: '' });

  // Inspection modals for assigned customers and team members
  const [selectedAreaForCustomers, setSelectedAreaForCustomers] = useState<Area | null>(null);
  const [selectedAreaForTeam, setSelectedAreaForTeam] = useState<Area | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const areaManagers = useMemo(() => {
    return users.filter((u) => u.role === 'AREA_MANAGER');
  }, [users]);

  const filteredAreaCustomers = useMemo(() => {
    if (!selectedAreaForCustomers?.customers) return [];
    if (!customerSearchTerm.trim()) return selectedAreaForCustomers.customers;
    const term = customerSearchTerm.toLowerCase();
    return selectedAreaForCustomers.customers.filter(
      (c) =>
        c.displayName.toLowerCase().includes(term) ||
        c.companyName?.toLowerCase().includes(term) ||
        c.customerCode?.toLowerCase().includes(term) ||
        c.contactPerson?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.primaryContactNumber?.includes(term),
    );
  }, [selectedAreaForCustomers, customerSearchTerm]);

  const handleOpenModal = (area?: Area) => {
    if (area) {
      setEditingArea(area);
      setFormData({
        code: area.code || '',
        name: area.name,
        region: area.region || '',
        areaManagerId: area.areaManagerId || '',
      });
    } else {
      setEditingArea(null);
      setFormData({ code: '', name: '', region: '', areaManagerId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      return;
    }
    const selectedManager = areaManagers.find((u) => u.id === formData.areaManagerId);
    let finalManagerName = 'Unassigned';
    let finalManagerId = '';
    if (selectedManager) {
      finalManagerName = selectedManager.name;
      finalManagerId = selectedManager.id;
    } else if (formData.areaManagerId) {
      const allUsersMatch = users.find((u) => u.id === formData.areaManagerId);
      finalManagerName = allUsersMatch ? allUsersMatch.name : editingArea?.areaManagerName || 'Unassigned';
      finalManagerId = formData.areaManagerId;
    }

    if (editingArea) {
      await updateArea(editingArea.id, {
        ...formData,
        areaManagerId: finalManagerId,
        areaManagerName: finalManagerName,
        updatedAt: editingArea.updatedAt,
      });
    } else {
      await createArea({
        ...formData,
        areaManagerId: finalManagerId,
        areaManagerName: finalManagerName,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteArea(id);
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Area Management"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Areas' }]}
        actions={
          canCreate ? (
            <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary-hover shadow-xs">
              <Plus className="h-4 w-4" /> Create Area
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-600">Code</TableHead>
              <TableHead className="font-semibold text-slate-600">Area Name</TableHead>
              <TableHead className="font-semibold text-slate-600">Region</TableHead>
              <TableHead className="font-semibold text-slate-600">Area Manager</TableHead>
              <TableHead className="font-semibold text-slate-600 text-center">Sales Reps</TableHead>
              <TableHead className="font-semibold text-slate-600 text-center">Customers</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {areasLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  Loading areas...
                </TableCell>
              </TableRow>
            ) : areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No areas found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => (
                <TableRow key={area.id} className="group hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-medium">
                      {area.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-900">{area.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{area.region}</TableCell>
                  <TableCell>
                    {area.areaManagerName && area.areaManagerName !== 'Unassigned' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAreaForTeam(area)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors text-left cursor-pointer group/mgr"
                        title="Click to view assigned team details"
                      >
                        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold group-hover/mgr:bg-indigo-600 group-hover/mgr:text-white transition-colors">
                          {area.areaManagerName.charAt(0)}
                        </div>
                        <span className="group-hover/mgr:underline">{area.areaManagerName}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedAreaForTeam(area)}
                        className="text-sm text-slate-400 italic hover:text-slate-600 cursor-pointer"
                        title="Click to view assigned team"
                      >
                        Unassigned
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedAreaForTeam(area)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-slate-700 transition-all border border-transparent cursor-pointer shadow-2xs"
                      title="Click to view assigned Sales Representatives"
                    >
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>{area.salesReps?.length || 0} Reps</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedAreaForCustomers(area)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                      title="Click to view assigned customers"
                    >
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{area.customerCount ?? 0}</span>
                    </button>
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(area)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <ConfirmButton
                            variant="ghost"
                            size="icon"
                            confirmTitle="Delete Area?"
                            confirmMessage={`Are you sure you want to delete the area "${area.name}" (${area.code})?`}
                            confirmLabel="Delete Area"
                            confirmVariant="destructive"
                            onConfirm={() => handleDelete(area.id)}
                            className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmButton>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── CREATE / EDIT AREA MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="sm:max-w-[425px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              {editingArea ? 'Edit Area' : 'Create New Area'}
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {editingArea
                ? 'Update the details of the operational area below.'
                : 'Define a new operational area and assign a manager.'}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" /> Area Code
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. KEL"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Map className="h-3.5 w-3.5 text-slate-400" /> Area Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kelaniya, Maharagama, Malabe, Kottawa"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Region
              </label>
              <Input
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="e.g. Colombo & Suburbs"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Area Manager
                </span>
                <span className="text-xs font-normal text-slate-400">Optional</span>
              </label>
              <Select
                value={formData.areaManagerId}
                onChange={(e) => setFormData({ ...formData, areaManagerId: e.target.value })}
                className="focus-visible:ring-indigo-500"
              >
                <option value="">-- No Area Manager (Optional) --</option>
                {areaManagers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.name}
                  </option>
                ))}
                {formData.areaManagerId && !areaManagers.some((m) => m.id === formData.areaManagerId) && (
                  <option key={formData.areaManagerId} value={formData.areaManagerId}>
                    {editingArea?.areaManagerName || 'Unknown'} (Role Changed)
                  </option>
                )}
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editingArea ? 'Save Changes' : 'Create Area'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ── ASSIGNED CUSTOMERS MODAL ── */}
      <Dialog
        open={Boolean(selectedAreaForCustomers)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAreaForCustomers(null);
            setCustomerSearchTerm('');
          }
        }}
      >
        <div className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                  Customers in {selectedAreaForCustomers?.name}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredAreaCustomers.length} of{' '}
                  {selectedAreaForCustomers?.customers?.length || 0} registered commercial customers
                </p>
              </div>
            </div>
            {(selectedAreaForCustomers?.customers?.length || 0) > 2 && (
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by customer name, code, contact person..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
                />
              </div>
            )}
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-3 px-1 space-y-2">
            {filteredAreaCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs space-y-1">
                <Building2 className="h-8 w-8 mx-auto text-slate-300" />
                <p>
                  {customerSearchTerm
                    ? 'No customers match your search.'
                    : 'No customers currently assigned to this area.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px]">
                      <TableHead className="font-semibold text-slate-600">Code / Name</TableHead>
                      <TableHead className="font-semibold text-slate-600">Contact Person</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-right">Credit Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAreaCustomers.map((cust) => (
                      <TableRow key={cust.id} className="text-xs hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-slate-900">{cust.displayName}</div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                              {cust.customerCode || 'NO-CODE'}
                            </span>
                            {cust.companyName && cust.companyName !== cust.displayName && (
                              <>
                                <span>•</span>
                                <span className="font-sans text-slate-500 truncate max-w-[140px]">
                                  {cust.companyName}
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-slate-700 font-medium">{cust.contactPerson}</div>
                          {cust.primaryContactNumber && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="h-2.5 w-2.5 text-slate-400" />
                              {cust.primaryContactNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cust.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : cust.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cust.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono text-[11px] font-semibold text-slate-800">
                            {cust.creditLimit ? formatCurrency(Number(cust.creditLimit)) : 'Standard'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {cust.creditPeriod ? `${cust.creditPeriod} Days` : 'Cash Basis'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedAreaForCustomers(null)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ── ASSIGNED TEAM MODAL (AREA MANAGERS & SALES REPS) ── */}
      <Dialog
        open={Boolean(selectedAreaForTeam)}
        onOpenChange={(open) => {
          if (!open) setSelectedAreaForTeam(null);
        }}
      >
        <div className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Assigned Team — {selectedAreaForTeam?.name}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Field staff and management assigned to territory ({selectedAreaForTeam?.code})
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-3 px-1 space-y-4">
            {/* Area Manager Section */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                Area Manager (
                {selectedAreaForTeam?.areaManagers?.length ||
                  (selectedAreaForTeam?.areaManagerName &&
                  selectedAreaForTeam.areaManagerName !== 'Unassigned'
                    ? 1
                    : 0)}
                )
              </div>
              {selectedAreaForTeam?.areaManagers && selectedAreaForTeam.areaManagers.length > 0 ? (
                <div className="space-y-2">
                  {selectedAreaForTeam.areaManagers.map((mgr) => (
                    <div
                      key={mgr.id}
                      className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {mgr.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{mgr.fullName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {mgr.email}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                        Area Manager
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : selectedAreaForTeam?.areaManagerName &&
                selectedAreaForTeam.areaManagerName !== 'Unassigned' ? (
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {selectedAreaForTeam.areaManagerName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {selectedAreaForTeam.areaManagerName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Designated Area Manager</div>
                    </div>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                    Area Manager
                  </Badge>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                  No Area Manager currently assigned
                </div>
              )}
            </div>

            {/* Sales Representatives Section */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                Sales Representatives ({selectedAreaForTeam?.salesReps?.length || 0})
              </div>
              {selectedAreaForTeam?.salesReps && selectedAreaForTeam.salesReps.length > 0 ? (
                <div className="space-y-2">
                  {selectedAreaForTeam.salesReps.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {rep.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{rep.fullName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {rep.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                        Sales Rep
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                  No Sales Representatives currently assigned to this territory
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedAreaForTeam(null)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
export default AreaListPage;
