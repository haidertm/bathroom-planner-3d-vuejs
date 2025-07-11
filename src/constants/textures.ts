export interface TextureConfig {
  readonly name: string;
  readonly file: string;
  readonly color: number; // Hex color value
  readonly scale: readonly [number, number]; // [x, y] scaling
}

// Custom texture definitions - supports both files and colors
export const FLOOR_TEXTURES: readonly TextureConfig[] = [
  { name: 'White Tile', file: '', color: 0xf8f8f8, scale: [4, 4] },
  { name: 'Gray Tile', file: '/textures/floor_grey_tile.avif', color: 0xd0d0d0, scale: [4, 4] },
  { name: 'Metropolis Star', file: '/textures/floor_metropolis_star_black.webp', color: 0xf5f5dc, scale: [6, 6] },
  { name: 'Dark Tile', file: '', color: 0x606060, scale: [4, 4] },
  { name: 'Wood', file: '', color: 0xd2b48c, scale: [3, 3] },
  { name: 'Red Terracotta', file: '/textures/floor_red_terracotta.jpg', color: 0xffffff, scale: [4, 4] },
  { name: 'Stone', file: '', color: 0x888888, scale: [2, 2] }
];

export const WALL_TEXTURES: readonly TextureConfig[] = [
  { name: 'Metro White Tile', file: '/textures/wall_metro_white_tile.png', color: 0xffffff, scale: [20, 12] },
  { name: 'White Paint', file: '', color: 0xffffff, scale: [1, 1] },
  { name: 'Light Blue', file: '', color: 0xe6f3ff, scale: [1, 1] },
  { name: 'Beige', file: '', color: 0xf5f5dc, scale: [1, 1] },
  { name: 'White Tile', file: '', color: 0xf8f8f8, scale: [4, 4] },
  { name: 'Blue Tile', file: '', color: 0xb0d4f1, scale: [4, 4] },
  { name: 'Green Tile', file: '', color: 0xc8e6c9, scale: [4, 4] },
  { name: 'Brick', file: '/textures/wall_brick.jpg', color: 0xcc6666, scale: [6, 4] },
  { name: 'Subway Tile', file: '', color: 0xf0f0f0, scale: [8, 6] }
];

export const DEFAULT_FLOOR_TEXTURE: number = 0; // Wood
export const DEFAULT_WALL_TEXTURE: number = 1; // Brick


// Enhanced lighting constants
export const LIGHTING_PRESETS = {
  NATURAL: {
    ambient: { color: 0xffffff, intensity: 0.4 },
    main: { color: 0xffffff, intensity: 0.8, position: [10, 15, 5] },
    fill: { color: 0xffffff, intensity: 0.3, position: [-5, 10, -5] },
    ceiling: { color: 0xffffff, intensity: 0.5, position: [0, 2.8, 0] }
  },
  WARM: {
    ambient: { color: 0xfff8dc, intensity: 0.3 },
    main: { color: 0xfff8dc, intensity: 0.7, position: [8, 12, 4] },
    fill: { color: 0xffeaa7, intensity: 0.4, position: [-4, 8, -4] },
    ceiling: { color: 0xfff8dc, intensity: 0.6, position: [0, 2.8, 0] }
  },
  COOL: {
    ambient: { color: 0xe6f3ff, intensity: 0.3 },
    main: { color: 0xe6f3ff, intensity: 0.9, position: [12, 18, 6] },
    fill: { color: 0xb3d9ff, intensity: 0.2, position: [-6, 12, -6] },
    ceiling: { color: 0xe6f3ff, intensity: 0.4, position: [0, 2.8, 0] }
  }
};

// Enhanced camera settings
export const CAMERA_SETTINGS = {
  FOV: 45,
  INITIAL_POSITION: [8, 6, 8],
  NEAR: 0.1,
  FAR: 1000,
  MIN_DISTANCE: 3,
  MAX_DISTANCE: 25,
  MIN_HEIGHT: 0.5,
  MAX_HEIGHT: 15
};

// Enhanced renderer settings
export const RENDERER_SETTINGS = {
  ANTIALIAS: true,
  PIXEL_RATIO: Math.min(window.devicePixelRatio, 2),
  SHADOW_MAP_SIZE: 4096,
  TONE_MAPPING_EXPOSURE: 1.2,
  PHYSICALLY_CORRECT_LIGHTS: true
};

// Material quality presets
export const MATERIAL_QUALITY = {
  LOW: {
    shadowMapSize: 1024,
    anisotropy: 4,
    normalMapIntensity: 0.1,
    envMapIntensity: 0.2
  },
  MEDIUM: {
    shadowMapSize: 2048,
    anisotropy: 8,
    normalMapIntensity: 0.3,
    envMapIntensity: 0.5
  },
  HIGH: {
    shadowMapSize: 4096,
    anisotropy: 16,
    normalMapIntensity: 0.5,
    envMapIntensity: 0.8
  }
};

// Enhanced room settings
export const ROOM_DEFAULTS = {
  WIDTH: 6,
  HEIGHT: 6,
  MIN_SIZE: 4,
  MAX_SIZE: 20,
  STEP: 0.5,
  WALL_HEIGHT: 3,
  WALL_THICKNESS: 0.15,
  FLOOR_THICKNESS: 0.1
};

// Enhanced constraint settings
export const CONSTRAINTS = {
  OBJECT_BUFFER: 0.3,
  SNAP_DISTANCE: 0.25,
  GRID_SPACING: 0.5,
  WALL_OFFSET: 0.05
};

// Post-processing settings (if you want to add post-processing later)
export const POST_PROCESSING = {
  BLOOM: {
    threshold: 0.8,
    strength: 0.3,
    radius: 0.5
  },
  SSAO: {
    radius: 0.1,
    intensity: 0.3
  }
};
