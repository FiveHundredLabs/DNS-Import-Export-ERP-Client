import React from 'react';
import { Invoice } from '../../../types/invoice';
import { A4InvoiceViewer, InvoiceFormatType } from './A4InvoiceViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { FileText, X } from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  initialFormat?: InvoiceFormatType;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  initialFormat = 'STANDARD',
}: InvoicePreviewModalProps) {
  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="2xl" className="max-w-5xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
      <DialogContent className="space-y-4">
        <DialogHeader className="p-0 pb-2 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                  A4 Invoice Document Preview
                </DialogTitle>
                <p className="text-xs text-slate-500 font-mono">
                  {invoice.invoiceNumber} • {invoice.customerName}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Full A4 Document Viewer */}
        <A4InvoiceViewer invoice={invoice} initialFormat={initialFormat} showToolbarActions={true} />
      </DialogContent>
    </Dialog>
  );
}
