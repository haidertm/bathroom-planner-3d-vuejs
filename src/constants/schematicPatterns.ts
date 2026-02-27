/**
 * SKU Pattern Configuration for 2D Schematic Type Detection
 *
 * This file defines SKU patterns used as fallback logic when ComponentType
 * metadata is not available on a model. These patterns match against product
 * SKUs to determine the appropriate schematic representation in 2D view.
 *
 * MAINTENANCE NOTES:
 * - Add new patterns here when introducing products with non-standard SKU formats
 * - Each pattern should have a clear comment explaining its source/meaning
 * - Patterns are checked in order; more specific patterns should come first
 */

export type SchematicType =
  | 'shower'
  | 'mirror'
  | 'bath'
  | 'toilet'
  | 'sink'
  | 'radiator'
  | 'furniture'
  | 'door'
  | 'generic';

/**
 * Door configuration for swing direction and hinge side
 */
export interface DoorConfig {
  hingeSide: 'left' | 'right';
  swingDirection: 'inward' | 'outward';
}

/**
 * Default door configuration
 */
export const DEFAULT_DOOR_CONFIG: DoorConfig = {
  hingeSide: 'left',
  swingDirection: 'inward'
};

/**
 * Defines how a SKU pattern should be matched against product SKUs
 */
export interface SkuPatternConfig {
  /**
   * The pattern string to match against SKUs
   */
  pattern: string;

  /**
   * Match mode:
   * - 'includes': SKU contains the pattern anywhere (e.g., 'abc-c46-xyz' matches 'c46')
   * - 'startsWith': SKU starts with the pattern (e.g., '73-mirror' matches '73')
   */
  matchMode: 'includes' | 'startsWith';

  /**
   * The schematic type to return when this pattern matches
   */
  schematicType: SchematicType;

  /**
   * Human-readable description of what this pattern matches.
   * Used for documentation and debugging purposes.
   */
  description: string;
}

/**
 * SKU patterns for schematic type fallback detection.
 *
 * These patterns are used when model.userData.type (ComponentType) is not set
 * or doesn't match a known fixture type. The patterns are checked in order,
 * so more specific patterns should be listed before general ones.
 *
 * Pattern Sources:
 * - 'c46': Shower enclosure product line from supplier catalog
 * - '73': Mirror product SKU prefix from Bathroom Mountain inventory
 * - 'c51': Bath/bathtub product line from supplier catalog
 */
export const SCHEMATIC_SKU_PATTERNS: readonly SkuPatternConfig[] = [
  {
    pattern: 'c46',
    matchMode: 'includes',
    schematicType: 'shower',
    description: 'Shower enclosure product line (supplier catalog prefix)',
  },
  {
    pattern: '73',
    matchMode: 'startsWith',
    schematicType: 'mirror',
    description: 'Mirror product SKU prefix (Bathroom Mountain inventory)',
  },
  {
    pattern: 'c51',
    matchMode: 'includes',
    schematicType: 'bath',
    description: 'Bath/bathtub product line (supplier catalog prefix)',
  },
] as const;

/**
 * Attempts to determine schematic type from a product SKU using pattern matching.
 *
 * @param sku - The product SKU to check (case-insensitive)
 * @param patterns - Optional custom patterns array (defaults to SCHEMATIC_SKU_PATTERNS)
 * @returns The matched SchematicType or null if no pattern matches
 *
 * @example
 * ```typescript
 * getSchematicTypeFromSku('C46-SHOWER-001') // returns 'shower'
 * getSchematicTypeFromSku('73-ROUND-MIRROR') // returns 'mirror'
 * getSchematicTypeFromSku('UNKNOWN-SKU')    // returns null
 * ```
 */
export function getSchematicTypeFromSku(
  sku: string,
  patterns: readonly SkuPatternConfig[] = SCHEMATIC_SKU_PATTERNS
): SchematicType | null {
  if (!sku) {
    return null;
  }

  const normalizedSku = sku.toLowerCase();

  for (const config of patterns) {
    const pattern = config.pattern.toLowerCase();

    switch (config.matchMode) {
      case 'includes':
        if (normalizedSku.includes(pattern)) {
          return config.schematicType;
        }
        break;
      case 'startsWith':
        if (normalizedSku.startsWith(pattern)) {
          return config.schematicType;
        }
        break;
    }
  }

  return null;
}
