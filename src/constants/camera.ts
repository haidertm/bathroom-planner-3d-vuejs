// src/constants/camera.ts - FIXED CAMERA CONSTANTS
export const LOOK_AT = {
  x: 0,
  y: 80,
  z: 0
};

export const CAMERA_SETTINGS = {
  // Field of view
  FOV: 45,

  // Camera position for centimeter units
  INITIAL_POSITION: {
    x: 0,
    y: 150,    // 400cm = 4m height
    z: 800     // 500cm = 5m distance
  },

  // FIXED: Camera constraints with better values
  NEAR: 5,        // Changed from 1 to 10 to avoid precision issues
  FAR: 50000,      // Reduced from 100000 to 50000 for better precision

  // LOWERED: Camera movement limits for even closer inspection
  MIN_DISTANCE: 100,
  MAX_DISTANCE: 1200,
  MIN_HEIGHT: 15,      // LOWERED: From 30 to 15cm - much closer to ground
  MAX_HEIGHT: 600      // LOWERED: From 800 to 600cm (6m) - lower maximum height
} as const;

export const CAMERA_CONTROLS = {
  // Mouse/touch sensitivity
  ROTATION_SPEED: 0.01,    // Reduced from 0.02 for smoother rotation
  ZOOM_SPEED: 0.05,

  // FIXED: Proper zoom control values
  DAMPING: 0.1,
  ZOOM_STEP_SIZE: 1.08,         // Slightly increased for more noticeable zoom
  TOUCH_ZOOM_STEP: 0.95,        // Adjusted for touch devices
  ZOOM_SMOOTHING: 0.15,         // Added the missing ZOOM_SMOOTHING constant

  // Constraints
  MAX_PHI_ANGLE: Math.PI / 2 - 0.1,  // Prevent going below floor
  MIN_PHI_ANGLE: 0.1                 // Prevent going too high
} as const;

export const CAMERA_PRESETS = {
  // LOWERED: Camera positions only (keeping look-at at origin)
  OVERVIEW: {
    position: { x: 0, y: 300, z: 450 },     // LOWERED: More downward angle
    lookAt: LOOK_AT
  },

  CLOSE_UP: {
    position: { x: 0, y: 100, z: 200 },     // LOWERED: Close to ground level
    lookAt: LOOK_AT
  },

  CORNER_VIEW: {
    position: { x: 300, y: 180, z: 300 },   // LOWERED: More downward corner view
    lookAt: LOOK_AT
  },

  SIDE_VIEW: {
    position: { x: 400, y: 120, z: 0 },     // LOWERED: Lower side perspective
    lookAt: LOOK_AT
  }
} as const;
