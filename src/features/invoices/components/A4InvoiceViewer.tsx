import React, { useState, useRef, useEffect } from 'react';
import { Invoice } from '../../../types/invoice';
import { StandardInvoiceTemplate } from './StandardInvoiceTemplate';
import { IrdTaxInvoiceTemplate } from './IrdTaxInvoiceTemplate';
import { printerService } from '../../../services/PrinterService';
import { pdfService } from '../../../services/PdfService';
import { whatsAppService } from '../../../services/WhatsAppService';
import { Button } from '../../../components/ui/button';
import {
  Printer,
  Download,
  Send,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export type InvoiceFormatType = 'STANDARD' | 'IRD_TAX';

interface A4InvoiceViewerProps {
  invoice: Invoice;
  initialFormat?: InvoiceFormatType;
  showToolbarActions?: boolean;
  className?: string;
}

export function A4InvoiceViewer({
  invoice,
  initialFormat = 'STANDARD',
  showToolbarActions = true,
  className,
}: A4InvoiceViewerProps) {
  const [format, setFormat] = useState<InvoiceFormatType>(initialFormat);
  const [zoomMode, setZoomMode] = useState<'fit' | '75' | '100' | '125'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for responsive A4 scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateWidth);
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Standard A4 dimensions at 96 DPI: 794px width x 1123px height (210mm x 297mm)
  const a4BaseWidth = 794;
  const a4BaseHeight = 1123;

  // Calculate effective scale
  let scale = 1;
  if (zoomMode === 'fit') {
    if (containerWidth > 0) {
      // Auto-fit to viewport width with padding
      scale = Math.min(1, Math.max(0.25, (containerWidth - 16) / a4BaseWidth));
    }
  } else if (zoomMode === '75') {
    scale = 0.75;
  } else if (zoomMode === '100') {
    scale = 1.0;
  } else if (zoomMode === '125') {
    scale = 1.25;
  }

  const handlePrint = () => {
    printerService.printInvoice(invoice, format);
  };

  const handleDownloadPdf = () => {
    pdfService.downloadInvoicePdf(invoice, format);
  };

  const handleShareWhatsApp = () => {
    whatsAppService.shareInvoice(invoice);
  };

  return (
    <div className={cn('w-full flex flex-col items-center space-y-4', className)}>
      {/* Top Document Controls Toolbar (No-Print) */}
      {showToolbarActions && (
        <div className="w-full no-print bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Format Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFormat('STANDARD')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  format === 'STANDARD'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Commercial Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('IRD_TAX')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  format === 'IRD_TAX'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <ShieldCheck className={cn('h-3.5 w-3.5', format === 'IRD_TAX' ? 'text-emerald-400' : 'text-emerald-600')} />
                <span>IRD Tax Invoice (Sri Lanka)</span>
              </button>
            </div>

            {/* Document Actions: Print, Download, Share */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-3 text-xs gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
                title="Print A4 Document"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Invoice</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                className="h-9 px-3 text-xs gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
                title="Download A4 PDF"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-9 px-3 text-xs gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800"
                title="Share via WhatsApp"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Share WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Secondary Toolbar: Zoom Controls & A4 Info */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                A4 (210 × 297 mm)
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline text-[11px]">
                {format === 'STANDARD' ? 'Standard Wholesale Layout' : 'Sri Lanka Inland Revenue Department (IRD) Form'}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1',
                  zoomMode === 'fit' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                )}
                title="Fit to Screen Width"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Fit</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomMode('75')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                  zoomMode === '75' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                )}
              >
                75%
              </button>

              <button
                type="button"
                onClick={() => setZoomMode('100')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                  zoomMode === '100' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                )}
                title="Actual 100% Reading Size"
              >
                100%
              </button>

              <button
                type="button"
                onClick={() => setZoomMode('125')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                  zoomMode === '125' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                )}
              >
                125%
              </button>

              <button
                type="button"
                onClick={() => {
                  if (zoomMode === 'fit') setZoomMode('75');
                  else if (zoomMode === '75') setZoomMode('100');
                  else if (zoomMode === '100') setZoomMode('125');
                }}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/60 transition-all"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (zoomMode === '125') setZoomMode('100');
                  else if (zoomMode === '100') setZoomMode('75');
                  else if (zoomMode === '75') setZoomMode('fit');
                }}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/60 transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A4 Document Stage Area (Grey Canvas background like PDF viewer) */}
      <div
        ref={containerRef}
        className="w-full bg-slate-200/70 p-3 sm:p-6 md:p-8 rounded-2xl border border-slate-300/80 overflow-x-auto overflow-y-visible flex justify-center items-start min-h-[600px]"
      >
        {/* Scaled Wrapper: scales 794px A4 sheet down or up smoothly */}
        <div
          style={{
            width: `${a4BaseWidth * scale}px`,
            height: `${a4BaseHeight * scale}px`,
            position: 'relative',
            flexShrink: 0,
            transition: 'width 0.15s ease, height 0.15s ease',
          }}
        >
          {/* Authentic A4 Document Sheet: 794px x 1123px (210mm x 297mm) */}
          <div
            className="a4-print-document bg-white rounded-sm shadow-xl border border-slate-300/90 text-slate-900 overflow-hidden box-border"
            style={{
              width: `${a4BaseWidth}px`,
              minHeight: `${a4BaseHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              padding: '36px 42px',
            }}
          >
            {format === 'STANDARD' ? (
              <StandardInvoiceTemplate invoice={invoice} />
            ) : (
              <IrdTaxInvoiceTemplate invoice={invoice} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
