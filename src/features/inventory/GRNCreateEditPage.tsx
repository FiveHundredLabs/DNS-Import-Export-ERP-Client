import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ProductSelector } from '../../components/selectors/ProductSelector';

const itemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productNameSnapshot: z.string().optional(),
  skuSnapshot: z.string().optional(),
  expectedQuantity: z.number().min(1),
  receivedQuantity: z.number().min(0),
  damagedQuantity: z.number().min(0),
  unitCost: z.number().min(0),
  lineValue: z.number().min(0)
});

const formSchema = z.object({
  supplierName: z.string().min(1, 'Supplier Name is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  items: z.array(itemSchema).min(1, 'At least one item is required')
});

type FormValues = z.infer<typeof formSchema>;

export function GRNCreateEditPage() {
  const navigate = useNavigate();
  const { grnService } = useGRN();
  const { user } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { supplierName: '', warehouseId: '', items: [] }
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = async (data: FormValues, status: 'DRAFT' | 'SUBMITTED') => {
    try {
      const computedItems = data.items.map(item => ({
        ...item,
        lineValue: (item.receivedQuantity - item.damagedQuantity) * item.unitCost
      }));
      const payload = { ...data, items: computedItems, status };
      
      if (status === 'SUBMITTED') {
        await grnService.submitGRN({ id: Math.random().toString(), ...payload } as any, user);
      } else {
        await grnService.createGRN({ id: Math.random().toString(), ...payload } as any, user);
      }
      toast.success(`GRN successfully saved as ${status}`);
      navigate('/inventory/grn');
    } catch (e: any) {
      toast.error(e.message || "Error saving GRN");
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create GRN</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input {...form.register('supplierName')} placeholder="Supplier Name" />
                {form.formState.errors.supplierName && <span className="text-red-500">{form.formState.errors.supplierName.message}</span>}
              </div>
              <div>
                <Input {...form.register('warehouseId')} placeholder="Warehouse ID" />
                {form.formState.errors.warehouseId && <span className="text-red-500">{form.formState.errors.warehouseId.message}</span>}
              </div>
            </div>

            <div className="space-y-4 border p-4 rounded">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Items</h3>
                <Button type="button" onClick={() => append({ productId: 'P1', expectedQuantity: 1, receivedQuantity: 1, damagedQuantity: 0, unitCost: 10, lineValue: 10 })}>Add Mock Item</Button>
              </div>
              
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th>Product</th>
                    <th>Received Qty</th>
                    <th>Damaged Qty</th>
                    <th>Unit Cost</th>
                    <th>Line Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const received = form.watch(`items.${index}.receivedQuantity`);
                    const damaged = form.watch(`items.${index}.damagedQuantity`);
                    const cost = form.watch(`items.${index}.unitCost`);
                    const lineValue = (received - damaged) * cost;
                    return (
                      <tr key={field.id}>
                        <td><Input {...form.register(`items.${index}.productId`)} /></td>
                        <td><Input type="number" {...form.register(`items.${index}.receivedQuantity`, { valueAsNumber: true })} /></td>
                        <td><Input type="number" {...form.register(`items.${index}.damagedQuantity`, { valueAsNumber: true })} /></td>
                        <td><Input type="number" {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })} /></td>
                        <td>{lineValue}</td>
                        <td><Button type="button" variant="destructive" onClick={() => remove(index)}>Remove</Button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {form.formState.errors.items && <span className="text-red-500">{form.formState.errors.items.message}</span>}
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={form.handleSubmit(data => onSubmit(data, 'DRAFT'))}>Save as Draft</Button>
              <Button type="button" onClick={form.handleSubmit(data => onSubmit(data, 'SUBMITTED'))}>Submit for Approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
