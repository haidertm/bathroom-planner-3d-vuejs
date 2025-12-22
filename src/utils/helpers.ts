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
export const setOutlineColor = (isColliding: boolean, isMultiSelect: boolean = false): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Cannot set outline color.');
    return;
  }

  if (isColliding) {
    // Red outline for collision - bright and visible
    outlinePassRef.visibleEdgeColor.set('#ff0000');
    outlinePassRef.hiddenEdgeColor.set('#cc0000'); // Brighter dark red
    console.log('🔴 Outline color set to RED (collision detected)');
  } else if (isMultiSelect) {
    // Purple outline for multi-select mode (no collision)
    outlinePassRef.visibleEdgeColor.set('#9b59b6'); // Purple
    outlinePassRef.hiddenEdgeColor.set('#8e44ad'); // Darker purple
    console.log('🟣 Outline color set to PURPLE (multi-select, no collision)');
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

// NEW: Function to highlight multiple objects for multi-select mode
export const highlightMultipleObjects = (objects: Set<THREE.Object3D>): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Cannot highlight multiple objects.');
    return;
  }

  if (objects.size > 0) {
    // Collect all meshes from all selected objects
    const allMeshes: THREE.Mesh[] = [];
    objects.forEach(obj => {
      obj.traverse((child) => {
        if (isMesh(child)) {
          allMeshes.push(child);
        }
      });
    });

    // Set all meshes as selected
    outlinePassRef.selectedObjects = allMeshes;
    
    // Use purple color for multi-select
    outlinePassRef.visibleEdgeColor.set('#9b59b6'); // Purple
    outlinePassRef.hiddenEdgeColor.set('#8e44ad'); // Darker purple
    
    console.log(`🔲 Multi-select: Highlighted ${objects.size} objects (${allMeshes.length} meshes)`);
  } else {
    // Clear selection
    outlinePassRef.selectedObjects = [];
    console.log('⭕ Multi-select: Cleared all highlights');
  }
};
