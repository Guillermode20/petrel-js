export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Parses a standard HTTP Range header for byte ranges.
 * Supports prefix (bytes=500-), suffix (bytes=-500), and exact ranges.
 */
export function parseRangeHeader(header: string | null, size: number): ByteRange | null {
  if (!header || !header.startsWith('bytes=')) {
    return null;
  }

  const value = header.slice('bytes='.length);
  const [startPart, endPart] = value.split('-', 2);

  let start = startPart ? Number.parseInt(startPart, 10) : Number.NaN;
  let end = endPart ? Number.parseInt(endPart, 10) : Number.NaN;

  if (Number.isNaN(start)) {
    if (Number.isNaN(end)) {
      return null;
    }
    // Suffix range "bytes=-500" means last N bytes
    const suffixLength = Math.min(end, size);
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }

  if (start < 0 || end < start || start >= size) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}
