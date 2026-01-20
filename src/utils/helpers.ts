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
export const highlightObjects = (objects: THREE.Object3D[], highlight: boolean): void => {
  if (!outlinePassRef) {
    console.warn('OutlinePass not initialized. Please call setOutlinePass first.');
    return;
  }

  if (highlight && objects.length > 0) {
    // Collect all meshes from all objects
    const allMeshes: THREE.Mesh[] = [];
    objects.forEach(obj => {
      obj.traverse((child) => {
        if (isMesh(child)) {
          allMeshes.push(child);
        }
      });
    });

    // Set selected objects for OutlinePass
    outlinePassRef.selectedObjects = allMeshes;
    console.log('🎯 OutlinePass selected objects:', allMeshes.length, 'meshes found from', objects.length, 'objects');
  } else {
    // Clear selection
    outlinePassRef.selectedObjects = [];
    console.log('⭕ OutlinePass selection cleared');
  }
};

// Keep highlightObject for backward compatibility
export const highlightObject = (obj: THREE.Object3D | null, highlight: boolean): void => {
  highlightObjects(obj ? [obj] : [], highlight);
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

/**
 * MagneticSnapIndicator - Visual feedback for magnetic snapping
 *
 * Shows a dashed line from current position to snap target
 * Color transitions from yellow (far) to green (close) based on strength
 */
export class MagneticSnapIndicator {
  private scene: THREE.Scene;
  private line: THREE.Line | null = null;
  private material: THREE.LineDashedMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create dashed line material
    this.material = new THREE.LineDashedMaterial({
      color: 0xffff00, // Yellow by default
      linewidth: 2,
      dashSize: 10,
      gapSize: 5,
      transparent: true,
      opacity: 0.8
    });
  }

  /**
   * Show the magnetic snap indicator line
   */
  public show(
    fromPosition: { x: number; y: number; z: number },
    toPosition: { x: number; z: number },
    strength: number // 0-1, higher = closer to target
  ): void {
    this.hide(); // Clear any existing line

    // Interpolate color from yellow (far) to green (close)
    const color = new THREE.Color();
    color.lerpColors(
      new THREE.Color(0xffff00), // Yellow
      new THREE.Color(0x00ff00), // Green
      strength
    );
    this.material.color.copy(color);

    // Update opacity based on strength
    this.material.opacity = 0.5 + strength * 0.5;

    // Create line geometry
    const points = [
      new THREE.Vector3(fromPosition.x, fromPosition.y + 1, fromPosition.z),
      new THREE.Vector3(toPosition.x, fromPosition.y + 1, toPosition.z)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Create and add line
    this.line = new THREE.Line(geometry, this.material);
    this.line.computeLineDistances(); // Required for dashed lines
    this.line.userData.isMagneticIndicator = true;
    this.line.renderOrder = 1000;

    this.scene.add(this.line);
  }

  /**
   * Hide the magnetic snap indicator
   */
  public hide(): void {
    if (this.line) {
      this.scene.remove(this.line);
      this.line.geometry.dispose();
      this.line = null;
    }
  }

  /**
   * Update the indicator position and strength
   */
  public update(
    fromPosition: { x: number; y: number; z: number },
    toPosition: { x: number; z: number },
    strength: number
  ): void {
    if (this.line) {
      // Update existing line
      const points = [
        new THREE.Vector3(fromPosition.x, fromPosition.y + 1, fromPosition.z),
        new THREE.Vector3(toPosition.x, fromPosition.y + 1, toPosition.z)
      ];

      this.line.geometry.setFromPoints(points);
      this.line.computeLineDistances();

      // Update color based on strength
      const color = new THREE.Color();
      color.lerpColors(
        new THREE.Color(0xffff00),
        new THREE.Color(0x00ff00),
        strength
      );
      this.material.color.copy(color);
      this.material.opacity = 0.5 + strength * 0.5;
    } else {
      // Create new line
      this.show(fromPosition, toPosition, strength);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.hide();
    this.material.dispose();
  }

  /**
   * Check if indicator is currently visible
   */
  public isVisible(): boolean {
    return this.line !== null;
  }
}

/**
 * Factory function to create a magnetic snap indicator
 */
export const createMagneticSnapIndicator = (scene: THREE.Scene): MagneticSnapIndicator => {
  return new MagneticSnapIndicator(scene);
};
