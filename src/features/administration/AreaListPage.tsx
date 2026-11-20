import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { extractErrorMessage } from '../../api/client';
import { AreaItem as Area, useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { customersApi } from '../../api/customers/customers.api';
import { AreaCustomer, AreaUser } from '../../api/areas/areas.types';
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
  Map as MapIcon,
  Briefcase,
  Hash,
  MapPin,
  Users,
  Building2,
  Phone,
  Mail,
  Search,
  Loader2,
  Power,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';

export function AreaListPage() {
  const { role } = useAuth();
  const canCreate = role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';
  const canEdit = role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';
  const canDelete = role === 'DIRECTOR' || role === 'MANAGER';

  const {
    areas,
    loading: areasLoading,
    refetch,
    createArea,
    updateArea,
    updateAreaStatus,
    deleteArea,
  } = useAreas();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    region: string;
    areaManagerId: string;
    salesRepIds: string[];
  }>({
    code: '',
    name: '',
    region: '',
    areaManagerId: '',
    salesRepIds: [],
  });

  // Filtering & Search
  const [areaSearchTerm, setAreaSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Dedicated Soft-Delete Modal
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspection modals for assigned customers and team members
  const [selectedAreaForCustomers, setSelectedAreaForCustomers] = useState<Area | null>(null);
  const [areaCustomersList, setAreaCustomersList] = useState<AreaCustomer[]>([]);
  const [loadingAreaCustomers, setLoadingAreaCustomers] = useState(false);
  const [selectedAreaForTeam, setSelectedAreaForTeam] = useState<Area | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const q = areaSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        area.name.toLowerCase().includes(q) ||
        (area.code && area.code.toLowerCase().includes(q)) ||
        (area.region && area.region.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || (area.status || 'ACTIVE') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [areas, areaSearchTerm, statusFilter]);

  const areaManagers = useMemo(() => {
    return users.filter((u) => {
      const code = (typeof u.role === 'object' && u.role ? u.role.code : u.role) || (u as any).roleCode;
      return code === 'AREA_MANAGER';
    });
  }, [users]);

  // Compute manager assignment details to enforce:
  // 1. Each Area can have only ONE Area Manager
  // 2. Each Area Manager can be assigned to only ONE Area
  // 3. Show already-assigned managers as disabled in dropdown with their assigned Area name
  const managersWithAssignment = useMemo(() => {
    return areaManagers.map((mgr) => {
      // Find area from mgr.areaId or area.areaManagers / area.areaManagerId or mgr.areaName
      const assignedArea = areas.find(
        (a) =>
          a.id === mgr.areaId ||
          (a.areaManagers && a.areaManagers.some((m) => m.id === mgr.id)) ||
          a.areaManagerId === mgr.id ||
          (Boolean((mgr as any).areaName) && (a.name === (mgr as any).areaName || a.areaName === (mgr as any).areaName)),
      );

      const assignedAreaName = assignedArea?.name || assignedArea?.areaName || (mgr as any).areaName;

      const isAssignedToThisArea = Boolean(
        editingArea &&
          ((mgr.areaId && mgr.areaId === editingArea.id) ||
            editingArea.areaManagerId === mgr.id ||
            (editingArea.areaManagers && editingArea.areaManagers.some((m) => m.id === mgr.id))),
      );

      const isAssignedToOtherArea = Boolean(
        assignedAreaName && (!editingArea || (assignedArea && assignedArea.id !== editingArea.id) || (editingArea.name !== assignedAreaName && editingArea.areaName !== assignedAreaName)),
      );

      return {
        ...mgr,
        assignedArea,
        assignedAreaName,
        isAssignedToThisArea,
        isAssignedToOtherArea,
        disabled: isAssignedToOtherArea,
      };
    });
  }, [areaManagers, areas, editingArea]);

  const salesReps = useMemo(() => {
    return users.filter((u) => {
      const code = (typeof u.role === 'object' && u.role ? u.role.code : u.role) || (u as any).roleCode;
      return code === 'SALES_REP';
    });
  }, [users]);

  // Compute sales rep assignment details to enforce:
  // 1. Each Area can have multiple Sales Representatives assigned
  // 2. Each Sales Representative can be assigned to only ONE Area
  // 3. Show already-assigned sales reps as disabled in dropdown with their assigned Area name
  const salesRepsWithAssignment = useMemo(() => {
    return salesReps.map((rep) => {
      // Find area from rep.areaId or area.salesReps or rep.areaName
      const assignedArea = areas.find(
        (a) =>
          a.id === rep.areaId ||
          (a.salesReps && a.salesReps.some((r) => r.id === rep.id)) ||
          (Boolean((rep as any).areaName) && (a.name === (rep as any).areaName || a.areaName === (rep as any).areaName)),
      );

      const assignedAreaName = assignedArea?.name || assignedArea?.areaName || (rep as any).areaName;

      const isAssignedToThisArea = Boolean(
        editingArea &&
          ((rep.areaId && rep.areaId === editingArea.id) ||
            (editingArea.salesReps && editingArea.salesReps.some((r) => r.id === rep.id))),
      );

      const isAssignedToOtherArea = Boolean(
        assignedAreaName &&
          (!editingArea ||
            (assignedArea && assignedArea.id !== editingArea.id) ||
            (editingArea.name !== assignedAreaName && editingArea.areaName !== assignedAreaName)),
      );

      return {
        ...rep,
        assignedArea,
        assignedAreaName,
        isAssignedToThisArea,
        isAssignedToOtherArea,
        disabled: isAssignedToOtherArea,
      };
    });
  }, [salesReps, areas, editingArea]);

  // Compute combined team info (Area Managers & Sales Reps) for any given area
  const getAreaTeam = useCallback(
    (area?: Area | null) => {
      if (!area) return { managers: [] as AreaUser[], salesReps: [] as AreaUser[], primaryManagerName: undefined };

      const assignedUsers = users.filter((u) => u.areaId === area.id);

      const isMgr = (u: any) => {
        const code = (typeof u.role === 'object' && u.role ? u.role.code : u.role) || u.roleCode;
        return code === 'AREA_MANAGER';
      };
      const isRep = (u: any) => {
        const code = (typeof u.role === 'object' && u.role ? u.role.code : u.role) || u.roleCode;
        return code === 'SALES_REP';
      };

      // Managers from backend area relation
      const backendManagers: AreaUser[] = (area.areaManagers || []).map((m) => ({
        id: m.id,
        fullName: m.fullName,
        displayName: m.displayName || m.fullName,
        email: m.email,
        role: { code: 'AREA_MANAGER', name: 'Area Manager' },
      }));

      // Managers from useUsers list
      const userListManagers: AreaUser[] = assignedUsers.filter(isMgr).map((u) => ({
        id: u.id,
        fullName: u.fullName || u.name,
        displayName: u.displayName || u.name,
        email: u.email,
        role: { code: 'AREA_MANAGER', name: 'Area Manager' },
      }));

      const managersMap = new Map<string, AreaUser>();
      [...backendManagers, ...userListManagers].forEach((m) => {
        if (m && m.id) managersMap.set(m.id, m);
      });
      const allManagers = Array.from(managersMap.values());

      // Reps from backend area relation
      const backendReps: AreaUser[] = (area.salesReps || []).map((r) => ({
        id: r.id,
        fullName: r.fullName,
        displayName: r.displayName || r.fullName,
        email: r.email,
        role: { code: 'SALES_REP', name: 'Sales Rep' },
      }));

      // Reps from useUsers list
      const userListReps: AreaUser[] = assignedUsers.filter(isRep).map((u) => ({
        id: u.id,
        fullName: u.fullName || u.name,
        displayName: u.displayName || u.name,
        email: u.email,
        role: { code: 'SALES_REP', name: 'Sales Rep' },
      }));

      const repsMap = new Map<string, AreaUser>();
      [...backendReps, ...userListReps].forEach((r) => {
        if (r && r.id) repsMap.set(r.id, r);
      });
      const allReps = Array.from(repsMap.values());

      const primaryManagerName =
        allManagers[0]?.displayName ||
        allManagers[0]?.fullName ||
        (area.areaManagerName && area.areaManagerName !== 'Unassigned'
          ? area.areaManagerName
          : undefined);

      return {
        managers: allManagers,
        salesReps: allReps,
        primaryManagerName,
      };
    },
    [users],
  );

  const currentModalTeam = useMemo(() => {
    return getAreaTeam(selectedAreaForTeam);
  }, [selectedAreaForTeam, getAreaTeam]);

  const handleOpenCustomersModal = async (area: Area) => {
    setSelectedAreaForCustomers(area);
    setCustomerSearchTerm('');

    // Pre-populate with preloaded customers if available
    if (area.customers && area.customers.length > 0) {
      setAreaCustomersList(area.customers);
    } else {
      setAreaCustomersList([]);
    }

    // Fetch the live list from customersApi for this area to guarantee freshness
    setLoadingAreaCustomers(true);
    try {
      const res = await customersApi.listCustomers({ areaId: area.id, pageSize: 100 });
      if (res && res.data) {
        const mapped: AreaCustomer[] = res.data.map((c) => ({
          id: c.id,
          customerCode: c.customerCode,
          displayName: c.displayName,
          companyName: c.companyName || c.displayName,
          contactPerson: c.contactPerson,
          primaryContactNumber: c.primaryContactNumber,
          email: c.email,
          status: c.status,
          loyaltyLevel: c.loyaltyLevel,
          creditPeriod: c.creditPeriod,
          creditLimit: c.creditLimit,
        }));
        setAreaCustomersList(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch customers for area:', err);
    } finally {
      setLoadingAreaCustomers(false);
    }
  };

  const filteredAreaCustomers = useMemo(() => {
    if (!areaCustomersList) return [];
    if (!customerSearchTerm.trim()) return areaCustomersList;
    const term = customerSearchTerm.toLowerCase();
    return areaCustomersList.filter(
      (c) =>
        c.displayName.toLowerCase().includes(term) ||
        c.companyName?.toLowerCase().includes(term) ||
        c.customerCode?.toLowerCase().includes(term) ||
        c.contactPerson?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.primaryContactNumber?.includes(term),
    );
  }, [areaCustomersList, customerSearchTerm]);

  const handleOpenModal = (area?: Area) => {
    if (area) {
      setEditingArea(area);
      const team = getAreaTeam(area);
      const repIds = team.salesReps.map((r) => r.id);
      setFormData({
        code: area.code || '',
        name: area.name,
        region: area.region || '',
        areaManagerId: area.areaManagerId || '',
        salesRepIds: repIds,
      });
    } else {
      setEditingArea(null);
      setFormData({ code: '', name: '', region: '', areaManagerId: '', salesRepIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      return;
    }

    if (formData.areaManagerId) {
      const selected = managersWithAssignment.find((m) => m.id === formData.areaManagerId);
      if (selected?.disabled) {
        const areaName = selected.assignedArea?.name || selected.assignedArea?.areaName || 'another area';
        toast.error(
          `Cannot assign ${selected.name}: already assigned to "${areaName}". Each Area Manager can be assigned to only ONE Area.`,
        );
        return;
      }
    }

    if (formData.salesRepIds && formData.salesRepIds.length > 0) {
      for (const repId of formData.salesRepIds) {
        const selected = salesRepsWithAssignment.find((r) => r.id === repId);
        if (selected?.disabled) {
          const areaName = selected.assignedAreaName || selected.assignedArea?.name || selected.assignedArea?.areaName || 'another area';
          toast.error(
            `Cannot assign ${selected.name}: already assigned to "${areaName}". Each Sales Representative can be assigned to only ONE Area.`,
          );
          return;
        }
      }
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
        salesRepIds: formData.salesRepIds,
        updatedAt: editingArea.updatedAt,
      });
    } else {
      await createArea({
        ...formData,
        areaManagerId: finalManagerId,
        areaManagerName: finalManagerName,
        salesRepIds: formData.salesRepIds,
      });
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (area: Area) => {
    const nextStatus = (area.status || 'ACTIVE') === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateAreaStatus(area.id, nextStatus);
    } catch (err: unknown) {
      console.error('Failed to change area status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;
    try {
      setIsDeleting(true);
      await deleteArea(areaToDelete.id);
      setAreaToDelete(null);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete area'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Area Management"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Areas' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {canCreate && (
              <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary-hover shadow-xs">
                <Plus className="h-4 w-4" /> Create Area
              </Button>
            )}
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by area name, code, or region..."
            value={areaSearchTerm}
            onChange={(e) => setAreaSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="text-xs h-9 bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </Select>
        </div>
      </div>

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
              <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {areasLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  Loading areas...
                </TableCell>
              </TableRow>
            ) : filteredAreas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  {areaSearchTerm || statusFilter !== 'ALL'
                    ? 'No areas match your search or filter.'
                    : 'No areas found. Create one to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAreas.map((area) => {
                const { salesReps, primaryManagerName } = getAreaTeam(area);
                const displayCustomerCount = area.customerCount ?? (area.customers ? area.customers.length : 0);
                const isActive = (area.status || 'ACTIVE') === 'ACTIVE';

                return (
                  <TableRow key={area.id} className="group hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-medium">
                        {area.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-900">{area.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{area.region}</TableCell>
                    <TableCell>
                      {primaryManagerName ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAreaForTeam(area)}
                          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors text-left cursor-pointer group/mgr"
                          title="Click to view assigned team details"
                        >
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold group-hover/mgr:bg-indigo-600 group-hover/mgr:text-white transition-colors">
                            {primaryManagerName.charAt(0)}
                          </div>
                          <span className="group-hover/mgr:underline">{primaryManagerName}</span>
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
                        <span>{salesReps.length} Reps</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenCustomersModal(area)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                        title="Click to view assigned customers"
                      >
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{displayCustomerCount}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isActive ? 'success' : 'secondary'} className="text-[11px] font-semibold">
                        {area.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(area)}
                              className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit Area"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(area)}
                              className={`h-8 w-8 ${
                                isActive
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Deactivate Area' : 'Activate Area'}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAreaToDelete(area)}
                            className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Area"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── CREATE / EDIT AREA MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="sm:max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              {editingArea ? 'Edit Area' : 'Create New Area'}
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {editingArea
                ? 'Update the details of the operational area below.'
                : 'Define a new operational area and assign staff.'}
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
                <MapIcon className="h-3.5 w-3.5 text-slate-400" /> Area Name
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
                data-testid="area-manager-select"
                value={formData.areaManagerId}
                onChange={(e) => setFormData({ ...formData, areaManagerId: e.target.value })}
                className="focus-visible:ring-indigo-500"
              >
                <option value="">-- No Area Manager (Optional) --</option>
                {managersWithAssignment.map((mgr) => (
                  <option key={mgr.id} value={mgr.id} disabled={mgr.disabled}>
                    <span>{mgr.name}</span>
                    {mgr.isAssignedToThisArea && (
                      <span className="ml-1 text-slate-500 font-normal"> (Current Area Manager)</span>
                    )}
                    {mgr.isAssignedToOtherArea && (
                      <span className="ml-1 text-slate-500 font-normal">
                        {` — (Assigned to: ${mgr.assignedAreaName || mgr.assignedArea?.name || mgr.assignedArea?.areaName || 'Another Area'})`}
                      </span>
                    )}
                  </option>
                ))}
                {formData.areaManagerId && !managersWithAssignment.some((m) => m.id === formData.areaManagerId) && (
                  <option key={formData.areaManagerId} value={formData.areaManagerId} disabled>
                    {editingArea?.areaManagerName || 'Unknown'} (Role Changed)
                  </option>
                )}
              </Select>
            </div>

            {/* Sales Representatives Section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> Sales Representatives
                </span>
                <span className="text-xs font-normal text-slate-400">Optional (Multiple)</span>
              </label>

              {/* Selected Sales Reps Chips */}
              {formData.salesRepIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
                  {formData.salesRepIds.map((repId) => {
                    const rep = salesReps.find((r) => r.id === repId);
                    const name = rep?.name || rep?.displayName || 'Unknown Rep';
                    return (
                      <span
                        key={repId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        <UserCheck className="h-3 w-3 text-emerald-600" />
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              salesRepIds: formData.salesRepIds.filter((id) => id !== repId),
                            })
                          }
                          className="text-emerald-700 hover:text-emerald-900 rounded-full hover:bg-emerald-100 p-0.5 transition-colors"
                          title="Remove representative"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No Sales Representatives assigned yet.</p>
              )}

              {/* Add Sales Rep Select Dropdown */}
              <Select
                data-testid="sales-rep-select"
                value=""
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId && !formData.salesRepIds.includes(selectedId)) {
                    setFormData({
                      ...formData,
                      salesRepIds: [...formData.salesRepIds, selectedId],
                    });
                  }
                }}
                className="focus-visible:ring-indigo-500"
              >
                <option value="">-- Add Sales Representative (Optional) --</option>
                {salesRepsWithAssignment.map((rep) => {
                  const isAlreadySelected = formData.salesRepIds.includes(rep.id);
                  const isDisabled = rep.disabled || isAlreadySelected;
                  return (
                    <option key={rep.id} value={rep.id} disabled={isDisabled}>
                      <span>{rep.name}</span>
                      {isAlreadySelected && (
                        <span className="ml-1 text-slate-500 font-normal"> (Already Added)</span>
                      )}
                      {!isAlreadySelected && rep.isAssignedToOtherArea && (
                        <span className="ml-1 text-slate-500 font-normal">
                          {` — (Assigned to: ${rep.assignedAreaName || rep.assignedArea?.name || rep.assignedArea?.areaName || 'Another Area'})`}
                        </span>
                      )}
                    </option>
                  );
                })}
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
            setAreaCustomersList([]);
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
                  {loadingAreaCustomers
                    ? 'Loading assigned customers...'
                    : `Showing ${filteredAreaCustomers.length} of ${areaCustomersList.length} registered commercial customers`}
                </p>
              </div>
            </div>
            {areaCustomersList.length > 2 && (
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
            {loadingAreaCustomers ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                <p>Loading customers assigned to this area...</p>
              </div>
            ) : filteredAreaCustomers.length === 0 ? (
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
                Area Manager ({currentModalTeam.managers.length})
              </div>
              {currentModalTeam.managers.length > 0 ? (
                <div className="space-y-2">
                  {currentModalTeam.managers.map((mgr) => (
                    <div
                      key={mgr.id}
                      className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(mgr.displayName || mgr.fullName).charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{mgr.displayName || mgr.fullName}</div>
                          {mgr.fullName !== mgr.displayName && (
                            <div className="text-[10px] text-slate-400">{mgr.fullName}</div>
                          )}
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
                Sales Representatives ({currentModalTeam.salesReps.length})
              </div>
              {currentModalTeam.salesReps.length > 0 ? (
                <div className="space-y-2">
                  {currentModalTeam.salesReps.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {(rep.displayName || rep.fullName).charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{rep.displayName || rep.fullName}</div>
                          {rep.fullName !== rep.displayName && (
                            <div className="text-[10px] text-slate-400">{rep.fullName}</div>
                          )}
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {rep.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
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

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between w-full">
            {canEdit && selectedAreaForTeam ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const areaToEdit = selectedAreaForTeam;
                  setSelectedAreaForTeam(null);
                  handleOpenModal(areaToEdit);
                }}
                className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Manage Team Assignments
              </Button>
            ) : <div />}
            <Button variant="outline" size="sm" onClick={() => setSelectedAreaForTeam(null)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ── SOFT DELETE CONFIRMATION MODAL ── */}
      <Dialog
        open={Boolean(areaToDelete)}
        onOpenChange={(open) => {
          if (!open) setAreaToDelete(null);
        }}
      >
        <div className="sm:max-w-md">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
              Delete Area
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 space-y-3">
            <p>
              Are you sure you want to delete the area <strong>'{areaToDelete?.name}'</strong>? This action will remove it from the active Area Management list. Historical records and existing relationships will be preserved.
            </p>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs">
              <strong>Notice:</strong> Once deleted, this area will no longer be visible or available for new assignments. However, its name can be reused for a new area if desired.
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAreaToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Area'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
export default AreaListPage;
