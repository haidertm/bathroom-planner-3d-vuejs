// src/constants/index.ts
// Barrel export for all constants

// Camera constants
export {
  LOOK_AT,
  CAMERA_SETTINGS,
  CAMERA_CONTROLS,
  CAMERA_PRESETS,
  ORTHOGRAPHIC_SETTINGS,
  type ViewMode
} from './camera'

// Component constants
export {
  COMPONENTS,
  COMPONENT_DEFAULTS,
  type ComponentType,
  type ComponentDefaults
} from './components'

// Dimension constants
export {
  ROOM_DEFAULTS,
  SHAPE_DEFAULTS,
  WALL_SETTINGS,
  CONSTRAINTS,
  SCALE_LIMITS,
  HEIGHT_LIMITS,
  MEASUREMENT_SETTINGS,
  getShapeDefaultDimensions,
  saveRoomDimensionsToStorage,
  loadRoomDimensionsFromStorage,
  type RoomDefaults,
  type WallType,
  type RoomShape,
  type ShapeDimensions,
  type WallSettings,
  type Constraints as DimensionConstraints,
  type ScaleLimits,
  type HeightLimits
} from './dimensions'

// Filter constants
export {
  RANGE_FILTERS,
  CATEGORY_FILTER_CONFIG,
  FILTER_LABELS,
  EMPTY_FILTERS,
  getPrimaryFilters,
  getSecondaryFilters,
  getAvailableFilters,
  getFilterLabel,
  createEmptyFilters,
  isRangeFilter,
  type FilterOption,
  type RangeFilterKey,
  type SelectedFilters,
  type CategoryFilters,
  type CategoryFilterConfig
} from './filters'

// Model constants
export {
  CONFIG,
  DEFAULT_ORIENTATION,
  DefaultCornerObjectRotation,
  WALL_ROTATIONS,
  type OrientationType,
  type OrientationConfig,
  type cornerInstallOnly,
  type MovementConfig,
  type ModelConfig,
  type FixtureConfig
} from './models'

// Schematic pattern constants
export {
  SCHEMATIC_SKU_PATTERNS,
  getSchematicTypeFromSku,
  type SchematicType,
  type SkuPatternConfig
} from './schematicPatterns'

// Template constants
export {
  TEMPLATES,
  getTemplateById,
  getAllTemplates,
  type TemplateItem,
  type TemplateConfig
} from './templates'

// Texture constants
export {
  FLOOR_TEXTURES,
  WALL_TEXTURES,
  DEFAULT_FLOOR_TEXTURE,
  DEFAULT_WALL_TEXTURE,
  LIGHTING_PRESETS,
  CAMERA_SETTINGS as TEXTURE_CAMERA_SETTINGS,
  RENDERER_SETTINGS,
  MATERIAL_QUALITY,
  ROOM_DEFAULTS as TEXTURE_ROOM_DEFAULTS,
  CONSTRAINTS as TEXTURE_CONSTRAINTS,
  POST_PROCESSING,
  type TextureConfig
} from './textures'
