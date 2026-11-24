import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import type { CreateSupplierPayload, Supplier } from '../../api/suppliers/suppliers.types';
import { extractErrorMessage } from '../../api/client';

const supplierFormSchema = z.object({
  supplierCode: z.string().trim().max(50, 'Supplier code must be 50 characters or fewer.'),
  name: z
    .string()
    .trim()
    .min(1, 'Supplier name is required.')
    .max(255, 'Supplier name must be 255 characters or fewer.'),
  contactPerson: z.string().trim().max(255, 'Contact person must be 255 characters or fewer.'),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be 255 characters or fewer.')
    .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address.'),
  phone: z.string().trim().max(50, 'Phone must be 50 characters or fewer.'),
  address: z.string().trim(),
  taxNumber: z.string().trim().max(50, 'TIN must be 50 characters or fewer.'),
  vatNumber: z.string().trim().max(50, 'VAT number must be 50 characters or fewer.'),
  paymentTerms: z.string().trim().max(100, 'Payment terms must be 100 characters or fewer.'),
  bankName: z.string().trim().max(100, 'Bank name must be 100 characters or fewer.'),
  bankBranch: z.string().trim().max(100, 'Bank branch must be 100 characters or fewer.'),
  bankAccountNo: z.string().trim().max(50, 'Account number must be 50 characters or fewer.'),
  bankSwiftCode: z.string().trim().max(50, 'SWIFT/BIC code must be 50 characters or fewer.'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  supplier?: Supplier | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CreateSupplierPayload) => Promise<void>;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={id + '-error'} className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const emptyForm: SupplierFormValues = {
  supplierCode: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  taxNumber: '',
  vatNumber: '',
  paymentTerms: '',
  bankName: '',
  bankBranch: '',
  bankAccountNo: '',
  bankSwiftCode: '',
  status: 'ACTIVE',
};

function optionalValue(value: string, editing: boolean): string | null | undefined {
  const normalized = value.trim();
  return normalized || (editing ? null : undefined);
}

export function SupplierFormDialog({
  open,
  supplier,
  onOpenChange,
  onSave,
}: SupplierFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    setServerError(null);
    reset(
      supplier
        ? {
            supplierCode: supplier.supplierCode ?? '',
            name: supplier.name,
            contactPerson: supplier.contactPerson ?? '',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            address: supplier.address ?? '',
            taxNumber: supplier.taxNumber ?? '',
            vatNumber: supplier.vatNumber ?? '',
            paymentTerms: supplier.paymentTerms ?? '',
            bankName: supplier.bankName ?? '',
            bankBranch: supplier.bankBranch ?? '',
            bankAccountNo: supplier.bankAccountNo ?? '',
            bankSwiftCode: supplier.bankSwiftCode ?? '',
            status: supplier.status,
          }
        : emptyForm,
    );
  }, [supplier, open, reset]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const email = optionalValue(values.email, Boolean(supplier));
    const payload: CreateSupplierPayload = {
      supplierCode: optionalValue(values.supplierCode, Boolean(supplier)),
      name: values.name.trim(),
      contactPerson: optionalValue(values.contactPerson, Boolean(supplier)),
      email: email === null ? null : email?.toLowerCase(),
      phone: optionalValue(values.phone, Boolean(supplier)),
      address: optionalValue(values.address, Boolean(supplier)),
      taxNumber: optionalValue(values.taxNumber, Boolean(supplier)),
      vatNumber: optionalValue(values.vatNumber, Boolean(supplier)),
      paymentTerms: optionalValue(values.paymentTerms, Boolean(supplier)),
      bankName: optionalValue(values.bankName, Boolean(supplier)),
      bankBranch: optionalValue(values.bankBranch, Boolean(supplier)),
      bankAccountNo: optionalValue(values.bankAccountNo, Boolean(supplier)),
      bankSwiftCode: optionalValue(values.bankSwiftCode, Boolean(supplier)),
      status: values.status,
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, 'Could not save supplier.'));
    }
  });

  const textInput = (id: string, fieldName: keyof SupplierFormValues, error?: string) => (
    <Input
      id={id}
      {...register(fieldName)}
      error={error}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? id + '-error' : undefined}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)} size="2xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit supplier' : 'Create supplier'}</DialogTitle>
          <DialogDescription>
            Maintain supplier contacts, tax registrations, payment terms, and bank details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {serverError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              {serverError}
            </div>
          )}

          <section aria-labelledby="supplier-general-heading" className="space-y-3">
            <h3 id="supplier-general-heading" className="text-sm font-semibold text-slate-900">
              Business details
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="supplier-name" label="Supplier name *" error={errors.name?.message}>
                {textInput('supplier-name', 'name', errors.name?.message)}
              </Field>
              <Field id="supplier-code" label="Supplier code" error={errors.supplierCode?.message}>
                {textInput('supplier-code', 'supplierCode', errors.supplierCode?.message)}
              </Field>
              <Field id="supplier-contact" label="Contact person" error={errors.contactPerson?.message}>
                {textInput('supplier-contact', 'contactPerson', errors.contactPerson?.message)}
              </Field>
              <Field id="supplier-phone" label="Primary phone" error={errors.phone?.message}>
                {textInput('supplier-phone', 'phone', errors.phone?.message)}
              </Field>
              <Field id="supplier-email" label="Email address" error={errors.email?.message}>
                {textInput('supplier-email', 'email', errors.email?.message)}
              </Field>
              <Field id="supplier-payment-terms" label="Payment terms" error={errors.paymentTerms?.message}>
                {textInput('supplier-payment-terms', 'paymentTerms', errors.paymentTerms?.message)}
              </Field>
              <Field id="supplier-tin" label="Tax identification number" error={errors.taxNumber?.message}>
                {textInput('supplier-tin', 'taxNumber', errors.taxNumber?.message)}
              </Field>
              <Field id="supplier-vat" label="VAT registration number" error={errors.vatNumber?.message}>
                {textInput('supplier-vat', 'vatNumber', errors.vatNumber?.message)}
              </Field>
              <Field id="supplier-status" label="Status">
                <select
                  id="supplier-status"
                  {...register('status')}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
            </div>
            <Field id="supplier-address" label="Registration address">
              <textarea
                id="supplier-address"
                {...register('address')}
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </Field>
          </section>

          <section aria-labelledby="supplier-bank-heading" className="space-y-3">
            <h3 id="supplier-bank-heading" className="text-sm font-semibold text-slate-900">
              Bank details
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="supplier-bank-name" label="Bank name" error={errors.bankName?.message}>
                {textInput('supplier-bank-name', 'bankName', errors.bankName?.message)}
              </Field>
              <Field id="supplier-bank-branch" label="Branch" error={errors.bankBranch?.message}>
                {textInput('supplier-bank-branch', 'bankBranch', errors.bankBranch?.message)}
              </Field>
              <Field id="supplier-bank-account" label="Account number" error={errors.bankAccountNo?.message}>
                {textInput('supplier-bank-account', 'bankAccountNo', errors.bankAccountNo?.message)}
              </Field>
              <Field id="supplier-bank-swift" label="SWIFT / BIC code" error={errors.bankSwiftCode?.message}>
                {textInput('supplier-bank-swift', 'bankSwiftCode', errors.bankSwiftCode?.message)}
              </Field>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : supplier ? 'Save changes' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
