/**
 * Confidence Normalization Utility
 * 
 * Canonical internal representation: 0.0 to 1.0 (decimal)
 * Frontend display: 0 to 100 (%)
 * 
 * This utility ensures consistent confidence handling across the entire application.
 * Fixes the bug where confidence values like 0.88 were being multiplied by 100 twice,
 * resulting in impossible values like 8800%.
 */

/**
 * Normalize confidence to canonical 0.0-1.0 range
 * Handles various input formats:
 * - Already normalized: 0.88 -> 0.88
 * - Percentage integer: 88 -> 0.88
 * - Percentage float: 88.5 -> 0.885
 * - Out of range percentage: 8800 -> 0.88 (detected as already scaled)
 * - Invalid values are clamped
 */
export function normalizeConfidence(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }

  // If value is already in 0-1 range, return as-is
  if (value >= 0 && value <= 1) {
    return Math.max(0, Math.min(1, value));
  }

  // If value is in 0-100 range, convert to 0-1
  if (value > 1 && value <= 100) {
    return value / 100;
  }

  // If value is > 100, it's likely already been incorrectly multiplied
  // Normalize by dividing by 100 until it's in valid range
  let normalized = value;
  while (normalized > 1) {
    normalized = normalized / 100;
  }
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Convert canonical 0.0-1.0 confidence to display percentage (0-100)
 */
export function confidenceToPercent(value: number | undefined | null): number {
  const normalized = normalizeConfidence(value);
  return Math.round(normalized * 100);
}

/**
 * Convert canonical confidence to display string with % sign
 */
export function confidenceToPercentString(value: number | undefined | null): string {
  return `${confidenceToPercent(value)}%`;
}

/**
 * Validate confidence is within acceptable bounds
 */
export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1;
}

/**
 * Confidence display component props
 */
export interface ConfidenceDisplayProps {
  value: number | undefined | null;
  showPercentSign?: boolean;
  precision?: number;
  className?: string;
}

/**
 * Hook for consistent confidence formatting
 */
export function useConfidence(value: number | undefined | null) {
  return {
    normalized: normalizeConfidence(value),
    percent: confidenceToPercent(value),
    percentString: confidenceToPercentString(value),
    isValid: isValidConfidence(normalizeConfidence(value)),
  };
}