/**
 * Bathroom Templates Configuration
 * Pre-designed layouts with fixtures placed at specific wall locations
 *
 * Wall Reference (rooms centered at 0,0):
 * - North wall (back): z = -roomHeight/2 + wallThickness (5cm)
 * - South wall (front): z = roomHeight/2 - wallThickness
 * - East wall (right): x = roomWidth/2 - wallThickness
 * - West wall (left): x = -roomWidth/2 + wallThickness
 *
 * Rotations (facing into room):
 * - North wall: 0 (facing south)
 * - South wall: Math.PI (facing north)
 * - East wall: -Math.PI/2 (facing west)
 * - West wall: Math.PI/2 (facing east)
 */

export interface TemplateItem {
  type: string
  sku: string
  wall: 'north' | 'south' | 'east' | 'west' | 'corner-nw' | 'corner-ne' | 'corner-sw' | 'corner-se'
  wallPosition?: number // 0-1 position along the wall (0.5 = center)
  description?: string
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  roomWidth: number // in cm
  roomHeight: number // in cm (depth)
  roomShape: 'square' | 'rectangular' | 'l-shape'
  items: TemplateItem[]
  cameraPreset?: 'OVERVIEW' | 'CLOSE_UP' | 'CORNER_VIEW' | 'SIDE_VIEW' // Initial camera view when loading template
  customCamera?: { x: number; y: number; z: number } // Custom camera position (overrides preset)
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  /**
   * Template 1: Standard Family Bathroom
   * Room Size: 2400mm x 2000mm (240cm x 200cm)
   *
   * Layout:
   * - Bath (1700mm): Along BACK wall (north, 2400mm wall) - flush against wall
   * - Vanity (600mm): On RIGHT wall (east, 2000mm wall) - towards back
   * - Toilet: On RIGHT wall, towards front (next to vanity)
   */
  'standard-family': {
    id: 'standard-family',
    name: 'Standard Family Bathroom',
    description: 'Bath along back wall, toilet and vanity on right wall',
    roomWidth: 240,
    roomHeight: 200,
    roomShape: 'rectangular',
    items: [
      {
        type: 'Bath',
        sku: 'C53021', // Hereford 1700x750 Single Ended Bath (170x75cm)
        wall: 'north', // Along BACK wall (not corner)
        wallPosition: 0.15, // Towards left side of back wall
        description: 'Standard Bath along back wall'
      },
      {
        type: 'Toilet',
        sku: 'C66183', // Portland Close Coupled Toilet
        wall: 'east',
        wallPosition: 0.5, // Clear of bath, towards back of right wall
        description: 'Close Coupled Toilet on right wall next to bath'
      },
      {
        type: 'Furniture',
        sku: 'C76237', // Corsica 600mm Floor Standing Vanity
        wall: 'east',
        wallPosition: 1, // Towards front of right wall, more accessible
        description: 'Floor Standing Vanity 600mm on right wall'
      }
    ]
  },

  /**
   * Template 2: Compact En-Suite
   * Room Size: 1800mm x 1800mm (180cm x 180cm) - Square
   *
   * Layout:
   * - Shower (900x900): Back-LEFT corner - flush in corner
   * - Basin (450mm): On RIGHT wall - towards back
   * - Toilet: On RIGHT wall - towards front (next to basin)
   */
  'compact-ensuite': {
    id: 'compact-ensuite',
    name: 'Compact En-Suite',
    description: 'Corner shower, basin and toilet on right wall',
    roomWidth: 180,
    roomHeight: 180,
    roomShape: 'square',
    items: [
      {
        type: 'Shower',
        sku: 'C46013', // London 900x900 Pivot Shower
        wall: 'corner-nw', // Back-left corner - flush
        description: 'Quadrant Shower 900x900 in back-left corner'
      },
      {
        type: 'Toilet',
        sku: 'C66183', // Portland Close Coupled Toilet
        wall: 'east',
        wallPosition: 0.2, // Towards front, next to basin
        description: 'Toilet on right wall next to basin'
      },
        {
            type: 'Furniture',
            sku: 'C77113', // Avon 450mm Basin Vanity
            wall: 'east',
            wallPosition: 0.7, // Towards back of right wall
            description: 'Wall Hung Basin 450mm on right wall'
        },
    ]
  },

  /**
   * Template 3: Downstairs Toilet / Cloakroom
   * Room Size: 900mm x 1600mm (90cm x 160cm) - Narrow
   *
   * Layout:
   * - Toilet: CENTERED on BACK wall (900mm wall) - flush against wall
   * - Basin (400mm): On LEFT wall - towards front
   * - Door: CENTERED on FRONT wall (south) to show clearance
   */
  'cloakroom': {
    id: 'cloakroom',
    name: 'Downstairs Toilet / Cloakroom',
    description: 'Toilet on back wall, basin on left wall, door on front wall',
    roomWidth: 90,
    roomHeight: 160,
    roomShape: 'rectangular',
    customCamera: { x: 500, y: 300, z: 0 }, // Full left side view of the room
    items: [
      {
        type: 'Toilet',
        sku: 'C66175', // Portland Close Coupled Toilet
        wall: 'north',
        wallPosition: 0.5, // CENTERED on back wall
        description: 'Standard Toilet centered on back wall'
      },
      {
        type: 'Furniture',
        sku: 'C76471', // Avon 400mm Cloakroom Basin
        wall: 'west',
        wallPosition: 0.55, // Towards front of left wall
        description: 'Cloakroom Basin 400mm on left wall'
      },
      {
        type: 'WindowAndDoor',
        sku: 'DOOR-WHITE-800X2135', // White Door 800mm
        wall: 'south',
        wallPosition: 0.5, // CENTERED on front wall
        description: 'Door on front wall (opposite toilet) to show clearance'
      }
    ]
  },

  /**
   * Template 4: Shower-Bath Upgrade
   * Room Size: 2400mm x 2000mm (240cm x 200cm)
   *
   * Layout:
   * - P-Shape Shower Bath (L-shaped 1700x850): Along BACK wall - flush against wall
   * - Toilet: On RIGHT wall (east) - towards back, next to bath
   * - Vanity (600mm): On RIGHT wall (east) - towards front, more accessible
   */
  'shower-bath-upgrade': {
    id: 'shower-bath-upgrade',
    name: 'Shower-Bath Upgrade',
    description: 'P-shape shower bath, toilet and vanity',
    roomWidth: 240,
    roomHeight: 200,
    roomShape: 'rectangular',
    items: [
      {
        type: 'Bath',
        sku: 'C57499', // L Shaped 1700 Shower Bath (170x85cm)
        wall: 'corner-nw', // Back-left corner - flush against back wall
        description: 'P-Shape Shower Bath along back wall'
      },
      {
        type: 'Toilet',
        sku: 'C66183', // Portland Close Coupled Toilet
        wall: 'east',
        wallPosition: 0.5, // Clear of bath, towards back of right wall
        description: 'Toilet on right wall next to bath'
      },
      {
        type: 'Furniture',
        sku: 'C76237', // Corsica 600mm Floor Standing Vanity
        wall: 'east',
          wallPosition: 1, // Towards front of right wall, more accessible
        description: 'Vanity 600mm on right wall'
      }
    ]
  }
}

export const getTemplateById = (id: string): TemplateConfig | undefined => {
  return TEMPLATES[id]
}

export const getAllTemplates = (): TemplateConfig[] => {
  return Object.values(TEMPLATES)
}
