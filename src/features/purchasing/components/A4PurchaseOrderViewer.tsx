import React, { useState, useRef, useEffect } from 'react';
import { PurchaseOrder } from '../../../types/purchasing';
import { StandardPurchaseOrderTemplate } from './StandardPurchaseOrderTemplate';
import { paginatePurchaseOrder } from '../utils/purchaseOrderPaginator';
import { pdfService } from '../../../services/PdfService';
import { Button } from '../../../components/ui/button';
import {
  Printer,
  Download,
  FileText,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useNavigate } from 'react-router-dom';

interface A4PurchaseOrderViewerProps {
  purchaseOrder: PurchaseOrder;
  showToolbarActions?: boolean;
  className?: string;
  onBack?: () => void;
}

export function A4PurchaseOrderViewer({
  purchaseOrder,
  showToolbarActions = true,
  className,
  onBack,
}: A4PurchaseOrderViewerProps) {
  const navigate = useNavigate();
  const [zoomMode, setZoomMode] = useState<'fit' | '75' | '100' | '125'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const pages = paginatePurchaseOrder(purchaseOrder);
  const totalPages = pages.length;

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
      window.removeEventListener('resize', updateWidth);
      if (observer) observer.disconnect();
    };
  }, []);

  const A4_WIDTH_PX = 794;

  const calculateScale = (): number => {
    if (zoomMode === '75') return 0.75;
    if (zoomMode === '100') return 1.0;
    if (zoomMode === '125') return 1.25;

    // 'fit' mode: responsive calculation based on container width
    if (containerWidth <= 0) return 1.0;
    const horizontalPadding = 32; // 16px each side
    const availableWidth = containerWidth - horizontalPadding;
    const fitScale = availableWidth / A4_WIDTH_PX;
    return Math.min(fitScale, 1.0);
  };

  const scale = calculateScale();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    pdfService.downloadPurchaseOrderPdf(purchaseOrder);
  };

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {/* Document Control Toolbar (Excluded from physical print) */}
      {showToolbarActions && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs mb-4 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to PO</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/purchasing/orders')}
                className="gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Button>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 font-mono">
                {purchaseOrder.poNumber}
              </span>
            </div>

            {/* Multi-page badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-light text-primary border border-primary-border">
              <Layers className="h-3 w-3" />
              {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} (A4)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={cn(
                  'px-2 py-1 rounded font-medium transition-colors text-[11px]',
                  zoomMode === 'fit'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Fit to screen width"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('75')}
                className={cn(
                  'px-2 py-1 rounded font-medium transition-colors text-[11px]',
                  zoomMode === '75'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('100')}
                className={cn(
                  'px-2 py-1 rounded font-medium transition-colors text-[11px]',
                  zoomMode === '100'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('125')}
                className={cn(
                  'px-2 py-1 rounded font-medium transition-colors text-[11px]',
                  zoomMode === '125'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                125%
              </button>
            </div>

            {/* Print & PDF Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-300"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print A4</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              className="gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </Button>
          </div>
        </div>
      )}

      {/* Multi-Page A4 Scrollable Viewport */}
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center overflow-x-auto py-4 px-1 bg-slate-100/70 rounded-2xl border border-slate-200/80 min-h-[600px] print:bg-white print:border-0 print:p-0 print:rounded-none"
      >
        <div
          id="printable-po-document"
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top center',
          }}
          className="transition-transform duration-150 ease-out print:transform-none"
        >
          <StandardPurchaseOrderTemplate purchaseOrder={purchaseOrder} />
        </div>
      </div>
    </div>
  );
}
