
// Helper function to get movement configuration for an object
export const getMovementConfig = (objectType: ComponentType): MovementConfig => {
  const config = FIXTURE_CONFIG[objectType];
  return config?.movement || {
    // Default movement configuration for objects without explicit config
    snapToWall: true,
    allowVerticalMovement: false,
    allowFreeMovement: false,
    allowFreeRotation: false,
    maintainWallDistance: true
  };
};

// NEW: Helper function to check if object can move freely
export const canMoveFreelyInRoom = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return movementConfig.allowFreeMovement;
};

// NEW: Helper function to check if object can move vertically
export const canMoveVertically = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return movementConfig.allowVerticalMovement || movementConfig.allowFreeMovement;
};

// NEW: Helper function to check if object can rotate freely
export const canRotateFreely = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return movementConfig.allowFreeRotation || movementConfig.allowFreeMovement;
};

// NEW: Helper function to get height constraints
export const getHeightConstraints = (objectType: ComponentType): { min: number; max: number } => {
  const movementConfig = getMovementConfig(objectType);
  return {
    min: movementConfig.minHeight || 0,
    max: movementConfig.maxHeight || 250
  };
};

// Existing helper functions (unchanged)
export const getObjectWallBuffer = (
  objectType: ComponentType,
  scale: number = 1.0
): number => {
  const config = FIXTURE_CONFIG[objectType];
  if (config?.orientation?.wallBuffer !== undefined) {
    return config.orientation.wallBuffer * scale;
  }
  if (config && 'fallbackSize' in config && config.fallbackSize) {
    const [width, , depth] = config.fallbackSize;
    return Math.max(width, depth) * scale / 2;
  }
  return CONSTRAINTS.OBJECT_BUFFER;
};

export const getObjectRotationForWall = (
  objectType: ComponentType,
  wallType: 'north' | 'south' | 'east' | 'west'
): number => {
  const config = FIXTURE_CONFIG[objectType];
  if (!config || !config.orientation) {
    console.warn(`No orientation config found for ${objectType}, using default face_into_room`);
    return WALL_ROTATIONS.face_into_room[wallType];
  }
  let baseRotation = WALL_ROTATIONS[config.orientation.type][wallType];
  if (config.orientation.rotationOffset) {
    baseRotation += config.orientation.rotationOffset;
  }
  return baseRotation;
};

export const getOrientationInfo = (objectType: ComponentType) => {
  const config = FIXTURE_CONFIG[objectType];
  const orientation = config?.orientation;
  return {
    type: orientation?.type || 'face_into_room',
    description: orientation?.description || 'Default orientation',
    hasOffset: !!orientation?.rotationOffset
  };
};

// Utility functions (unchanged)
export const getModelConfig = (componentType: ComponentType): FixtureConfig => {
  return FIXTURE_CONFIG[componentType];
};

export const isModelBased = (config: FixtureConfig): config is ModelConfig => {
  return 'path' in config;
};

export const isProceduralBased = (config: FixtureConfig): config is ProceduralConfig => {
  return 'type' in config && config.type === 'procedural';
};

export const getPreloadModels = (): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model =>
    Object.values(FIXTURE_CONFIG).some(config =>
      isModelBased(config) && config.name === model.name
    )
  );
};
