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
 * 1. Company Name (DNS DISTRIBUTION)
 * 2. Product Name (Truncated cleanly, high legibility)
 * 3. SKU & Unit Number
 * 4. Code 128 Barcode with quiet zones
 * 5. Barcode Alphanumeric Value
 * 6. Serial Number (Dynamically shown ONLY if unit is serialized)
 */
export const BarcodeSticker: React.FC<BarcodeStickerProps> = ({
  companyName = 'DNS DISTRIBUTION',
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
  // 50mm x 30mm total label: 30mm = ~113px at 96 DPI, ~240px at 203 DPI, ~354px at 300 DPI.
  const barcodeHeight = hasSerial ? 28 : 34;

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
      {/* 1. Header: Company Name & SKU/Unit Tag */}
      <div className="w-full flex items-center justify-between border-b border-black/80 pb-[1px] px-[0.5mm]">
        <span className="font-extrabold uppercase tracking-wider text-[8px] sm:text-[8.5px] leading-tight truncate text-black">
          {companyName}
        </span>
        {unitCaption && (
          <span className="font-mono font-bold text-[7px] sm:text-[7.5px] text-black shrink-0 ml-1">
            {unitCaption}
          </span>
        )}
      </div>

      {/* 2. Product Name & SKU */}
      <div className="w-full px-[0.5mm] my-[0.5mm]">
        <div
          className="font-bold text-[8.5px] sm:text-[9px] text-black leading-tight line-clamp-1 truncate"
          title={productName}
        >
          {productName}
        </div>
        <div className="flex items-center justify-between text-[7px] sm:text-[7.5px] font-mono text-black/90 font-semibold mt-[1px]">
          <span className="truncate">SKU: {sku}</span>
          {batchNumber && <span className="shrink-0 ml-1">BATCH: {batchNumber}</span>}
        </div>
      </div>

      {/* 3. Barcode (Code 128 SVG) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden my-[0.5mm]">
        <svg
          viewBox={`0 0 ${codeData.totalModules} ${barcodeHeight}`}
          className="w-[94%] h-[26px] sm:h-[30px] block overflow-hidden"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          aria-label={`Barcode: ${unitBarcode}`}
          role="img"
        >
          <path d={pathD} fill="#000000" />
        </svg>

        {/* 4. Barcode Numeric/Alphanumeric caption directly underneath */}
        <span className="font-mono font-bold text-[8px] sm:text-[8.5px] text-black tracking-widest mt-[1px] truncate max-w-full">
          {unitBarcode}
        </span>
      </div>

      {/* 5. Serial Number (Rendered ONLY if unit is serialized) */}
      {hasSerial ? (
        <div className="w-full border-t border-black/80 pt-[1px] flex items-center justify-center px-[0.5mm]">
          <span className="font-mono font-extrabold text-[7.5px] sm:text-[8px] text-black tracking-wider truncate">
            SN: {serialNumber}
          </span>
        </div>
      ) : poNumber ? (
        <div className="w-full border-t border-dashed border-black/40 pt-[1px] flex items-center justify-between text-[6.5px] sm:text-[7px] font-mono text-black/75 px-[0.5mm]">
          <span className="truncate">PO: {poNumber}</span>
          <span>INTAKE OK</span>
        </div>
      ) : null}
    </div>
  );
};
