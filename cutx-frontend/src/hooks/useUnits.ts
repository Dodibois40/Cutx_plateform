import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Unit system type for dimension display
 * - 'mm': Metric system (millimeters)
 * - 'in': Imperial system (inches)
 */
export type UnitSystem = 'mm' | 'in';

/**
 * Conversion factor: 1 inch = 25.4 millimeters
 */
const MM_PER_INCH = 25.4;

interface UnitsState {
  /** Current unit system */
  unit: UnitSystem;

  /** Set the unit system */
  setUnit: (unit: UnitSystem) => void;

  /** Convert millimeters to display value (mm or inches) */
  toDisplay: (mm: number) => number;

  /** Convert display value back to millimeters */
  toMm: (value: number) => number;

  /**
   * Format a dimension in mm for display
   * - mm: "1234 mm"
   * - in: "48.58″"
   */
  formatDimension: (mm: number) => string;

  /**
   * Format dimensions with label
   * @param mm - value in millimeters
   * @param label - optional label (e.g., "L", "l", "ep")
   * @returns formatted string like "L: 1234 mm" or "L: 48.58″"
   */
  formatWithLabel: (mm: number, label?: string) => string;
}

/**
 * Zustand store for managing unit preferences
 * Persisted to localStorage under 'cutx-units' key
 */
export const useUnits = create<UnitsState>()(
  persist(
    (set, get) => ({
      unit: 'mm',

      setUnit: (unit) => set({ unit }),

      toDisplay: (mm) => {
        if (get().unit === 'in') {
          return mm / MM_PER_INCH;
        }
        return mm;
      },

      toMm: (value) => {
        if (get().unit === 'in') {
          return value * MM_PER_INCH;
        }
        return value;
      },

      formatDimension: (mm) => {
        const { unit, toDisplay } = get();
        const val = toDisplay(mm);

        if (unit === 'in') {
          // Display with 2 decimals and inch symbol
          return `${val.toFixed(2)}\u2033`;
        }

        // Display as integer with mm suffix
        return `${Math.round(val)} mm`;
      },

      formatWithLabel: (mm, label) => {
        const formatted = get().formatDimension(mm);
        if (label) {
          return `${label}: ${formatted}`;
        }
        return formatted;
      },
    }),
    {
      name: 'cutx-units',
      // Only persist the unit preference, not the functions
      partialize: (state) => ({ unit: state.unit }),
    }
  )
);
