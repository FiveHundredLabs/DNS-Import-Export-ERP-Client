import { useState, useMemo, useEffect, FormEvent } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  User as UserIcon,
  Mail,
  Shield,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Map,
} from 'lucide-react';

import { User, UserRole } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import { rolesApi } from '../../api/roles/roles.api';
import { Role } from '../../api/roles/roles.types';
import { CreateUserPayload, UpdateUserPayload } from '../../api/users/users.types';
import { ApiErrorResponse } from '../../api/axios';

import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { ConfirmButton } from '../../components/ui/confirm-button';

// Helper to determine if a role code requires area assignment
function isAreaApplicableRole(roleCode?: string): boolean {
  if (!roleCode) return false;
  const normalized = roleCode.toUpperCase().replace(/\s+/g, '_');
  return normalized === 'SALES_REP' || normalized === 'AREA_MANAGER';
}

const DEFAULT_ASSIGNABLE_ROLES: Role[] = [
  { id: 'role-sales-rep', name: 'Sales Representative', code: 'SALES_REP' },
  { id: 'role-area-mgr', name: 'Area Manager', code: 'AREA_MANAGER' },
  { id: 'role-sales-mgr', name: 'Sales Manager', code: 'SALES_MANAGER' },
  { id: 'role-finance-mgr', name: 'Finance Manager', code: 'FINANCE_MANAGER' },
  { id: 'role-finance-off', name: 'Finance Officer', code: 'FINANCE_OFFICER' },
  { id: 'role-purch-mgr', name: 'Purchasing Manager', code: 'PURCHASING_MANAGER' },
  { id: 'role-purch-off', name: 'Purchasing Officer', code: 'PURCHASING_OFFICER' },
  { id: 'role-showroom-mgr', name: 'Showroom Manager', code: 'SHOWROOM_MANAGER' },
  { id: 'role-showroom-cash', name: 'Showroom Cashier', code: 'SHOWROOM_CASHIER' },
  { id: 'role-stock-mgr', name: 'Stock Manager', code: 'STOCK_MANAGER' },
  { id: 'role-stock-keep', name: 'Stock Keeper', code: 'STOCK_KEEPER' },
];

// Color badges for the 13 defined roles
function getRoleBadgeClasses(roleCode?: string): string {
  switch (roleCode) {
    case 'DIRECTOR':
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'SALES_MANAGER':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'AREA_MANAGER':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'SALES_REP':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'FINANCE_MANAGER':
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    case 'FINANCE_OFFICER':
      return 'bg-pink-100 text-pink-800 border border-pink-200';
    case 'PURCHASING_MANAGER':
    case 'PURCHASING_OFFICER':
      return 'bg-teal-100 text-teal-800 border border-teal-200';
    case 'SHOWROOM_MANAGER':
    case 'SHOWROOM_CASHIER':
      return 'bg-violet-100 text-violet-800 border border-violet-200';
    case 'STOCK_MANAGER':
    case 'STOCK_KEEPER':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export function TeamListPage() {
  const { currentUser } = useAuth();
  const { users, rawUsers, loading: usersLoading, error, refetch, createUser, updateUser, deleteUser, changeStatus } = useUsers();
  const { areas } = useAreas();

  // Assignable roles dynamically fetched based on the logged-in actor's role
  const [assignableRoles, setAssignableRoles] = useState<Role[]>(DEFAULT_ASSIGNABLE_ROLES);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    displayName: '',
    email: '',
    tempPassword: '',
    roleId: 'role-sales-rep',
    areaId: '',
    joinedDate: new Date().toISOString().split('T')[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    displayName: '',
    joinedDate: '',
    areaId: '',
  });

  // Area quick assignment state
  const [quickAreaId, setQuickAreaId] = useState('');

  // Check authorization: only DIRECTOR and MANAGER have access (when authenticated)
  const isAuthorized = !currentUser || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MANAGER';

  // Fetch assignable roles on mount
  useEffect(() => {
    let mounted = true;
    async function loadAssignableRoles() {
      if (!isAuthorized) return;
      setLoadingRoles(true);
      try {
        const roles = await rolesApi.getAssignableRoles();
        if (mounted) {
          setAssignableRoles(roles);
          if (roles.length > 0 && !createForm.roleId) {
            const salesRepRole = roles.find((r) => r.code === 'SALES_REP') || roles[0];
            setCreateForm((prev) => ({ ...prev, roleId: salesRepRole.id }));
          }
        }
      } catch (err) {
        console.error('Failed to load assignable roles:', err);
        // Fallback: list all roles if assignable endpoint has issues
        try {
          const all = await rolesApi.listRoles();
          if (mounted) {
            // If actor is MANAGER, filter out DIRECTOR and MANAGER
            const filtered = currentUser?.role === 'MANAGER'
              ? all.filter((r) => r.code !== 'DIRECTOR' && r.code !== 'MANAGER')
              : all;
            setAssignableRoles(filtered);
            if (filtered.length > 0 && !createForm.roleId) {
              const salesRepRole = filtered.find((r) => r.code === 'SALES_REP') || filtered[0];
              setCreateForm((prev) => ({ ...prev, roleId: salesRepRole.id }));
            }
          }
        } catch (e2) {
          console.error('Failed to list roles:', e2);
          if (mounted) setAssignableRoles(DEFAULT_ASSIGNABLE_ROLES);
        }
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    }
    loadAssignableRoles();
    return () => {
      mounted = false;
    };
  }, [isAuthorized, currentUser?.role]);

  // Selected role for Create Modal conditional logic
  const selectedCreateRole = useMemo(() => {
    return assignableRoles.find((r) => r.id === createForm.roleId || r.code === createForm.roleId);
  }, [assignableRoles, createForm.roleId]);

  const showAreaInCreate = isAreaApplicableRole(selectedCreateRole?.code);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) {
        return false;
      }
      // Area filter
      if (selectedAreaFilter !== 'ALL' && u.areaId !== selectedAreaFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        const userStatus = u.status || (u.isActive ? 'ACTIVE' : 'INACTIVE');
        if (userStatus !== selectedStatusFilter) return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (u.fullName || u.name).toLowerCase().includes(q);
        const matchesDisplay = (u.displayName || '').toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesArea = (u.areaName || '').toLowerCase().includes(q);
        const matchesRole = u.role.toLowerCase().includes(q);
        if (!matchesName && !matchesDisplay && !matchesEmail && !matchesArea && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [users, selectedRoleFilter, selectedAreaFilter, selectedStatusFilter, search]);

  // Handlers
  const handleOpenCreateModal = () => {
    const defaultRoleId = assignableRoles.length > 0 ? (assignableRoles.find(r => r.code === 'SALES_REP')?.id || assignableRoles[0].id) : 'role-sales-rep';
    setCreateForm({
      fullName: '',
      displayName: '',
      email: '',
      tempPassword: '',
      roleId: defaultRoleId,
      areaId: '',
      joinedDate: new Date().toISOString().split('T')[0],
    });
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.tempPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (createForm.tempPassword.length < 8) {
      toast.error('Temporary password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        fullName: createForm.fullName.trim(),
        displayName: createForm.displayName.trim() || createForm.fullName.trim(),
        email: createForm.email.trim().toLowerCase(),
        tempPassword: createForm.tempPassword,
        roleId: createForm.roleId,
        areaId: showAreaInCreate && createForm.areaId ? createForm.areaId : null,
        joinedDate: createForm.joinedDate,
      };

      await createUser(payload);
      toast.success(`User "${payload.displayName}" created successfully.`);
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const msg = isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.message || err.message
        : 'Failed to create user.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || user.name,
      displayName: user.displayName || user.name,
      joinedDate: user.joinedDate || '',
      areaId: user.areaId || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const rawUser = rawUsers.find((r) => r.id === selectedUser.id);
      const updatedAt = rawUser?.updatedAt || selectedUser.updatedAt || new Date().toISOString();

      const payload: UpdateUserPayload = {
        fullName: editForm.fullName.trim(),
        displayName: editForm.displayName.trim(),
        joinedDate: editForm.joinedDate || undefined,
        areaId: isAreaApplicableRole(selectedUser.role) ? (editForm.areaId || null) : undefined,
        updatedAt,
      };

      await updateUser(selectedUser.id, payload);
      toast.success(`User updated successfully.`);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const msg = isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.message || err.message
        : 'Failed to update user.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAreaModal = (user: User) => {
    setSelectedUser(user);
    setQuickAreaId(user.areaId || '');
    setIsAreaModalOpen(true);
  };

  const handleQuickAreaSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const rawUser = rawUsers.find((r) => r.id === selectedUser.id);
      const updatedAt = rawUser?.updatedAt || selectedUser.updatedAt || new Date().toISOString();

      await updateUser(selectedUser.id, {
        areaId: quickAreaId || null,
        updatedAt,
      });

      const assignedArea = areas.find((a) => a.id === quickAreaId);
      toast.success(
        quickAreaId
          ? `Assigned area "${assignedArea?.name || 'Area'}" to ${selectedUser.name}.`
          : `Removed area assignment for ${selectedUser.name}.`,
      );
      setIsAreaModalOpen(false);
    } catch (err: unknown) {
      const msg = isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.message || err.message
        : 'Failed to update area assignment.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const rawUser = rawUsers.find((r) => r.id === user.id);
      const updatedAt = rawUser?.updatedAt || user.updatedAt || new Date().toISOString();
      const nextStatus = user.isActive ? 'INACTIVE' : 'ACTIVE';

      await changeStatus(user.id, nextStatus, updatedAt);
      toast.success(`User "${user.name}" status changed to ${nextStatus}.`);
    } catch (err: unknown) {
      const msg = isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.message || err.message
        : 'Failed to change user status.';
      toast.error(msg);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      await deleteUser(id);
      toast.success(`User "${name}" deleted.`);
    } catch (err: unknown) {
      const msg = isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.message || err.message
        : 'Failed to delete user.';
      toast.error(msg);
    }
  };

  // If unauthorized, block access cleanly
  if (!isAuthorized) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Only users with Director or Manager roles are authorized to access User Management.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <PageHeader
        title="User Management"
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Team Management' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={usersLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              aria-label="Add Team Member"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Create User
            </Button>
          </div>
        }
      />

      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search */}
        <div className="flex-1 min-w-[240px] max-w-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by name, email, or area..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Pills */}
          <div className="hidden sm:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${selectedStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition ${selectedStatusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('INACTIVE')}
              className={`px-2.5 py-1 rounded-md transition ${selectedStatusFilter === 'INACTIVE' ? 'bg-white text-slate-700 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              Inactive
            </button>
          </div>

          {/* Area Filter Combobox */}
          <div className="w-64">
            <Select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="h-9 text-sm"
            >
              <option value="ALL">All Areas (Show All)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 border-b border-slate-200/80">
              <TableHead className="font-semibold text-slate-700 py-3.5">User</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Role</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Area Assignment</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Joined Date</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-700 py-3.5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">Loading system users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <UserIcon className="h-8 w-8 text-slate-300" />
                    <p className="font-semibold text-slate-700">No users found</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search criteria or create a new user.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const isSalesRepOrAreaMgr = isAreaApplicableRole(user.role);
                const roleBadgeClass = getRoleBadgeClasses(user.role);
                const formattedRole = user.role.replace(/_/g, ' ');

                return (
                  <TableRow
                    key={user.id}
                    className="group hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                  >
                    {/* User Info */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center font-bold text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role Badge */}
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${roleBadgeClass}`}
                      >
                        {formattedRole}
                      </span>
                    </TableCell>

                    {/* Area: ONLY displayed for Sales Rep and Area Manager */}
                    <TableCell className="py-3">
                      {isSalesRepOrAreaMgr ? (
                        user.areaName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                            <MapPin className="h-3 w-3 text-sky-500 shrink-0" />
                            {user.areaName}
                          </span>
                        ) : (
                          <span className="italic text-xs text-slate-400">Unassigned</span>
                        )
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="py-3 text-xs text-slate-600">
                      {user.joinedDate ? user.joinedDate.split('T')[0] : '—'}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="h-3 w-3 text-slate-400" />
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Area Assignment button for Sales Rep / Area Manager */}
                        {isSalesRepOrAreaMgr && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAreaModal(user)}
                            title="Assign or Change Area"
                            className="h-8 px-2 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 gap-1"
                          >
                            <Map className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Area</span>
                          </Button>
                        )}

                        {/* Edit User Details */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(user)}
                          title="Edit User Details"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Toggle Status (Active / Inactive) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(user)}
                          title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                          className={`h-8 w-8 ${
                            user.isActive
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.isActive ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* Soft Delete User */}
                        <ConfirmButton
                          variant="ghost"
                          size="icon"
                          confirmTitle="Delete User Account?"
                          confirmMessage={`Are you sure you want to deactivate and remove ${user.name}? This will revoke all active sessions.`}
                          confirmLabel="Delete User"
                          confirmVariant="destructive"
                          onConfirm={() => handleDeleteUser(user.id, user.name)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── CREATE USER MODAL ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div className="sm:max-w-[540px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-800" aria-label="Add Team Member">
              Create User <span className="text-sm font-normal text-slate-400">/ Add Team Member</span>
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Provide account credentials and system role. Only permitted roles for your account are displayed.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Full Name & Display Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreateForm((prev) => ({
                      ...prev,
                      fullName: val,
                      displayName: prev.displayName ? prev.displayName : val,
                    }));
                  }}
                  placeholder="e.g. Priyantha Jayasuriya"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Display Name *</label>
                <Input
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g. Priyantha"
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address *</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="priyantha@dnserp.com"
                  required
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Temporary Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Temporary Password (min 8 characters) *
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={createForm.tempPassword}
                  onChange={(e) => setCreateForm({ ...createForm, tempPassword: e.target.value })}
                  placeholder="Initial secure password"
                  required
                  minLength={8}
                  className="pl-9 pr-10 h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Role & Joined Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">System Role *</label>
                <Select
                  value={createForm.roleId}
                  onChange={(e) => {
                    const newRoleId = e.target.value;
                    const r = assignableRoles.find((role) => role.id === newRoleId);
                    const isArea = isAreaApplicableRole(r?.code);
                    setCreateForm((prev) => ({
                      ...prev,
                      roleId: newRoleId,
                      areaId: isArea ? prev.areaId : '',
                    }));
                  }}
                  className="h-9 text-sm"
                >
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Date Joined *</label>
                <Input
                  type="date"
                  value={createForm.joinedDate}
                  onChange={(e) => setCreateForm({ ...createForm, joinedDate: e.target.value })}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* CONDITIONAL AREA ASSIGNMENT: Displayed ONLY for Sales Rep and Area Manager */}
            {showAreaInCreate && (
              <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-1.5 transition-all">
                <label className="text-xs font-semibold text-sky-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sky-600" />
                    Assign Operational Area
                  </span>
                  <span className="text-[11px] font-normal text-sky-600">
                    Mandatory for territory routing
                  </span>
                </label>
                <Select
                  value={createForm.areaId}
                  onChange={(e) => setCreateForm({ ...createForm, areaId: e.target.value })}
                  className="h-9 text-sm bg-white"
                >
                  <option value="">-- No Area Assigned (Optional) --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </Select>
                <p className="text-[11px] text-sky-700">
                  Orders and customers mapped to this area will be linked to this {selectedCreateRole?.name}.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Creating User...' : 'Create User'}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </Dialog>

      {/* ── EDIT USER MODAL ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <div className="sm:max-w-[500px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-800">
              Edit User Profile
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Update personal details and area assignment for {selectedUser?.name}.
            </p>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name *</label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Display Name *</label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Date Joined</label>
              <Input
                type="date"
                value={editForm.joinedDate}
                onChange={(e) => setEditForm({ ...editForm, joinedDate: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            {/* Conditional Area Field in Edit */}
            {selectedUser && isAreaApplicableRole(selectedUser.role) && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                <label className="text-xs font-semibold text-sky-900 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  Assigned Area
                </label>
                <Select
                  value={editForm.areaId}
                  onChange={(e) => setEditForm({ ...editForm, areaId: e.target.value })}
                  className="h-9 text-sm bg-white"
                >
                  <option value="">-- No Area Assigned (Unassigned) --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* ── QUICK ASSIGN AREA MODAL ── */}
      <Dialog open={isAreaModalOpen} onOpenChange={setIsAreaModalOpen}>
        <div className="sm:max-w-[420px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-600" />
              Assign Area: {selectedUser?.name}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Select an operational sales area for this {selectedUser?.role.replace(/_/g, ' ')}.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Area</label>
              <Select
                value={quickAreaId}
                onChange={(e) => setQuickAreaId(e.target.value)}
                className="h-9 text-sm"
              >
                <option value="">-- No Area Assigned (Unassigned) --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAreaModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleQuickAreaSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSubmitting ? 'Updating...' : 'Update Area'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
