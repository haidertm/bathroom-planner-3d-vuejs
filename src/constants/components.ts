export type ComponentType = 'Toilet' | 'Sink' | 'Bath' | 'Shower' | 'Radiator' | 'Mirror' | 'Door';

export const COMPONENTS: ComponentType[] = ['Toilet', 'Sink', 'Bath', 'Shower', 'Radiator', 'Mirror', 'Door'];

export interface ComponentDefaults {
  height: number;
  scale: number;
}

export const COMPONENT_DEFAULTS: Record<ComponentType, ComponentDefaults> = {
  Toilet: { height: 0, scale: 1.0 },
  Sink: { height: 0, scale: 1.0 },
  Bath: { height: 0, scale: 1.0 },
  Shower: { height: 0, scale: 1.0 },
  Radiator: { height: 0, scale: 1.0 },
  Mirror: { height: 0, scale: 1.0 },
  Door: { height: 0, scale: 1.0 }
};
