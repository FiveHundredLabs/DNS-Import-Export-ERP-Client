import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Category } from '../../types/product';
import { FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category | void>;
}

export function CategoryCreateModal({
  open,
  onOpenChange,
  onCreate,
}: CategoryCreateModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Category name is required';
    }

    const finalCode = (code.trim() || name.trim().replace(/\s+/g, '-').toUpperCase()).slice(0, 20);
    if (!finalCode) {
      newErrors.code = 'Category code is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      await onCreate({
        name: name.trim(),
        code: finalCode,
        description: description.trim() || undefined,
      });
      toast.success(`Category "${name.trim()}" created successfully`);
      setName('');
      setCode('');
      setDescription('');
      onOpenChange(false);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create category' });
      toast.error('Could not create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
            <FolderPlus className="h-4 w-4" />
          </div>
          <DialogTitle>Create Product Category</DialogTitle>
        </div>
        <DialogDescription>
          Add a new classification category for organizing products in the Product Master.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errors.form && (
          <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Category Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!code) {
                // Auto suggest code
                setCode(e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 15));
              }
            }}
            placeholder="e.g. Transformers & Switchgear"
            error={errors.name}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Category Code <span className="text-rose-500">*</span>
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. TR-SW"
            error={errors.code}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Unique short identifier used for product grouping and reporting.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of products in this category..."
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
            <FolderPlus className="h-3.5 w-3.5" />
            {submitting ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
