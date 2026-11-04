import * as React from 'react';
import { Button, ButtonProps } from './button';
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmTitle?: React.ReactNode;
  confirmMessage?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps['variant'];
  dialogVariant?: ConfirmDialogVariant;
  onConfirm: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  confirmContent?: React.ReactNode;
  dialogSize?: 'sm' | 'md' | 'lg';
  confirmTestId?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  confirmTitle,
  confirmMessage,
  confirmText,
  cancelText = 'Cancel',
  confirmVariant,
  dialogVariant = 'default',
  onConfirm,
  confirmContent,
  dialogSize = 'md',
  confirmTestId = 'confirm-dialog-submit-btn',
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const resolvedConfirmVariant =
    confirmVariant ||
    (dialogVariant === 'destructive'
      ? 'destructive'
      : dialogVariant === 'success'
      ? 'success'
      : 'default');

  const defaultTitle =
    confirmTitle ||
    (dialogVariant === 'destructive'
      ? 'Confirm Action'
      : dialogVariant === 'warning'
      ? 'Warning: Please Confirm'
      : dialogVariant === 'success'
      ? 'Confirm Operation'
      : 'Are you sure?');

  const defaultMessage =
    confirmMessage ||
    (dialogVariant === 'destructive'
      ? 'Are you sure you want to perform this action? This operation may be irreversible.'
      : 'Are you sure you want to proceed with this action?');

  const defaultConfirmText =
    confirmText ||
    (dialogVariant === 'destructive'
      ? 'Confirm & Proceed'
      : dialogVariant === 'success'
      ? 'Approve & Proceed'
      : 'Confirm');

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    try {
      setLoading(true);
      const result = onConfirm(e);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await result;
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = () => {
    switch (dialogVariant) {
      case 'destructive':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-500/25 ring-4 ring-rose-50 sm:h-12 sm:w-12">
            <AlertTriangle className="h-6 w-6 stroke-[2.25]" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/25 ring-4 ring-amber-50 sm:h-12 sm:w-12">
            <AlertCircle className="h-6 w-6 stroke-[2.25]" />
          </div>
        );
      case 'success':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50 sm:h-12 sm:w-12">
            <CheckCircle2 className="h-6 w-6 stroke-[2.25]" />
          </div>
        );
      case 'info':
      case 'default':
      default:
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-500 text-white shadow-lg shadow-primary/25 ring-4 ring-primary/10 sm:h-12 sm:w-12">
            <HelpCircle className="h-6 w-6 stroke-[2.25]" />
          </div>
        );
    }
  };

  const getTopGlowClass = () => {
    switch (dialogVariant) {
      case 'destructive':
        return 'from-rose-500/[0.08] via-rose-500/[0.02] to-transparent';
      case 'warning':
        return 'from-amber-500/[0.08] via-amber-500/[0.02] to-transparent';
      case 'success':
        return 'from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent';
      default:
        return 'from-primary/[0.08] via-primary/[0.02] to-transparent';
    }
  };

  const getConfirmButtonClass = () => {
    switch (dialogVariant) {
      case 'destructive':
        return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm shadow-rose-600/20';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-600/20';
      case 'warning':
        return 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm shadow-amber-600/20';
      default:
        return 'bg-primary hover:bg-primary-hover text-white shadow-sm shadow-primary/20';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !loading && onOpenChange(val)}
      size={dialogSize}
      hideCloseButton={loading}
      className="rounded-3xl border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] p-0 overflow-hidden bg-white ring-1 ring-black/[0.04]"
    >
      <div className="relative flex flex-col" role="alertdialog" aria-modal="true">
        {/* Subtle decorative top ambient tint */}
        <div className={cn("absolute top-0 inset-x-0 h-32 bg-gradient-to-b pointer-events-none", getTopGlowClass())} />

        <div className="relative p-6 sm:p-7 space-y-4">
          <div className="flex items-start gap-4">
            {renderIcon()}
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {defaultTitle}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                {defaultMessage}
              </DialogDescription>
            </div>
          </div>

          {confirmContent && (
            <div className="mt-3 text-xs sm:text-sm text-slate-700 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              {confirmContent}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100/90 flex flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            data-testid="confirm-dialog-cancel-btn"
            className="h-9 sm:h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleConfirm}
            data-testid={confirmTestId}
            className={cn(
              "h-9 sm:h-10 px-5 rounded-xl text-xs font-bold gap-2 active:scale-[0.98] transition-all cursor-pointer",
              confirmVariant ? undefined : getConfirmButtonClass()
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {defaultConfirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export interface ConfirmButtonProps extends ButtonProps {
  /** Title for the confirmation dialog. Defaults based on dialogVariant or action. */
  confirmTitle?: React.ReactNode;
  /** Detailed description or question. Defaults to "Are you sure you want to proceed?" */
  confirmMessage?: React.ReactNode;
  /** Label for the confirmation action button. Defaults to "Confirm". */
  confirmText?: string;
  /** Alias for confirmText. */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelText?: string;
  /** Variant for the confirm button inside the dialog. Defaults to match the trigger button or dialogVariant. */
  confirmVariant?: ButtonProps['variant'];
  /** Visual theme of the dialog (sets icon and accents). Inferred from variant if not provided. */
  dialogVariant?: ConfirmDialogVariant;
  /** Whether confirmation is required. If false, executes immediately without modal. Defaults to true. */
  requireConfirm?: boolean;
  /** Callback fired when user confirms. Can return a Promise for async loading state. */
  onConfirm?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Optional custom content rendered between description and footer */
  confirmContent?: React.ReactNode;
  /** Dialog size: 'sm' | 'md' | 'lg'. Defaults to 'md'. */
  dialogSize?: 'sm' | 'md' | 'lg';
  /** Optional custom test ID for the confirm action button inside the dialog */
  confirmTestId?: string;
}

export const ConfirmButton = React.forwardRef<HTMLButtonElement, ConfirmButtonProps>(
  (
    {
      children,
      onClick,
      onConfirm,
      confirmTitle,
      confirmMessage,
      confirmText,
      confirmLabel,
      cancelText = 'Cancel',
      confirmVariant,
      dialogVariant,
      requireConfirm = true,
      confirmContent,
      dialogSize = 'md',
      confirmTestId = 'confirm-dialog-submit-btn',
      variant = 'default',
      size = 'default',
      className,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const internalRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);

    // Infer dialog variant if not explicitly provided
    const resolvedDialogVariant: ConfirmDialogVariant =
      dialogVariant ||
      (variant === 'destructive'
        ? 'destructive'
        : variant === 'success'
        ? 'success'
        : 'default');

    // Handle initial button click
    const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const form = internalRef.current?.form;
      // If this is a submit button inside a form, enforce HTML form validation before opening modal
      if (type === 'submit' && form) {
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
          if (typeof form.reportValidity === 'function') {
            form.reportValidity();
          }
          return;
        }
      }

      if (!requireConfirm) {
        if (onConfirm) {
          onConfirm(e);
        } else if (onClick) {
          onClick(e);
        } else if (type === 'submit' && form) {
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    };

    return (
      <>
        <Button
          ref={internalRef}
          type={type}
          variant={variant}
          size={size}
          className={className}
          disabled={disabled}
          onClick={handleTriggerClick}
          {...props}
        >
          {children}
        </Button>

        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          confirmTitle={confirmTitle}
          confirmMessage={confirmMessage}
          confirmText={confirmLabel || confirmText}
          cancelText={cancelText}
          confirmVariant={confirmVariant}
          dialogVariant={resolvedDialogVariant}
          onConfirm={async (e) => {
            const action = onConfirm || onClick;
            if (action) {
              const res = action(e);
              if (res && typeof (res as Promise<unknown>).then === 'function') {
                await res;
              }
            } else if (type === 'submit' && internalRef.current?.form) {
              const form = internalRef.current.form;
              if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
              } else {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }
          }}
          confirmContent={confirmContent}
          dialogSize={dialogSize}
          confirmTestId={confirmTestId}
        />
      </>
    );
  }
);

ConfirmButton.displayName = 'ConfirmButton';
