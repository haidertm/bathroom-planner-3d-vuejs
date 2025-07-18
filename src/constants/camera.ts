export const LOOK_AT = {
  x: 0,
  y: 100,
  z: 0
};

export const CAMERA_SETTINGS = {
  // Field of view
  FOV: 45,

  // Camera position for centimeter units
  INITIAL_POSITION: {
    x: 0,
    y: 400,    // 400cm = 4m height
    z: 500     // 600cm = 6m distance
  },

  // Camera constraints
  NEAR: 1,
  FAR: 100000,

  // Camera movement limits (in centimeters)
  MIN_DISTANCE: 200,   // 2m minimum distance
  MAX_DISTANCE: 2000,  // 20m maximum distance
  MIN_HEIGHT: 50,      // 50cm minimum height above floor
  MAX_HEIGHT: 1500     // 15m maximum height
} as const;

export const CAMERA_CONTROLS = {
  // Mouse/touch sensitivity
  ROTATION_SPEED: 0.01,
  ZOOM_SPEED: 0.05,

  // Smooth movement
  DAMPING: 0.1,

  // Constraints
  MAX_PHI_ANGLE: Math.PI / 2 - 0.1,  // Prevent going below floor
  MIN_PHI_ANGLE: 0.1                 // Prevent going too high
} as const;

export const CAMERA_PRESETS = {
  // Different camera angles for better viewing
  OVERVIEW: {
    position: { x: 0, y: 600, z: 800 },
    lookAt: LOOK_AT
  },

  CLOSE_UP: {
    position: { x: 0, y: 200, z: 400 },
    lookAt: LOOK_AT
  },

  CORNER_VIEW: {
    position: { x: 400, y: 300, z: 400 },
    lookAt: LOOK_AT
  },

  SIDE_VIEW: {
    position: { x: 800, y: 300, z: 0 },
    lookAt: LOOK_AT
  }
} as const;
