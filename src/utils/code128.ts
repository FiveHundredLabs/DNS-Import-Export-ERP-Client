/**
 * Standard ISO/IEC 15417 Code 128 Barcode Generator
 * Encodes alphanumeric strings into standard Code 128B bar/space patterns.
 * Supports high-density 1D optical scanning with standard quiet zones.
 */

// Official Code 128 bar and space widths (107 symbols)
// Each symbol has 6 elements (summing to 11 units), except Stop code 106 which has 7 elements (13 units).
export const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131',
  '211412', // 103: Start A
  '211214', // 104: Start B
  '211232', // 105: Start C
  '2331112', // 106: Stop (7 elements)
];

export interface Code128Bar {
  x: number;
  width: number;
  isBar: boolean;
}

export interface Code128Data {
  bars: Code128Bar[];
  totalModules: number;
  patternString: string;
}

/**
 * Encodes ASCII string into Code 128B module widths.
 * Automatically computes modulo-103 checksum and adds quiet zones.
 */
export function encodeCode128(text: string, quietZoneModules: number = 10): Code128Data {
  const clean = text || '';
  const codes: number[] = [104]; // Start B
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    // Code 128B maps ASCII 32..126 to symbol values 0..94
    let val = charCode - 32;
    if (val < 0 || val > 95) {
      val = 0; // fallback to space if unsupported
    }
    codes.push(val);
    checksum += val * (i + 1);
  }

  const checkCode = checksum % 103;
  codes.push(checkCode);
  codes.push(106); // Stop code

  const bars: Code128Bar[] = [];
  let currentX = quietZoneModules;

  // Initial quiet zone
  let isBar = true;
  let patternString = '';

  for (let cIdx = 0; cIdx < codes.length; cIdx++) {
    const pattern = CODE128_PATTERNS[codes[cIdx]];
    patternString += pattern;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      bars.push({
        x: currentX,
        width,
        isBar,
      });
      currentX += width;
      isBar = !isBar;
    }
  }

  // Total modules including left & right quiet zones
  const totalModules = currentX + quietZoneModules;

  return {
    bars: bars.filter((b) => b.isBar),
    totalModules,
    patternString,
  };
}

/**
 * Generates an SVG path string for Code 128 bars.
 */
export function generateCode128SvgPath(data: Code128Data, height: number): string {
  return data.bars
    .map((bar) => `M${bar.x},0 h${bar.width} v${height} h-${bar.width} Z`)
    .join(' ');
}

