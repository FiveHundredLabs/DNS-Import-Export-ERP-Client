import { useState, useMemo } from 'react';
import { Area } from '../../mock/mockAreas';
import { useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Edit3, Trash2, Plus, Map, Briefcase, Hash, MapPin } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

export function AreaListPage() {
  const { areas, loading: areasLoading, createArea, updateArea, deleteArea } = useAreas();
  const { users, loading: usersLoading } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', region: '', areaManagerId: '' });

  const areaManagers = useMemo(() => {
    return users.filter(u => u.role === 'AREA_MANAGER');
  }, [users]);

  const handleOpenModal = (area?: Area) => {
    if (area) {
      setEditingArea(area);
      setFormData({ 
        code: area.code, 
        name: area.name, 
        region: area.region, 
        areaManagerId: area.areaManagerId || '' 
      });
    } else {
      setEditingArea(null);
      setFormData({ code: '', name: '', region: '', areaManagerId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const selectedManager = areaManagers.find(u => u.id === formData.areaManagerId);
    let finalManagerName = 'Unassigned';
    if (selectedManager) {
      finalManagerName = selectedManager.name;
    } else if (formData.areaManagerId) {
      const allUsersMatch = users.find(u => u.id === formData.areaManagerId);
      finalManagerName = allUsersMatch ? allUsersMatch.name : (editingArea?.areaManagerName || 'Unassigned');
    }
    
    if (editingArea) {
      await updateArea(editingArea.id, {
        ...formData,
        areaManagerName: finalManagerName,
      });
    } else {
      await createArea({ 
        ...formData, 
        areaManagerName: finalManagerName,
        salesManagerId: 'usr-103', 
        salesManagerName: 'Kamal Perera',
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      await deleteArea(id);
    }
  };

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Area Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage operational areas, regions, and assign Area Managers.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm"><Plus className="h-4 w-4" /> Create Area</Button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-600">Code</TableHead>
              <TableHead className="font-semibold text-slate-600">Area Name</TableHead>
              <TableHead className="font-semibold text-slate-600">Region</TableHead>
              <TableHead className="font-semibold text-slate-600">Area Manager</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areasLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">Loading areas...</TableCell></TableRow>
            ) : areas.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">No areas found. Create one to get started.</TableCell></TableRow>
            ) : areas.map(area => (
              <TableRow key={area.id} className="group hover:bg-slate-50 transition-colors">
                <TableCell>
                  <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-medium">
                    {area.code}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold text-slate-900">{area.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">{area.region}</TableCell>
                <TableCell>
                  {area.areaManagerName && area.areaManagerName !== 'Unassigned' ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {area.areaManagerName.charAt(0)}
                      </div>
                      {area.areaManagerName}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(area)} className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(area.id)} className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="sm:max-w-[425px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">{editingArea ? 'Edit Area' : 'Create New Area'}</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {editingArea ? 'Update the details of the operational area below.' : 'Define a new operational area and assign a manager.'}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" /> Area Code
              </label>
              <Input 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                placeholder="e.g. WP-CTR"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Map className="h-3.5 w-3.5 text-slate-400" /> Area Name
              </label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Western Province"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Region
              </label>
              <Input 
                value={formData.region} 
                onChange={e => setFormData({...formData, region: e.target.value})} 
                placeholder="e.g. Colombo & Suburbs"
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Area Manager
              </label>
              <Select 
                value={formData.areaManagerId} 
                onChange={e => setFormData({...formData, areaManagerId: e.target.value})}
                className="focus-visible:ring-indigo-500"
              >
                <option value="">-- Select Area Manager --</option>
                {usersLoading ? (
                  <option value="" disabled>Loading managers...</option>
                ) : (
                  <>
                    {areaManagers.map(mgr => (
                      <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                    ))}
                    {formData.areaManagerId && !areaManagers.some(m => m.id === formData.areaManagerId) && (
                      <option key={formData.areaManagerId} value={formData.areaManagerId}>
                        {editingArea?.areaManagerName || 'Unknown'} (Role Changed)
                      </option>
                    )}
                  </>
                )}
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editingArea ? 'Save Changes' : 'Create Area'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

