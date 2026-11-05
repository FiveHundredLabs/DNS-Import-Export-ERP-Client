import { useState, useMemo } from 'react';
import { User } from '../../types/auth';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Edit3, Trash2, Plus, User as UserIcon, Mail, Phone, Shield, Map } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/common/PageHeader';

export function TeamListPage() {
  const { users, loading: usersLoading, createUser, updateUser, deleteUser } = useUsers();
  const { areas, loading: areasLoading } = useAreas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'SALES_REP', areaId: '' });
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const teamUsers = useMemo(() => {
    return users.filter(u => u.role === 'AREA_MANAGER' || u.role === 'SALES_REP');
  }, [users]);

  const filteredTeamUsers = useMemo(() => {
    return teamUsers.filter(u => {
      const matchesArea = selectedAreaFilter === 'ALL' || u.areaId === selectedAreaFilter;
      const matchesSearch = !search.trim() ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.areaName && u.areaName.toLowerCase().includes(search.toLowerCase()));
      return matchesArea && matchesSearch;
    });
  }, [teamUsers, selectedAreaFilter, search]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, phone: user.phone || '', role: user.role, areaId: user.areaId || '' });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', phone: '', role: 'SALES_REP', areaId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const area = areas.find(a => a.id === formData.areaId);
    if (editingUser) {
      await updateUser(editingUser.id, { ...formData, areaName: area?.name } as Partial<User>);
    } else {
      await createUser({ 
        ...formData, 
        areaName: area?.name,
        isActive: true,
      } as Omit<User, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Team Management"
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Team' },
        ]}
        actions={
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary-hover shadow-xs">
            <Plus className="h-4 w-4" /> Add Team Member
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px] max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team by name, email, or area..."
            className="focus-visible:ring-indigo-500"
          />
        </div>
        <div className="w-64">
          <Select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="focus-visible:ring-indigo-500"
          >
            <option value="ALL">All Areas (Show All)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-600">Name</TableHead>
              <TableHead className="font-semibold text-slate-600">Email</TableHead>
              <TableHead className="font-semibold text-slate-600">Role</TableHead>
              <TableHead className="font-semibold text-slate-600">Area</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">Loading team...</TableCell></TableRow>
            ) : filteredTeamUsers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">No team members found.</TableCell></TableRow>
            ) : filteredTeamUsers.map(user => (
              <TableRow key={user.id} className="group hover:bg-slate-50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-900">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">{user.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'AREA_MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user.role === 'AREA_MANAGER' ? 'Area Manager' : 'Sales Rep'}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600">{user.areaName || <span className="italic text-slate-400">Unassigned</span>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)} className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <ConfirmButton
                      variant="ghost"
                      size="icon"
                      confirmTitle="Delete Team Member?"
                      confirmMessage={`Are you sure you want to remove ${user.name} from the team?`}
                      confirmLabel="Delete Member"
                      confirmVariant="destructive"
                      onConfirm={() => handleDelete(user.id)}
                      className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="sm:max-w-[500px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">{editingUser ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {editingUser ? 'Update the details of the team member below.' : 'Add a new member to the team and assign them a role.'}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" /> Full Name
              </label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Jane Doe"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address
                </label>
                <Input 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="name@company.com"
                  type="email"
                  className="focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number
                </label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+94 77 ..."
                  className="focus-visible:ring-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> Role
                </label>
                <Select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="focus-visible:ring-indigo-500"
                >
                  <option value="AREA_MANAGER">Area Manager</option>
                  <option value="SALES_REP">Sales Rep</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Map className="h-3.5 w-3.5 text-slate-400" /> Assigned Area
                  </span>
                  <span className="text-xs font-normal text-slate-400">Optional</span>
                </label>
                <Select 
                  value={formData.areaId} 
                  onChange={e => setFormData({...formData, areaId: e.target.value})}
                  className="focus-visible:ring-indigo-500"
                >
                  <option value="">-- No Area Assigned (Optional) --</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                  {formData.areaId && !areas.some(a => a.id === formData.areaId) && (
                    <option key={formData.areaId} value={formData.areaId}>
                      {editingUser?.areaName || 'Unknown'} (Deleted)
                    </option>
                  )}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editingUser ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
