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

/**
 * Create a preview ghost of the object at target rotation
 * This helps users see where the object would be if rotation wasn't blocked
 */
export const createRotationPreview = (
    object: THREE.Object3D,
    targetRotation: number,
    scene: THREE.Scene
): THREE.Object3D | null => {
    try {
        const ghost = object.clone();

        // Make it semi-transparent and wireframe
        ghost.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material.clone();
                material.transparent = true;
                material.opacity = 0.3;
                material.wireframe = true;
                material.color = new THREE.Color(0xff0000); // Red wireframe
                child.material = material;
            }
        });

        // Set target rotation
        ghost.rotation.y = targetRotation;
        ghost.position.copy(object.position);
        ghost.scale.copy(object.scale);

        // Add to scene temporarily
        scene.add(ghost);

        // Auto-remove after a short time
        setTimeout(() => {
            scene.remove(ghost);
        }, 1000);

        return ghost;
    } catch (error) {
        console.warn('Could not create rotation preview:', error);
        return null;
    }
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

// Store reference to outline pass for external access
let outlinePassRef: any = null;

export const setOutlinePass = (outlinePass: any) => {
  outlinePassRef = outlinePass;
};

// ChatGPT's outline approach - with OutputPass support
export const highlightObject = (obj: THREE.Object3D | null, highlight: boolean): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Please call setOutlinePass first.');
    return;
  }

  if (highlight && obj) {
    // Collect all meshes from the object
    const meshes: THREE.Mesh[] = [];
    obj.traverse((child) => {
      if (isMesh(child)) {
        meshes.push(child);
      }
    });

    // Set selected objects for OutlinePass
    outlinePassRef.selectedObjects = meshes;
    console.log('🎯 OutlinePass selected objects:', meshes.length, 'meshes found');
    console.log('🎯 Current outline colors:', {
      visible: outlinePassRef.visibleEdgeColor.getHexString(),
      hidden: outlinePassRef.hiddenEdgeColor.getHexString()
    });
  } else {
    // Clear selection
    outlinePassRef.selectedObjects = [];
    console.log('⭕ OutlinePass selection cleared');
  }
};

// NEW: Function to change outline color based on collision state
export const setOutlineColor = (isColliding: boolean): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Cannot set outline color.');
    return;
  }

  if (isColliding) {
    // Red outline for collision - bright and visible
    outlinePassRef.visibleEdgeColor.set('#ff0000');
    outlinePassRef.hiddenEdgeColor.set('#cc0000'); // Brighter dark red
    console.log('🔴 Outline color set to RED (collision detected)');
  } else {
    // Bright cyan/turquoise outline for normal selection - much more visible
    outlinePassRef.visibleEdgeColor.set('#00ffff'); // Brighter cyan
    outlinePassRef.hiddenEdgeColor.set('#0088aa'); // Brighter dark cyan
    console.log('🟢 Outline color set to CYAN (no collision)');
  }

  // Debug: Log the actual color values that were set
  console.log('🎨 Outline colors after setting:', {
    visible: outlinePassRef.visibleEdgeColor.getHexString(),
    hidden: outlinePassRef.hiddenEdgeColor.getHexString(),
    selectedObjects: outlinePassRef.selectedObjects.length
  });
};

// TEST: Function to force a very bright outline for debugging
export const testBrightOutline = (): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Cannot test outline.');
    return;
  }

  // Set extremely bright, visible colors
  outlinePassRef.visibleEdgeColor.set('#ffffff'); // Pure white
  outlinePassRef.hiddenEdgeColor.set('#888888'); // Gray
  console.log('🧪 TEST: Set outline to bright white for visibility test');
};
