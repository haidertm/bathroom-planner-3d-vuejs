// Custom texture definitions - supports both files and colors
export const FLOOR_TEXTURES = [
  { name: 'White Tile', file: '', color: 0xf8f8f8, scale: [4, 4] },
  { name: 'Gray Tile', file: '/textures/floor_grey_tile.avif', color: 0xd0d0d0, scale: [4, 4] },
  { name: 'Metropolis Star', file: '/textures/floor_metropolis_star_black.webp', color: 0xf5f5dc, scale: [6, 6] },
  { name: 'Dark Tile', file: '', color: 0x606060, scale: [4, 4] },
  { name: 'Wood', file: '', color: 0xd2b48c, scale: [3, 3] },
  { name: 'Red Terracotta', file: '/textures/floor_red_terracotta.jpg', color: 0xffffff, scale: [4, 4] },
  { name: 'Stone', file: '', color: 0x888888, scale: [2, 2] }
];

export const WALL_TEXTURES = [
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

export const DEFAULT_FLOOR_TEXTURE: number = 5; // Wood
export const DEFAULT_WALL_TEXTURE: number = 7; // Brick
