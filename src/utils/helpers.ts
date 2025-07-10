import * as THREE from 'three';

export interface MousePosition {
  x: number;
  y: number;
}

export const isMobile = (): boolean => window.innerWidth <= 768;

export const updateMousePosition = (event: MouseEvent, rect: DOMRect) => {
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  };
};

export const updateTouchPosition = (touch: Touch, rect: DOMRect) => {
  return {
    x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((touch.clientY - rect.top) / rect.height) * 2 + 1
  };
};

export const getTouchDistance = (touch1: Touch, touch2: Touch) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// Type guard function for Three.js Mesh objects
const isMesh = (obj: THREE.Object3D): obj is THREE.Mesh => {
  return obj.type === 'Mesh';
};

// Type guard to check if material has emissive property
const hasEmissive = (material: THREE.Material): material is THREE.Material & { emissive: THREE.Color } => {
  return 'emissive' in material;
};

// Helper function to process a single material
const processMaterial = (material: THREE.Material, highlight: boolean): THREE.Material => {
  const clonedMaterial = material.clone();
  if (hasEmissive(clonedMaterial)) {
    clonedMaterial.emissive.setHex(highlight ? 0x444444 : 0x000000);
  }
  return clonedMaterial;
};

export const highlightObject = (obj: THREE.Object3D | null, highlight: boolean): void => {
  if (!obj) return;

  obj.traverse((child) => {
    if (isMesh(child) && child.material) {
      // Normalize to array, process, then assign back
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const processedMaterials = materials.map(material => processMaterial(material, highlight));

      child.material = Array.isArray(child.material) ? processedMaterials : processedMaterials[0];
    }
  });
};
