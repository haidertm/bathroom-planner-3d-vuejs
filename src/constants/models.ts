// src/constants/models.ts - Mixed approach configuration

import type { ComponentType } from './components';

export interface ModelConfig {
  readonly name: string;
  readonly path: string;
  readonly scale?: number;
  readonly rotation?: readonly [number, number, number];
  readonly position?: readonly [number, number, number];
  readonly fallbackColor?: number;
  readonly fallbackGeometry?: 'box' | 'cylinder' | 'sphere' | 'cone';
  readonly fallbackSize?: readonly [number, number, number];
}

export interface ProceduralConfig {
  readonly name: string;
  readonly type: 'procedural';
  readonly fallbackColor?: number;
  readonly fallbackGeometry?: 'box' | 'cylinder' | 'sphere' | 'cone';
  readonly fallbackSize?: readonly [number, number, number];
}

export type FixtureConfig = ModelConfig | ProceduralConfig;

// ONLY the models you want to load from .glb files
export const AVAILABLE_MODELS: readonly ModelConfig[] = [
  {
    name: 'Sink',
    path: '/models/sink.glb',
    scale: 1.0,
    fallbackColor: 0xffffff,
    fallbackGeometry: 'cylinder',
    fallbackSize: [0.6, 0.8, 0.6]
  },
  {
    name: 'Radiator',
    path: '/models/radiator.glb',
    scale: 1.0,
    rotation: [0, 0, 0],
    position: [0, 0, 0], // Keep at origin
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [0.8, 0.6, 0.1]
  },
  {
    name: 'Door',
    path: '/models/door.glb',
    scale: 1.0,
    fallbackColor: 0x8B4513,
    fallbackGeometry: 'box',
    fallbackSize: [0.1, 2.0, 0.8]
  }
  // Only add models here that you want to load from .glb files
] as const;

// Components that will use procedural code (your existing bathroomFixtures logic)
export const PROCEDURAL_FIXTURES: readonly ProceduralConfig[] = [
  {
    name: 'Toilet',
    type: 'procedural',
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [0.6, 0.8, 0.8]
  },
  {
    name: 'Bath',
    type: 'procedural',
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [1.7, 0.6, 0.8]
  },
  {
    name: 'Shower',
    type: 'procedural',
    fallbackColor: 0xffffff,
    fallbackGeometry: 'cylinder',
    fallbackSize: [0.8, 2.0, 0.8]
  },
  // {
  //   name: 'Radiator',
  //   type: 'procedural',
  //   fallbackColor: 0xffffff,
  //   fallbackGeometry: 'box',
  //   fallbackSize: [0.8, 0.6, 0.1]
  // },
  {
    name: 'Mirror',
    type: 'procedural',
    fallbackColor: 0x87CEEB,
    fallbackGeometry: 'box',
    fallbackSize: [0.8, 1.0, 0.05]
  }
] as const;

// HERE'S WHERE YOU CHOOSE: Map each component to either model or procedural
export const FIXTURE_CONFIG: Record<ComponentType, FixtureConfig> = {
  // These will use .glb files
  Sink: AVAILABLE_MODELS.find(m => m.name === 'Sink')!,
  Door: AVAILABLE_MODELS.find(m => m.name === 'Door')!,
  Radiator: AVAILABLE_MODELS.find(f => f.name === 'Radiator')!,

  // These will use your existing procedural code
  Toilet: PROCEDURAL_FIXTURES.find(f => f.name === 'Toilet')!,
  Bath: PROCEDURAL_FIXTURES.find(f => f.name === 'Bath')!,
  Shower: PROCEDURAL_FIXTURES.find(f => f.name === 'Shower')!,
  Mirror: PROCEDURAL_FIXTURES.find(f => f.name === 'Mirror')!,
};

// Example: If you later want to switch Toilet to use a .glb file:
// 1. Add toilet to AVAILABLE_MODELS
// 2. Change the mapping:
// Toilet: AVAILABLE_MODELS.find(m => m.name === 'Toilet')!,

// Utility functions
export const getModelConfig = (componentType: ComponentType): FixtureConfig => {
  return FIXTURE_CONFIG[componentType];
};

export const isModelBased = (config: FixtureConfig): config is ModelConfig => {
  return 'path' in config;
};

export const isProceduralBased = (config: FixtureConfig): config is ProceduralConfig => {
  return 'type' in config && config.type === 'procedural';
};

// Only preload the models you're actually using
export const getPreloadModels = (): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model =>
    Object.values(FIXTURE_CONFIG).some(config =>
      isModelBased(config) && config.name === model.name
    )
  );
};

// In this example, only Sink and Door models will be preloaded
// Toilet, Bath, Shower, Radiator, Mirror will use your existing procedural code
