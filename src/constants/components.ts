export type ComponentType = 'Toilet' | 'Furniture' | 'Bath' | 'Shower' | 'Radiator' | 'Mirror';

export const COMPONENTS: ComponentType[] = ['Toilet', 'Furniture', 'Bath', 'Shower', 'Radiator', 'Mirror'];

export interface ComponentDefaults {
  height: number;
  scale: number;
}

export const COMPONENT_DEFAULTS: Record<ComponentType, ComponentDefaults> = {
  Toilet: { height: 0, scale: 1.0 },
  Furniture: { height: 0, scale: 1.0 },
  Bath: { height: 0, scale: 1.0 },
  Shower: { height: 0, scale: 1.0 },
  Radiator: { height: 0, scale: 1.0 },
  Mirror: { height: 0, scale: 1.0 },
};
