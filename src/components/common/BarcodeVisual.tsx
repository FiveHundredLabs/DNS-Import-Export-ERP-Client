import React from 'react';
import { encodeCode128, generateCode128SvgPath } from '../../utils/code128';

export interface BarcodeVisualProps {
  value: string;
  width?: number | string;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  serialNumber?: string;
}

/**
 * Standard ISO/IEC 15417 Code-128 Barcode Renderer
 * Produces authentic, scannable Code-128 barcodes with quiet zones.
 * Displays serial number directly below the barcode when available.
 */
export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  value,
  width = 160,
  height = 44,
  showText = true,
  className = '',
  barColor = '#000000',
  serialNumber,
}) => {
  const codeData = React.useMemo(() => {
    return encodeCode128(value, 10);
  }, [value]);

  const pathD = React.useMemo(() => {
    return generateCode128SvgPath(codeData, height);
  }, [codeData, height]);

  return (
    <div className={`inline-flex flex-col items-center select-none max-w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${codeData.totalModules} ${height}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '100%',
          height: `${height}px`,
        }}
        className="overflow-hidden block"
        preserveAspectRatio="none"
        aria-label={`Barcode: ${value}`}
        role="img"
      >
        <path d={pathD} fill={barColor} shapeRendering="crispEdges" />
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-wider text-slate-800 mt-1 font-semibold truncate max-w-full text-center">
          {value}
        </span>
      )}
      {serialNumber && (
        <span className="font-mono text-[9px] font-bold text-indigo-950 tracking-wider text-center mt-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded">
          SN: {serialNumber}
        </span>
      )}
    </div>
  );
};
