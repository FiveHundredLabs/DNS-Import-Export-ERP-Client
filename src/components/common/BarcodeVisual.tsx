import React from 'react';

export interface BarcodeVisualProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  serialNumber?: string;
}

/**
 * Deterministic SVG Barcode Renderer
 * Converts string into Code-128 styled vertical bar patterns with human readable caption.
 * Displays serial number directly below the barcode when available.
 * Automatically constrained with max-w-full to prevent horizontal layout overflow.
 */
export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  value,
  width = 160,
  height = 48,
  showText = true,
  className = '',
  barColor = '#0f172a',
  serialNumber,
}) => {
  // Deterministic bar widths derived from string characters
  const bars = React.useMemo(() => {
    const pattern: number[] = [2, 1, 1, 2]; // Start quiet zone & guard
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      pattern.push(((code * 3) % 4) + 1);
      pattern.push(((code * 7) % 3) + 1);
      pattern.push(((code * 5) % 2) + 1);
      pattern.push(1);
    }
    pattern.push(2, 1, 2); // Stop guard
    return pattern;
  }, [value]);

  const totalUnits = bars.reduce((acc, w) => acc + w, 0);
  const barSvgElements: React.ReactNode[] = [];
  let currentX = 0;

  bars.forEach((w, idx) => {
    const isBar = idx % 2 === 0;
    if (isBar) {
      barSvgElements.push(
        <rect
          key={idx}
          x={currentX}
          y={0}
          width={w}
          height={height}
          fill={barColor}
        />
      );
    }
    currentX += w;
  });

  return (
    <div className={`inline-flex flex-col items-center select-none max-w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${totalUnits} ${height}`}
        style={{ width: width ? `${width}px` : '100%', maxWidth: '100%', height: `${height}px` }}
        className="overflow-hidden"
        preserveAspectRatio="none"
        aria-label={`Barcode: ${value}`}
        role="img"
      >
        {barSvgElements}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-wider text-slate-700 mt-1 font-semibold truncate max-w-full text-center">
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
