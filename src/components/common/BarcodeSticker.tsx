import React, { useMemo } from 'react';
import { encodeCode128, generateCode128SvgPath } from '../../utils/code128';
import { cn } from '../../utils/cn';

export interface BarcodeStickerProps {
  companyName?: string;
  productName: string;
  sku: string;
  unitBarcode: string;
  serialNumber?: string;
  unitIndex?: number;
  totalUnits?: number;
  batchNumber?: string;
  poNumber?: string;
  previewMode?: boolean; // If true, applies screen UI card styling; if false, pure thermal print formatting
  className?: string;
}

/**
 * Standard 50mm × 30mm Unit-Wise Barcode Sticker
 * Engineered for commercial thermal label printers (203 & 300 DPI) and ERP screen previews.
 *
 * Visual hierarchy:
 * 1. Company Name (DNS Import and Export (Pvt) Ltd)
 * 2. Product Name (Centered, high legibility)
 * 3. SKU (Center-aligned below Product Name)
 * 4. Code 128 Barcode with quiet zones
 * 5. Barcode Alphanumeric Value
 * 6. Serial Number (Directly below barcode if serialized)
 * 7. Unit Counter (Visible in application preview only; excluded from print)
 */
export const BarcodeSticker: React.FC<BarcodeStickerProps> = ({
  companyName = 'DNS Import and Export (Pvt) Ltd',
  productName,
  sku,
  unitBarcode,
  serialNumber,
  unitIndex,
  totalUnits,
  batchNumber,
  poNumber,
  previewMode = false,
  className = '',
}) => {
  const hasSerial = Boolean(serialNumber && serialNumber.trim().length > 0);

  // Barcode height dynamically expands when no serial number is present
  const barcodeHeight = hasSerial ? 26 : 32;

  const codeData = useMemo(() => {
    return encodeCode128(unitBarcode, 10);
  }, [unitBarcode]);

  const pathD = useMemo(() => {
    return generateCode128SvgPath(codeData, barcodeHeight);
  }, [codeData, barcodeHeight]);

  const unitCaption =
    typeof unitIndex === 'number' && typeof totalUnits === 'number'
      ? `Unit ${unitIndex}/${totalUnits}`
      : typeof unitIndex === 'number'
      ? `Unit #${unitIndex}`
      : null;

  return (
    <div
      className={cn(
        'barcode-sticker-label bg-white text-black font-sans box-border select-none overflow-hidden flex flex-col justify-between items-center text-center leading-none',
        // In preview mode on screen, simulate the 50mm x 30mm physical label with subtle border & shadow
        previewMode
          ? 'w-full max-w-[240px] aspect-[50/30] p-2 rounded-lg border border-slate-300 shadow-2xs hover:shadow-xs transition-shadow'
          : 'w-[50mm] h-[30mm] max-w-[50mm] max-h-[30mm] p-[1.5mm] break-after-page print:m-0',
        className
      )}
      style={{
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* 1. Header: Company Name (Unit counter moved outside sticker card; company name scaled down to prevent truncation) */}
      <div className="w-full flex items-center justify-center border-b border-black/80 pb-[1px] px-[0.5mm] text-center">
        <span className="font-extrabold uppercase tracking-tight text-[6.5px] sm:text-[7px] leading-tight truncate text-black text-center">
          {companyName}
        </span>
      </div>

      {/* 2. Product Name & SKU (Center-aligned) */}
      <div className="w-full px-[0.5mm] my-[0.5mm] text-center">
        <div
          className="font-bold text-[8.5px] sm:text-[9px] text-black leading-tight line-clamp-1 truncate text-center"
          title={productName}
        >
          {productName}
        </div>
        <div className="flex items-center justify-center text-[7px] sm:text-[7.5px] font-mono text-black/90 font-semibold mt-[1px] text-center">
          <span className="truncate">SKU: {sku}</span>
          {batchNumber && <span className="shrink-0 ml-1.5">&bull; BATCH: {batchNumber}</span>}
        </div>
      </div>

      {/* 3. Barcode (Code 128 SVG) + Barcode Number + Serial Number directly below */}
      <div className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden my-[0.5mm]">
        <svg
          viewBox={`0 0 ${codeData.totalModules} ${barcodeHeight}`}
          className="w-[94%] h-[24px] sm:h-[28px] block overflow-hidden"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          aria-label={`Barcode: ${unitBarcode}`}
          role="img"
        >
          <path d={pathD} fill="#000000" />
        </svg>

        {/* Barcode Numeric/Alphanumeric caption directly underneath */}
        <span className="font-mono font-bold text-[7.5px] sm:text-[8px] text-black tracking-widest mt-[0.5mm] truncate max-w-full">
          {unitBarcode}
        </span>

        {/* Serial Number directly below barcode */}
        {hasSerial && (
          <span className="font-mono font-extrabold text-[7.5px] sm:text-[8px] text-black tracking-wider mt-[0.5mm] truncate max-w-full">
            SN: {serialNumber}
          </span>
        )}
      </div>

      {/* Optional fallback footer if PO present and non-serialized */}
      {!hasSerial && poNumber && (
        <div className="w-full border-t border-dashed border-black/40 pt-[1px] flex items-center justify-between text-[6.5px] sm:text-[7px] font-mono text-black/75 px-[0.5mm]">
          <span className="truncate">PO: {poNumber}</span>
          <span>INTAKE OK</span>
        </div>
      )}
    </div>
  );
};
