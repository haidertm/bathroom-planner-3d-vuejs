//src/services/sceneManager.ts

import * as THREE from 'three';
import { type MeasurementData, MeasurementSystem } from './measurementSystem';
import { createModel, ModelManager } from '../models/bathroomFixtures';
import { ProgressiveModelLoader } from './progressiveModelLoader';
import { WallLabelsDebug } from '../utils/wallLabelsDebug.js';
import { AxisIndicatorsDebug } from '../utils/axisIndicatorsDebug.js';
import {
  createFloor,
  createWalls,
  createLShapeFloor,
  createLShapeWalls,
  createCustomGrid,
  createWallGridLines,
  createBlueprintGrid
} from '../models/roomGeometry';
import textureManager from './textureManager';
import { SimpleWallCulling } from './simpleWallCulling';
import { setOutlinePass } from '../utils/helpers';
import type { BathroomItem } from '../utils/constraints';
import type { TextureConfig } from '../constants/textures';
import { LOOK_AT, CAMERA_SETTINGS, CAMERA_PRESETS, ORTHOGRAPHIC_SETTINGS, type ViewMode } from '../constants/camera';
import { CameraTransition, Easing } from './cameraTransition';

// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getOrientationForItem } from '../utils/models';
import { WALL_SETTINGS } from "../constants/dimensions.ts";

interface SceneComponents {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

// Stored camera state for 3D/2D view switching
interface Stored3DState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class SceneManager {
  public scene: THREE.Scene | null = null;
  public camera: THREE.PerspectiveCamera | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  private eventHandlers: any = null;

  // 2D Blueprint View - Orthographic camera and view mode
  public orthographicCamera: THREE.OrthographicCamera | null = null;
  public viewMode: ViewMode = '3d';
  private stored3DState: Stored3DState | null = null;
  private roomWidth: number = 300;  // Default room width in cm
  private roomHeight: number = 250; // Default room height/depth in cm
  // Blueprint grid reference will be added in Story 2 implementation
  public blueprintGridRef: THREE.Group | null = null; // 10cm grid for 2D mode

  // Post-processing components
  private composer: EffectComposer | null = null;
  private outlinePass: OutlinePass | null = null;

  // Animation loop management
  private animationId: number | null = null;
  private isAnimating: boolean = false;

  // Camera transition manager for smooth 3D/2D view switching
  private cameraTransition: CameraTransition = new CameraTransition();
  private isViewTransitioning: boolean = false;

  private floorRef: THREE.Mesh | null = null;
  private wallRefs: THREE.Mesh[] = [];
  private gridRef: THREE.Group | null = null;
  private wallCullingManager: SimpleWallCulling;
  private bathroomItemsGroup: THREE.Group;
  private isUpdatingItems = false;
  private wallGridGroup: THREE.Group | null = null; // NEW: Group for wall grid lines
  private wallGridVisible: boolean = true; // NEW: Track wall grid visibility state
  private measurementSystem: MeasurementSystem | null = null;
  private existingItems: Map<number, THREE.Object3D> = new Map();

  // Enhanced lighting management
  private lights: THREE.Light[] = [];
  // Store original shadow states for 2D mode
  private shadowsEnabled: boolean = true;
  private originalAmbientIntensity: number = 0.9;
  // 2D schematic overlays for thin objects
  private schematic2DOverlays: Map<number, THREE.Group> = new Map();

  private wallLabelsDebug: WallLabelsDebug | null = null;
  private axisIndicatorsDebug: AxisIndicatorsDebug | null = null;
  public debugLabelsEnabled: boolean = false; // Set to true for debugging

  constructor() {
    this.wallCullingManager = new SimpleWallCulling();
    this.bathroomItemsGroup = new THREE.Group();
    this.bathroomItemsGroup.name = 'bathroomItems';
    this.wallLabelsDebug = new WallLabelsDebug();
    this.axisIndicatorsDebug = new AxisIndicatorsDebug(); // Add this
    this.debugLabelsEnabled = false; // Debug visuals disabled by default for cleaner initial view
  }

  initializeScene(): SceneComponents {
    // Create scene with better background and atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xE6E1DA);
    this.scene.fog = new THREE.Fog(0xE6E1DA, 1000, 5000);

    // Create camera with better positioning and settings
    this.camera = new THREE.PerspectiveCamera(CAMERA_SETTINGS.FOV, window.innerWidth / window.innerHeight, CAMERA_SETTINGS.NEAR, CAMERA_SETTINGS.FAR);
    this.camera.position.set(CAMERA_SETTINGS.INITIAL_POSITION.x, CAMERA_SETTINGS.INITIAL_POSITION.y, CAMERA_SETTINGS.INITIAL_POSITION.z);
    this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

    // Initialize orthographic camera for 2D Blueprint view
    this.initializeOrthographicCamera();

    // Create renderer with enhanced settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true  // Set it in the constructor options
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enhanced shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    // Better color management and tone mapping (ChatGPT's explicit settings)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // for three.js r152+
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // explicit tone mapping
    this.renderer.toneMappingExposure = 1.0; // Reset to 1.0 as ChatGPT suggested

    // Set up post-processing with OutputPass (ChatGPT's complete solution)
    this.setupPostProcessing();

    // Add bathroom items group to scene
    this.scene.add(this.bathroomItemsGroup);

    // Setup enhanced lighting
    this.setupEnhancedLighting();

    // Initialize measurement system after scene, camera, and renderer are ready
    if (this.scene && this.camera && this.renderer) {
      this.measurementSystem = new MeasurementSystem(this.scene, this.camera, this.renderer);
      console.log('Measurement system initialized');
    }

    // this.renderer = new THREE.WebGLRenderer({
    //   antialias: true,
    //   powerPreference: 'high-performance',
    //   logarithmicDepthBuffer: true  // Set it in the constructor options
    // });

    // Check renderer capabilities
    // FIXED: Log scene initialization
    console.log('✅ Scene initialized successfully:', {
      sceneBackground: this.scene.background,
      hasFog: !!this.scene.fog,
      rendererSize: { width: window.innerWidth, height: window.innerHeight }
    });

    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    };
  }

  get wallCulling(): SimpleWallCulling {
    return this.wallCullingManager;
  }

  // Add methods to control measurement system
  public enableMeasurements(enabled: boolean): void {
    if (this.measurementSystem) {
      this.measurementSystem.setEnabled(enabled);
    }
  }

  public forceUpdateMeasurements(): void {
    if (this.measurementSystem) {
      this.measurementSystem.forceUpdateMeasurements();
    }
  }

  public setMeasurementSelectedObject(object: THREE.Object3D | null): void {
    if (this.measurementSystem) {
      this.measurementSystem.setSelectedObject(object);
    }
  }

  public setEventHandlers(eventHandlers: any): void {
    this.eventHandlers = eventHandlers;
  }

  public getCurrentMeasurements(): MeasurementData | null {
    return this.measurementSystem?.getCurrentMeasurements() || null;
  }

  public isMeasurementEnabled(): boolean {
    return this.measurementSystem?.isEnabled() || false;
  }

  setCameraPreset(preset: 'OVERVIEW' | 'CLOSE_UP' | 'CORNER_VIEW' | 'SIDE_VIEW'): void {
    if (!this.camera) return;

    const presetConfig = CAMERA_PRESETS[preset];
    this.camera.position.set(
      presetConfig.position.x,
      presetConfig.position.y,
      presetConfig.position.z
    );
    this.camera.lookAt(
      presetConfig.lookAt.x,
      presetConfig.lookAt.y,
      presetConfig.lookAt.z
    );

    // Sync with EventHandlers target position to prevent animation loop from resetting
    if (this.eventHandlers && typeof this.eventHandlers.syncTargetCameraPosition === 'function') {
      this.eventHandlers.syncTargetCameraPosition();
    }
  }

  setCustomCameraPosition(position: { x: number; y: number; z: number }): void {
    if (!this.camera) return;

    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

    // Sync with EventHandlers target position to prevent animation loop from resetting
    if (this.eventHandlers && typeof this.eventHandlers.syncTargetCameraPosition === 'function') {
      this.eventHandlers.syncTargetCameraPosition();
    }
  }

  // ADD: Method to get camera info for debugging
  getCameraInfo(): any {
    if (!this.camera) return null;

    return {
      position: this.camera.position,
      lookAt: LOOK_AT,
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far
    };
  }

  // ============================================================================
  // 2D BLUEPRINT VIEW METHODS
  // ============================================================================

  /**
   * Initialize the orthographic camera for 2D Blueprint view
   * Called during scene initialization
   */
  private initializeOrthographicCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = Math.max(this.roomWidth, this.roomHeight) * ORTHOGRAPHIC_SETTINGS.FRUSTUM_PADDING;

    this.orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      ORTHOGRAPHIC_SETTINGS.NEAR,
      ORTHOGRAPHIC_SETTINGS.FAR
    );

    // Position directly above room center, looking down
    this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, 0);
    this.orthographicCamera.lookAt(0, 0, 0);
    // Set up vector for proper top-down orientation (North at top of screen)
    this.orthographicCamera.up.set(0, 0, -1);
    this.orthographicCamera.zoom = ORTHOGRAPHIC_SETTINGS.INITIAL_ZOOM;
    this.orthographicCamera.updateProjectionMatrix();

    console.log('✅ Orthographic camera initialized for 2D Blueprint view');
  }

  /**
   * Update orthographic camera frustum when room dimensions change
   */
  public updateOrthographicFrustum(): void {
    if (!this.orthographicCamera) return;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = Math.max(this.roomWidth, this.roomHeight) * ORTHOGRAPHIC_SETTINGS.FRUSTUM_PADDING;

    this.orthographicCamera.left = frustumSize * aspect / -2;
    this.orthographicCamera.right = frustumSize * aspect / 2;
    this.orthographicCamera.top = frustumSize / 2;
    this.orthographicCamera.bottom = frustumSize / -2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Calculate the camera up vector for a given L-shape corner
   * This rotates the view so the notch appears in the correct visual position
   */
  private getUpVectorForCorner(corner: string | null): THREE.Vector3 {
    switch (corner) {
      case 'ne': return new THREE.Vector3(-1, 0, 0);  // West is up - rotates view 90° CW
      case 'se': return new THREE.Vector3(0, 0, 1);   // South is up - rotates view 180°
      case 'sw': return new THREE.Vector3(1, 0, 0);   // East is up - rotates view 90° CCW
      case 'nw':
      default:   return new THREE.Vector3(0, 0, -1);  // North is up - default orientation
    }
  }

  /**
   * Switch to 2D Blueprint view (orthographic top-down)
   * Features smooth camera flyover animation for immersive transition
   */
  public async switchTo2D(): Promise<void> {
    if (this.viewMode === '2d' || !this.camera || !this.orthographicCamera) return;
    if (this.isViewTransitioning) return; // Prevent double-clicks during animation

    console.log('🔄 Starting animated transition to 2D Blueprint view...');
    this.isViewTransitioning = true;

    try {
      // Store current 3D camera state for restoration
      this.stored3DState = {
        position: this.camera.position.clone(),
        target: new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z)
      };

      // Calculate room center for camera target
      const roomCenter = new THREE.Vector3(0, 0, 0);

      // Get L-shape corner from localStorage to determine camera rotation
      const lShapeCorner = localStorage.getItem('l-shape-corner-active');
      const targetUp = this.getUpVectorForCorner(lShapeCorner);
      console.log('🔄 L-shape corner:', lShapeCorner, '-> Target up vector:', targetUp);

      // Animate the perspective camera to top-down view with correct rotation
      await this.cameraTransition.animateToTopDown(this.camera, roomCenter, {
        duration: 600,
        easing: Easing.easeInOutCubic,
        onUpdate: () => {
          // Force render during animation
          if (this.composer) {
            this.composer.render();
          } else if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
          }
        }
      }, targetUp);

      // Now switch to orthographic camera and apply 2D settings
      console.log('🔄 Camera flyover complete, switching to orthographic...');

      // Update orthographic frustum to current room size
      this.updateOrthographicFrustum();

      // Reset orthographic camera zoom and position to show full room with labels
      // Apply the same up vector rotation to orthographic camera
      if (this.orthographicCamera) {
        this.orthographicCamera.zoom = ORTHOGRAPHIC_SETTINGS.INITIAL_ZOOM;
        this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, 0);
        this.orthographicCamera.up.copy(targetUp);
        this.orthographicCamera.lookAt(0, 0, 0);
        this.orthographicCamera.updateProjectionMatrix();
      }

      // Update view mode
      this.viewMode = '2d';

      // Update post-processing to use orthographic camera
      this.updatePostProcessingCamera();

      // Disable fog in 2D mode for cleaner view
      if (this.scene) {
        this.scene.fog = null;
      }

      // Disable wall culling in 2D mode (we want to see all walls from above)
      this.wallCullingManager.setEnabled(false);

      // Show blueprint grid (10cm spacing) in 2D mode for plan view
      if (this.blueprintGridRef) {
        this.blueprintGridRef.visible = true; // SHOW the blueprint grid in 2D mode
      }
      if (this.gridRef) {
        this.gridRef.visible = false; // Hide the regular 15cm grid
      }
      // Hide wall grid in 2D mode for cleaner view
      if (this.wallGridGroup) {
        this.wallGridGroup.visible = false;
      }

      // Switch to flat 2D lighting (no shadows, even illumination)
      this.switchTo2DLighting();

      // Create 2D schematic overlays for thin objects (shower screens, mirrors)
      this.create2DSchematicOverlays();

      // Notify event handlers of mode change and pass orthographic camera
      if (this.eventHandlers) {
        if (typeof this.eventHandlers.setViewMode === 'function') {
          this.eventHandlers.setViewMode('2d');
        }
        if (typeof this.eventHandlers.setOrthographicCamera === 'function' && this.orthographicCamera) {
          this.eventHandlers.setOrthographicCamera(this.orthographicCamera);
        }
      }

      // Apply transparency to tall objects to prevent obscuring shorter items
      this.adjustTallObjectsForBlueprintView();

      // Show wall dimension labels in 2D mode
      if (this.measurementSystem) {
        this.measurementSystem.setWallLabelsVisible(true);
      }

      console.log('✅ Animated transition to 2D Blueprint view complete');
    } catch (error) {
      console.error('❌ Error during 2D view transition:', error);
      throw error;
    } finally {
      this.isViewTransitioning = false;
    }
  }

  /**
   * Switch to 3D perspective view
   * Features smooth camera descent animation for immersive transition
   */
  public async switchTo3D(): Promise<void> {
    if (this.viewMode === '3d' || !this.camera) return;
    if (this.isViewTransitioning) return; // Prevent double-clicks during animation

    console.log('🔄 Starting animated transition to 3D view...');
    this.isViewTransitioning = true;

    try {
      // Calculate room center
      const roomCenter = new THREE.Vector3(0, 0, 0);

      // Get L-shape corner to determine starting camera rotation (matches 2D view orientation)
      const lShapeCorner = localStorage.getItem('l-shape-corner-active');
      const startUpVector = this.getUpVectorForCorner(lShapeCorner);
      console.log('🔄 L-shape corner:', lShapeCorner, '-> Start up vector:', startUpVector);

      // Determine target camera state (restored position or default)
      const targetState = {
        position: this.stored3DState?.position.clone() || new THREE.Vector3(
          CAMERA_SETTINGS.INITIAL_POSITION.x,
          CAMERA_SETTINGS.INITIAL_POSITION.y,
          CAMERA_SETTINGS.INITIAL_POSITION.z
        ),
        lookAt: this.stored3DState?.target.clone() || new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z),
        up: new THREE.Vector3(0, 1, 0) // Standard up vector for 3D
      };

      // First, switch to perspective camera at top-down position
      // This creates continuity from the orthographic view (matching its rotation)
      this.camera.position.set(roomCenter.x, CameraTransition.TOP_DOWN_HEIGHT, roomCenter.z);
      this.camera.up.copy(startUpVector); // Match orthographic orientation for this corner
      this.camera.lookAt(roomCenter);

      // Update view mode immediately so rendering uses perspective camera
      this.viewMode = '3d';

      // Update post-processing to use perspective camera
      this.updatePostProcessingCamera();

      // Re-enable fog in 3D mode
      if (this.scene) {
        this.scene.fog = new THREE.Fog(0xE6E1DA, 1000, 5000);
      }

      // Re-enable wall culling in 3D mode
      this.wallCullingManager.setEnabled(true);

      // Hide blueprint grid, show regular grid
      if (this.blueprintGridRef) {
        this.blueprintGridRef.visible = false;
      }
      if (this.gridRef) {
        this.gridRef.visible = true;
      }
      // Restore wall grid visibility based on previous state
      if (this.wallGridGroup) {
        this.wallGridGroup.visible = this.wallGridVisible;
      }

      // Notify event handlers of mode change
      if (this.eventHandlers && typeof this.eventHandlers.setViewMode === 'function') {
        this.eventHandlers.setViewMode('3d');
      }

      // Restore full opacity to tall objects
      this.restoreTallObjectsOpacity();

      // Restore 3D lighting with shadows
      this.switchTo3DLighting();

      // Remove 2D schematic overlays
      this.remove2DSchematicOverlays();

      // Hide wall dimension labels in 3D mode
      if (this.measurementSystem) {
        this.measurementSystem.setWallLabelsVisible(false);
      }

      // Now animate the camera from top-down to the target 3D position
      // Pass the startUpVector to ensure smooth transition from rotated 2D view
      await this.cameraTransition.animateFromTopDown(
        this.camera,
        targetState,
        roomCenter,
        {
          duration: 600,
          easing: Easing.easeInOutCubic,
          onUpdate: () => {
            // Force render during animation
            if (this.composer) {
              this.composer.render();
            } else if (this.renderer && this.scene && this.camera) {
              this.renderer.render(this.scene, this.camera);
            }
          }
        },
        startUpVector
      );

      // Sync with EventHandlers target position after animation completes
      if (this.eventHandlers && typeof this.eventHandlers.syncTargetCameraPosition === 'function') {
        this.eventHandlers.syncTargetCameraPosition();
      }

      console.log('✅ Animated transition to 3D view complete');
    } catch (error) {
      console.error('❌ Error during 3D view transition:', error);
      throw error;
    } finally {
      this.isViewTransitioning = false;
    }
  }

  /**
   * Get the currently active camera (perspective or orthographic)
   */
  public getActiveCamera(): THREE.Camera | null {
    if (this.viewMode === '2d') {
      return this.orthographicCamera;
    }
    return this.camera;
  }

  /**
   * Update post-processing passes to use the active camera
   */
  private updatePostProcessingCamera(): void {
    const activeCamera = this.getActiveCamera();
    if (!activeCamera || !this.scene) return;

    // Recreate composer with new camera
    // The RenderPass and OutlinePass need to be recreated with the new camera
    // since they store camera reference internally
    this.setupPostProcessing();

    // Update measurement system camera
    if (this.measurementSystem) {
      this.measurementSystem.updateCamera(activeCamera);
    }
  }

  /**
   * Set room dimensions (called from Planner when room size changes)
   * Updates orthographic frustum accordingly
   */
  public setRoomDimensions(width: number, height: number): void {
    this.roomWidth = width;
    this.roomHeight = height;

    // Update orthographic camera frustum if in 2D mode
    if (this.viewMode === '2d') {
      this.updateOrthographicFrustum();
    }
  }

  /**
   * Get current view mode
   */
  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  /**
   * Set view mode - single source of truth for view mode changes
   * This is the primary entry point for changing view modes from external components
   * Internally calls switchTo2D or switchTo3D and notifies EventHandlers
   */
  public async setViewMode(mode: ViewMode): Promise<void> {
    if (mode === this.viewMode) return;

    if (mode === '2d') {
      await this.switchTo2D();
    } else {
      await this.switchTo3D();
    }
  }

  /**
   * Check if a view transition animation is currently in progress
   */
  public isTransitioning(): boolean {
    return this.isViewTransitioning;
  }

  /**
   * Zoom in 2D mode (adjusts orthographic camera zoom)
   */
  public zoom2D(delta: number): void {
    if (!this.orthographicCamera || this.viewMode !== '2d') return;

    const newZoom = this.orthographicCamera.zoom * (1 + delta);
    this.orthographicCamera.zoom = Math.max(
      ORTHOGRAPHIC_SETTINGS.MIN_ZOOM,
      Math.min(ORTHOGRAPHIC_SETTINGS.MAX_ZOOM, newZoom)
    );
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Pan in 2D mode (moves orthographic camera position)
   * Accounts for camera rotation (up vector) to ensure pan direction matches screen movement
   */
  public pan2D(deltaX: number, deltaZ: number): void {
    if (!this.orthographicCamera || this.viewMode !== '2d') return;

    // Scale pan amount by zoom level for consistent feel
    const panScale = ORTHOGRAPHIC_SETTINGS.PAN_SPEED / this.orthographicCamera.zoom;

    // Transform screen deltas to world deltas based on camera's up vector
    // The up vector determines how screen coordinates map to world coordinates
    // Note: deltaX/deltaZ come pre-negated from eventHandlers for "grab-and-drag" feel
    const up = this.orthographicCamera.up;

    let worldDeltaX: number;
    let worldDeltaZ: number;

    if (Math.abs(up.z) > 0.5) {
      // Up is along Z axis (default or 180° rotation)
      if (up.z < 0) {
        // Default: up = (0, 0, -1) - north at top
        // Screen right = +X, Screen up = -Z
        worldDeltaX = deltaX;
        worldDeltaZ = deltaZ;
      } else {
        // 180° rotation: up = (0, 0, 1) - south at top
        // Screen right = -X, Screen up = +Z
        worldDeltaX = -deltaX;
        worldDeltaZ = -deltaZ;
      }
    } else {
      // Up is along X axis (90° rotation)
      if (up.x < 0) {
        // 90° CW: up = (-1, 0, 0) - west at top
        // Screen right = -Z, Screen up = -X
        worldDeltaX = deltaZ;
        worldDeltaZ = -deltaX;
      } else {
        // 90° CCW: up = (1, 0, 0) - east at top
        // Screen right = +Z, Screen up = +X
        worldDeltaX = -deltaZ;
        worldDeltaZ = deltaX;
      }
    }

    this.orthographicCamera.position.x += worldDeltaX * panScale;
    this.orthographicCamera.position.z += worldDeltaZ * panScale;
  }

  /**
   * Reset 2D view to center on room
   */
  public reset2DView(): void {
    if (!this.orthographicCamera || this.viewMode !== '2d') return;

    this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, 0);
    this.orthographicCamera.zoom = ORTHOGRAPHIC_SETTINGS.INITIAL_ZOOM;
    this.orthographicCamera.updateProjectionMatrix();
  }

  // Threshold height for tall objects (in cm) - objects taller than this get transparency in 2D mode
  private static readonly TALL_OBJECT_HEIGHT_THRESHOLD = 180;
  // Transparency level for tall objects in 2D mode (0.5 = 50% transparent)
  private static readonly TALL_OBJECT_2D_OPACITY = 0.5;
  // Store original material states for restoration
  private originalMaterialStates: Map<THREE.Material, { opacity: number; transparent: boolean }> = new Map();

  /**
   * Apply transparency to tall objects (height > 180cm) in 2D Blueprint view
   * This prevents tall objects like shower screens from obscuring shorter floor items
   */
  private adjustTallObjectsForBlueprintView(): void {
    console.log('📐 Adjusting tall objects for 2D Blueprint view...');

    this.existingItems.forEach((model, itemId) => {
      const dimensions = model.userData.dimensions;
      if (!dimensions) return;

      // Check if object is taller than threshold
      const objectHeight = dimensions.height * (model.scale.y || 1);
      if (objectHeight > SceneManager.TALL_OBJECT_HEIGHT_THRESHOLD) {
        console.log(`  🔍 Tall object found: Item ${itemId} (height: ${objectHeight.toFixed(0)}cm)`);

        // Traverse all meshes in the model and apply transparency
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];

            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
                // Store original state if not already stored
                if (!this.originalMaterialStates.has(material)) {
                  this.originalMaterialStates.set(material, {
                    opacity: material.opacity,
                    transparent: material.transparent
                  });
                }

                // Apply transparency
                material.transparent = true;
                material.opacity = SceneManager.TALL_OBJECT_2D_OPACITY;
                material.needsUpdate = true;
              }
            });
          }
        });
      }
    });
  }

  /**
   * Restore full opacity to all objects when returning to 3D view
   */
  private restoreTallObjectsOpacity(): void {
    console.log('🔄 Restoring tall objects opacity for 3D view...');

    // Restore all materials to their original states
    this.originalMaterialStates.forEach((originalState, material) => {
      material.opacity = originalState.opacity;
      material.transparent = originalState.transparent;
      material.needsUpdate = true;
    });

    // Clear stored states
    this.originalMaterialStates.clear();
  }

  /**
   * Switch lighting to flat 2D mode - disables shadows and increases ambient light
   * This makes the plan view cleaner and edges easier to see
   */
  private switchTo2DLighting(): void {
    console.log('💡 Switching to flat 2D lighting mode...');

    // Disable shadow rendering for clean 2D view
    if (this.renderer) {
      this.shadowsEnabled = this.renderer.shadowMap.enabled;
      this.renderer.shadowMap.enabled = false;
      // Balanced tone mapping exposure
      this.renderer.toneMappingExposure = 1.2;
    }

    // Adjust ambient light for even illumination
    this.lights.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        this.originalAmbientIntensity = light.intensity;
        light.intensity = 1.5; // Balanced even lighting
      }
      // Disable point lights for flat appearance
      if (light instanceof THREE.PointLight) {
        light.visible = false;
      }
    });

    // Disable shadows on floor and walls
    if (this.floorRef) {
      this.floorRef.receiveShadow = false;
    }
    this.wallRefs.forEach(wall => {
      wall.receiveShadow = false;
    });

    console.log('✅ 2D lighting mode enabled - shadows disabled, ambient light increased');
  }

  /**
   * Restore 3D lighting with shadows
   */
  private switchTo3DLighting(): void {
    console.log('💡 Restoring 3D lighting mode...');

    // Re-enable shadow rendering
    if (this.renderer) {
      this.renderer.shadowMap.enabled = this.shadowsEnabled;
      this.renderer.toneMappingExposure = 1.2;
    }

    // Restore ambient light intensity
    this.lights.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        light.intensity = this.originalAmbientIntensity;
      }
      // Re-enable point lights
      if (light instanceof THREE.PointLight) {
        light.visible = true;
      }
    });

    // Re-enable shadows on floor and walls
    if (this.floorRef) {
      this.floorRef.receiveShadow = true;
    }
    this.wallRefs.forEach(wall => {
      wall.receiveShadow = true;
    });

    console.log('✅ 3D lighting mode restored');
  }

  /**
   * Get the schematic type for an object in 2D view
   * All objects get a schematic representation for visibility
   */
  private getSchematicType(model: THREE.Object3D): 'shower' | 'mirror' | 'bath' | 'toilet' | 'sink' | 'radiator' | 'furniture' | 'generic' {
    const itemType = model.userData.type || ''; // ComponentType like 'Shower', 'Mirror', 'Bath'
    const sku = (model.userData.sku || '').toLowerCase();

    // Check exact ComponentType match (these are exact strings like 'Shower', 'Mirror', 'Bath')
    if (itemType === 'Shower') {
      return 'shower';
    }

    if (itemType === 'Mirror') {
      return 'mirror';
    }

    if (itemType === 'Bath') {
      return 'bath';
    }

    if (itemType === 'Toilet') {
      return 'toilet';
    }

    if (itemType === 'Sink') {
      return 'sink';
    }

    if (itemType === 'Radiator' || itemType === 'TowelRails') {
      return 'radiator';
    }

    if (itemType === 'Furniture') {
      return 'furniture';
    }

    // Fallback: check SKU patterns
    if (sku.includes('c46')) {
      return 'shower';
    }

    if (sku.startsWith('73')) {
      return 'mirror';
    }

    if (sku.includes('c51')) {
      return 'bath';
    }

    // All other objects get a generic schematic
    return 'generic';
  }

  /**
   * Get dimensions for a model from various sources
   */
  private getModelDimensions(model: THREE.Object3D): { width: number; height: number; depth: number } | null {
    // Try userData.dimensions first
    if (model.userData.dimensions) {
      return model.userData.dimensions;
    }

    // Try userData.model.dimensions
    if (model.userData.model?.dimensions) {
      return model.userData.model.dimensions;
    }

    // Try to calculate from bounding box
    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      // Size is in world units, return as dimensions
      return {
        width: size.x,
        height: size.y,
        depth: size.z
      };
    }

    return null;
  }

  /**
   * Create 2D schematic overlays for objects that are hard to see from top-down view
   * These are architectural-style floor plan symbols
   */
  private create2DSchematicOverlays(): void {
    console.log('📐 Creating 2D schematic overlays...');
    console.log(`📐 Total items in existingItems: ${this.existingItems.size}`);

    this.existingItems.forEach((model, itemId) => {
      const dimensions = this.getModelDimensions(model);

      console.log(`📐 Processing Item ${itemId}:`, {
        type: model.userData.type,
        sku: model.userData.sku,
        hasDimensions: !!dimensions,
        dimensions: dimensions,
        position: model.position.toArray()
      });

      if (!dimensions) {
        console.log(`  ⚠️ Item ${itemId} has no dimensions, skipping`);
        return;
      }

      const schematicType = this.getSchematicType(model);
      console.log(`  🔍 Item ${itemId} schematic type: ${schematicType}`);

      // Get the bounding box center for positioning
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      // Use the MODEL's original dimensions (not bounding box) so rotation works correctly
      // The schematic will be created with these dimensions and then rotated to match the model
      const width = dimensions.width;
      const depth = dimensions.depth;
      const schematicHeight = 50; // Height above floor for visibility

      console.log(`  📐 Creating ${schematicType} schematic for Item ${itemId}`, {
        originalDimensions: dimensions,
        center: { x: center.x, z: center.z },
        rotation: model.rotation.y,
        type: model.userData.type,
        sku: model.userData.sku
      });

      // Create a schematic overlay group
      const schematicGroup = new THREE.Group();
      schematicGroup.name = `Schematic2D_${itemId}`;

      // Different schematic styles based on object type
      switch (schematicType) {
        case 'shower':
          this.createShowerSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'mirror':
          this.createMirrorSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'bath':
          this.createBathSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'toilet':
          this.createToiletSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'sink':
          this.createSinkSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'radiator':
          this.createRadiatorSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'furniture':
          this.createFurnitureSchematic(schematicGroup, width, depth, schematicHeight);
          break;
        case 'generic':
        default:
          this.createGenericSchematic(schematicGroup, width, depth, schematicHeight);
          break;
      }

      // Position the schematic at the object's actual center (from bounding box)
      schematicGroup.position.set(center.x, 0, center.z); // At floor level, centered on object

      // Apply the model's rotation so the schematic matches the object's orientation
      schematicGroup.rotation.y = model.rotation.y;

      // Add userData to link schematic to its bathroom item for raycasting/selection
      schematicGroup.userData.isSchematic2D = true;
      schematicGroup.userData.linkedItemId = itemId;
      schematicGroup.userData.linkedModel = model;

      // Add to scene
      if (this.scene) {
        this.scene.add(schematicGroup);
        this.schematic2DOverlays.set(itemId, schematicGroup);
        console.log(`  ✅ Schematic added for Item ${itemId}`);
      }
    });

    console.log(`📐 Total schematics created: ${this.schematic2DOverlays.size}`);
  }

  /**
   * Create a schematic for a single item (used when adding items while in 2D mode)
   */
  public createSchematicForItem(itemId: number): void {
    if (this.viewMode !== '2d') return;

    // Don't create duplicate schematics
    if (this.schematic2DOverlays.has(itemId)) return;

    const model = this.existingItems.get(itemId);
    if (!model) return;

    const dimensions = this.getModelDimensions(model);
    if (!dimensions) return;

    const schematicType = this.getSchematicType(model);

    // Get the bounding box center for positioning
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    const width = dimensions.width;
    const depth = dimensions.depth;
    const schematicHeight = 50;

    // Create a schematic overlay group
    const schematicGroup = new THREE.Group();
    schematicGroup.name = `Schematic2D_${itemId}`;

    // Different schematic styles based on object type
    switch (schematicType) {
      case 'shower':
        this.createShowerSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'mirror':
        this.createMirrorSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'bath':
        this.createBathSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'toilet':
        this.createToiletSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'sink':
        this.createSinkSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'radiator':
        this.createRadiatorSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'furniture':
        this.createFurnitureSchematic(schematicGroup, width, depth, schematicHeight);
        break;
      case 'generic':
      default:
        this.createGenericSchematic(schematicGroup, width, depth, schematicHeight);
        break;
    }

    // Position and rotate
    schematicGroup.position.set(center.x, 0, center.z);
    schematicGroup.rotation.y = model.rotation.y;

    // Add userData to link schematic to its bathroom item
    schematicGroup.userData.isSchematic2D = true;
    schematicGroup.userData.linkedItemId = itemId;
    schematicGroup.userData.linkedModel = model;

    // Add to scene
    if (this.scene) {
      this.scene.add(schematicGroup);
      this.schematic2DOverlays.set(itemId, schematicGroup);
      console.log(`📐 Created schematic for newly added Item ${itemId}`);
    }
  }

  /**
   * Remove schematic for a single item (used when removing items while in 2D mode)
   */
  public removeSchematicForItem(itemId: number): void {
    const schematic = this.schematic2DOverlays.get(itemId);
    if (schematic && this.scene) {
      this.scene.remove(schematic);
      schematic.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.schematic2DOverlays.delete(itemId);
      console.log(`🗑️ Removed schematic for Item ${itemId}`);
    }
  }

  /**
   * Create shower enclosure schematic - rectangle with diagonal cross (glass symbol)
   */
  private createShowerSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const borderThickness = 5; // Thick border to represent glass panels

    // Solid filled background (bright cyan for glass/water - very visible)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x00bfff, // Bright cyan
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false, // Always render on top
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999; // Render on top
    group.add(fillMesh);

    // Thick border (dark blue)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x0000ff, // Pure blue
      linewidth: 3,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Diagonal cross (X pattern - architectural symbol for glass)
    const crossGeometry = new THREE.BufferGeometry();
    const crossVertices = new Float32Array([
      -halfWidth + borderThickness, height + 2, -halfDepth + borderThickness,
      halfWidth - borderThickness, height + 2, halfDepth - borderThickness,
      -halfWidth + borderThickness, height + 2, halfDepth - borderThickness,
      halfWidth - borderThickness, height + 2, -halfDepth + borderThickness,
    ]);
    crossGeometry.setAttribute('position', new THREE.BufferAttribute(crossVertices, 3));
    const crossMaterial = new THREE.LineBasicMaterial({
      color: 0x0000ff,
      linewidth: 2,
      depthTest: false,
    });
    const crossLines = new THREE.LineSegments(crossGeometry, crossMaterial);
    crossLines.renderOrder = 1001;
    group.add(crossLines);

    // Add "SHOWER" text indicator with a small icon
    this.addSchematicLabel(group, '🚿', width, depth, height);
  }

  /**
   * Create mirror schematic - rectangle with reflection pattern
   */
  private createMirrorSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (bright silver for mirror - very visible)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0e0e0, // Bright silver
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (dark gray)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Add mirror icon
    this.addSchematicLabel(group, '🪞', width, depth, height);
  }

  /**
   * Create bath schematic - oval/rounded rectangle shape
   */
  private createBathSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Create an oval-ish shape for the bath
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const cornerRadius = Math.min(halfWidth, halfDepth) * 0.3;

    // Rounded rectangle path
    shape.moveTo(-halfWidth + cornerRadius, -halfDepth);
    shape.lineTo(halfWidth - cornerRadius, -halfDepth);
    shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + cornerRadius);
    shape.lineTo(halfWidth, halfDepth - cornerRadius);
    shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - cornerRadius, halfDepth);
    shape.lineTo(-halfWidth + cornerRadius, halfDepth);
    shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - cornerRadius);
    shape.lineTo(-halfWidth, -halfDepth + cornerRadius);
    shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + cornerRadius, -halfDepth);

    const bathGeometry = new THREE.ShapeGeometry(shape);
    const bathMaterial = new THREE.MeshBasicMaterial({
      color: 0x40e0d0, // Turquoise - very visible
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const bathMesh = new THREE.Mesh(bathGeometry, bathMaterial);
    bathMesh.rotation.x = -Math.PI / 2;
    bathMesh.position.y = height;
    bathMesh.renderOrder = 999;
    group.add(bathMesh);

    // Border
    const borderPoints = shape.getPoints(32);
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(
      borderPoints.map(p => new THREE.Vector3(p.x, height + 1, p.y))
    );
    // Close the loop
    const firstPoint = borderPoints[0];
    const positions = borderGeometry.attributes.position.array as Float32Array;
    const newPositions = new Float32Array(positions.length + 3);
    newPositions.set(positions);
    newPositions[positions.length] = firstPoint.x;
    newPositions[positions.length + 1] = height + 1;
    newPositions[positions.length + 2] = firstPoint.y;
    borderGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));

    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x008b8b, // Dark cyan
      linewidth: 2,
      depthTest: false,
    });
    const borderLine = new THREE.Line(borderGeometry, borderMaterial);
    borderLine.renderOrder = 1000;
    group.add(borderLine);

    // Add bath icon
    this.addSchematicLabel(group, '🛁', width, depth, height);
  }

  /**
   * Create generic schematic for objects
   */
  private createGenericSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (bright green)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x32cd32, // Lime green - very visible
      opacity: 0.6,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (dark green)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x006400, // Dark green
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);
  }

  /**
   * Create toilet schematic - white/gray rounded rectangle
   */
  private createToiletSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (white)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5f5f5, // Off-white
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (dark gray)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Add toilet icon
    this.addSchematicLabel(group, '🚽', width, depth, height);
  }

  /**
   * Create sink schematic - light blue rectangle
   */
  private createSinkSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (light blue)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb, // Sky blue
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (darker blue)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x4169e1, // Royal blue
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Add sink icon
    this.addSchematicLabel(group, '🚰', width, depth, height);
  }

  /**
   * Create radiator schematic - orange/red rectangle with lines
   */
  private createRadiatorSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (orange)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa500, // Orange
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (dark orange/red)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0xcc4400, // Dark orange
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Add radiator icon
    this.addSchematicLabel(group, '♨️', width, depth, height);
  }

  /**
   * Create furniture schematic - vanity units (sink with cabinet)
   */
  private createFurnitureSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    // Solid filled background (light teal - similar to sink but slightly different)
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x5f9ea0, // Cadet blue (teal)
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.y = height;
    fillMesh.renderOrder = 999;
    group.add(fillMesh);

    // Border (darker teal)
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x2f4f4f, // Dark slate gray
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Add sink icon for vanity units
    this.addSchematicLabel(group, '🚰', width, depth, height);
  }

  /**
   * Add a label/icon to the schematic (uses a sprite for visibility)
   */
  private addSchematicLabel(group: THREE.Group, icon: string, width: number, depth: number, height: number): void {
    // Create a canvas for the icon
    const canvas = document.createElement('canvas');
    const size = 256; // Larger for better quality
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dark circle background for better contrast
    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw bright border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw the icon (larger and centered)
    ctx.font = `${size * 0.55}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, size/2, size/2 + 4);

    // Create sprite from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 1002; // Render on top of everything

    // Size and position the sprite - make it larger and higher
    const spriteSize = Math.max(Math.min(width, depth) * 0.5, 20); // At least 20cm
    sprite.scale.set(spriteSize, spriteSize, 1);
    sprite.position.set(0, height + 20, 0); // Well above the schematic

    group.add(sprite);
  }

  /**
   * Update schematic overlay position and rotation for a specific item (called when object moves/rotates)
   */
  public updateSchematicPosition(itemId: number): void {
    if (this.viewMode !== '2d') return;

    const schematic = this.schematic2DOverlays.get(itemId);
    const model = this.existingItems.get(itemId);

    if (schematic && model) {
      // Recalculate position from bounding box
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      schematic.position.set(center.x, 0, center.z);

      // Sync rotation with the model
      schematic.rotation.y = model.rotation.y;
    }
  }

  /**
   * Update all schematic overlay positions and rotations (called after any object movement)
   */
  public updateAllSchematicPositions(): void {
    if (this.viewMode !== '2d') return;

    this.schematic2DOverlays.forEach((schematic, itemId) => {
      const model = this.existingItems.get(itemId);
      if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        schematic.position.set(center.x, 0, center.z);

        // Sync rotation with the model
        schematic.rotation.y = model.rotation.y;
      }
    });
  }

  /**
   * Remove all 2D schematic overlays when switching to 3D view
   */
  private remove2DSchematicOverlays(): void {
    console.log('🗑️ Removing 2D schematic overlays...');

    this.schematic2DOverlays.forEach((overlay, _itemId) => {
      if (this.scene) {
        this.scene.remove(overlay);
      }
      // Dispose of geometries and materials
      overlay.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.LineSegments || child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        // Also handle sprites
        if (child instanceof THREE.Sprite) {
          if (child.material.map) {
            child.material.map.dispose();
          }
          child.material.dispose();
        }
      });
    });

    this.schematic2DOverlays.clear();
  }

  // ============================================================================
  // END 2D BLUEPRINT VIEW METHODS
  // ============================================================================

  private hasItemChanged(model: THREE.Object3D, item: BathroomItem): boolean {
    const currentPos = model.position;
    const currentRot = model.rotation;
    const currentScale = model.scale;

    const posChanged =
      Math.abs(currentPos.x - item.position[0]) > 0.01 ||
      Math.abs(currentPos.y - item.position[1]) > 0.01 ||
      Math.abs(currentPos.z - item.position[2]) > 0.01;

    const rotChanged = Math.abs(currentRot.y - (item.rotation || 0)) > 0.01;

    const scaleChanged = Math.abs(currentScale.x - (item.scale || 1.0)) > 0.01;

    return posChanged || rotChanged || scaleChanged;
  }

  // Helper method to update existing model properties
  private updateExistingModel(model: THREE.Object3D, item: BathroomItem): void {
    // Update position
    model.position.set(item.position[0], item.position[1], item.position[2]);

    // Update rotation
    model.rotation.y = item.rotation || 0;

    // Update scale
    const scale = item.scale || 1.0;
    model.scale.set(scale, scale, scale);

    // ✅ CRITICAL FIX: Ensure orientation data is maintained in userData
    if (!model.userData.orientation && item.model?.orientation) {
      model.userData.orientation = item.model.orientation;
      console.log(`✅ Restored orientation data to existing model ${item.id}:`, model.userData.orientation);
    }

    // ✅ Also ensure other critical userData is maintained
    if (!model.userData.sku && item.sku) {
      model.userData.sku = item.sku;
    }

    if (!model.userData.model && item.model) {
      model.userData.model = item.model;
    }

    console.log(`✅ Updated item ${item.id} properties with preserved orientation:`, {
      position: model.position,
      rotation: model.rotation.y,
      scale: model.scale.x,
      orientation: model.userData.orientation
    });
  }

  // Helper method to properly dispose of models
  private disposeModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  // Add method to add single item (for real-time adding)
  // Method to add single item (for real-time adding from Planner.vue)
  async addSingleItem(item: BathroomItem): Promise<void> {

    console.log('addSingleItem called with item:', item);

    if (this.existingItems.has(item.id)) {
      console.log(`Item ${item.id} already exists, updating instead`);
      const existingModel = this.existingItems.get(item.id);
      if (existingModel) {
        this.updateExistingModel(existingModel, item);
      }
      return;
    }

    console.log(`➕ Adding single item ${item.id} to scene`);

    try {
      const model = await createModel(
        item.type,
        item.position,
        item.rotation,
        item.scale,
        item.model,
        item.sku
      );

      if (model) {
        model.userData.isBathroomItem = true;
        model.userData.itemId = item.id;
        model.userData.type = item.type;

        // ✅ CRITICAL FIX: Store orientation data in userData (same as updateBathroomItems)
        model.userData.orientation = getOrientationForItem(item);

        // ✅ ALSO STORE: Additional data for debugging and drag operations
        if (item.sku) {
          model.userData.sku = item.sku;
        }

        if (item.model) {
          model.userData.model = item.model;
        }

        console.log(`✅ Stored orientation in addSingleItem:`, model.userData.orientation);
        console.log(`✅ All userData stored:`, {
          itemId: model.userData.itemId,
          type: model.userData.type,
          sku: model.userData.sku,
          orientation: model.userData.orientation
        });

        this.debugModelVisibility(model, item);
        this.enhanceModelMaterials(model);

        this.bathroomItemsGroup.add(model);
        this.existingItems.set(item.id, model);
        console.log(`✅ Successfully added item ${item.id}`);

        // Create schematic if in 2D mode
        if (this.viewMode === '2d') {
          this.createSchematicForItem(item.id);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to add single item ${item.id}:`, error);
      throw error;
    }
  }

  // Method to remove single item (for real-time deletion from Planner.vue)
  removeSingleItem(itemId: number): void {
    const existingModel = this.existingItems.get(itemId);
    if (existingModel) {
      console.log(`🗑️ Removing single item ${itemId} from scene`);

      // Remove schematic if it exists
      this.removeSchematicForItem(itemId);

      this.bathroomItemsGroup.remove(existingModel);
      this.existingItems.delete(itemId);
      this.disposeModel(existingModel);
      console.log(`✅ Successfully removed item ${itemId}`);
    } else {
      console.warn(`⚠️ Item ${itemId} not found in scene for removal`);
    }
  }

  // ============================================================================
  // PROGRESSIVE LOADING METHODS
  // ============================================================================

  /**
   * Add an item progressively - shows placeholder immediately, then swaps to full model
   * This provides instant visual feedback while the actual model loads
   */
  async addSingleItemProgressively(
    item: BathroomItem,
    callbacks?: {
      onPlaceholderAdded?: (placeholder: THREE.Group) => void;
      onFullModelAdded?: (model: THREE.Group) => void;
      onProgress?: (progress: number) => void;
    }
  ): Promise<THREE.Group> {
    console.log('🔄 SceneManager.addSingleItemProgressively called:', {
      itemId: item.id,
      sku: item.sku,
      modelName: item.model?.name
    });

    // Check if item already exists
    if (this.existingItems.has(item.id)) {
      console.log(`⚠️ Progressive: Item ${item.id} already exists, updating instead`);
      const existingModel = this.existingItems.get(item.id);
      if (existingModel) {
        this.updateExistingModel(existingModel, item);
        return existingModel as THREE.Group;
      }
    }

    const progressiveLoader = ProgressiveModelLoader.getInstance();
    const modelManager = ModelManager.getInstance();
    const sku = item.sku || item.model?.name || `item_${item.id}`;

    console.log('🔍 SceneManager - Checking cache for SKU:', sku);

    // Check if model is already cached - use fast path
    const isCached = modelManager.isModelCached(sku);
    console.log('🔍 SceneManager - Model cached?', isCached);

    if (isCached) {
      console.log(`✅ Progressive: Model ${sku} cached, using fast path (no placeholder)`);
      await this.addSingleItem(item);
      const model = this.existingItems.get(item.id) as THREE.Group;
      callbacks?.onProgress?.(100);
      callbacks?.onFullModelAdded?.(model);
      return model;
    }

    console.log('🔲 SceneManager - Model NOT cached, will show placeholder for:', sku);

    // Model not cached - use progressive loading
    // Ensure dimensions are always defined for placeholder creation
    const defaultDimensions = { width: 50, height: 50, depth: 50 };
    const modelConfig = item.model
      ? {
        ...item.model,
        dimensions: item.model.dimensions || defaultDimensions
      }
      : {
        name: sku,
        path: '',
        dimensions: defaultDimensions
      };

    console.log('🔲 SceneManager - Progressive loading config:', {
      dimensions: modelConfig.dimensions,
      itemPosition: item.position,
      itemRotation: item.rotation,
      modelScale: modelConfig.scale
    });

    let placeholderInScene: THREE.Group | null = null;

    const model = await progressiveLoader.loadProgressively(
      sku,
      modelConfig,
      {
        onPlaceholderReady: (placeholder) => {
          // Get positioning parameters from model config
          const floorOffset = item.model?.floorOffset || 0;
          const spawnHeight = item.model?.spawnHeight || 0;

          // For wall-mounted models:
          // - spawnHeight: the Y position where the model origin is placed
          // - floorOffset: offset from origin to the visual bottom of the model
          // - Visual bottom = spawnHeight + floorOffset
          //
          // The placeholder geometry has its bottom at local y=0 (after geometry.translate)
          // So we need to position the placeholder so its bottom matches the model's visual bottom
          //
          // item.position[1] should already equal spawnHeight (set during item creation)
          // But we read spawnHeight from item.model to ensure consistency
          const placeholderY = spawnHeight + floorOffset;

          placeholder.position.set(
            item.position[0],
            placeholderY, // Position so placeholder bottom matches model's visual bottom
            item.position[2]
          );
          placeholder.rotation.y = item.rotation || 0;
          const scale = item.scale || 1.0;
          placeholder.scale.set(scale, scale, scale);

          // Set userData
          placeholder.userData.isBathroomItem = true;
          placeholder.userData.itemId = item.id;
          placeholder.userData.type = item.type;
          placeholder.userData.isPlaceholder = true;
          placeholder.userData.sku = item.sku;
          placeholder.userData.floorOffset = floorOffset;
          placeholder.userData.spawnHeight = spawnHeight;

          // Add to scene
          this.bathroomItemsGroup.add(placeholder);
          this.existingItems.set(item.id, placeholder);
          placeholderInScene = placeholder;

          // Calculate placeholder world bounds for logging
          const placeholderBox = new THREE.Box3().setFromObject(placeholder);
          const placeholderSize = placeholderBox.getSize(new THREE.Vector3());

          console.log(`🔲 Progressive: Placeholder added to scene for item ${item.id}`, {
            itemPosition: [item.position[0], item.position[1], item.position[2]],
            spawnHeight: spawnHeight,
            floorOffset: floorOffset,
            placeholderY: placeholderY,
            calculation: `spawnHeight(${spawnHeight}) + floorOffset(${floorOffset}) = ${placeholderY}`,
            rotation: item.rotation,
            configDimensions: modelConfig.dimensions,
            actualPlaceholderSize: {
              width: placeholderSize.x,
              height: placeholderSize.y,
              depth: placeholderSize.z
            }
          });
          callbacks?.onPlaceholderAdded?.(placeholder);
        },
        onFullModelReady: (fullModel) => {
          // Swap placeholder with full model
          if (placeholderInScene && placeholderInScene.parent) {
            // IMPORTANT: Wrap the loaded model in a Group to match createModel's structure
            // This ensures consistent behavior with dragging and selection
            const wrapper = new THREE.Group();
            // Use ORIGINAL item position (not placeholder position which has floorOffset added)
            // The model handles its own floorOffset internally
            wrapper.position.set(item.position[0], item.position[1], item.position[2]);
            wrapper.rotation.y = item.rotation || 0;
            // Scale stays at 1 for the wrapper - the model inside has the correct scale

            // Reset fullModel position to origin before adding to wrapper
            // (the wrapper's position handles the world position)
            fullModel.position.set(0, 0, 0);

            // Add the loaded model to the wrapper
            wrapper.add(fullModel);

            // Set userData on the wrapper (same as createModel does)
            wrapper.userData.isBathroomItem = true;
            wrapper.userData.itemId = item.id;
            wrapper.userData.type = item.type;
            wrapper.userData.orientation = getOrientationForItem(item);
            wrapper.userData.sku = item.sku;
            wrapper.userData.model = item.model;

            // Calculate model bounds for debugging
            const modelBox = new THREE.Box3().setFromObject(wrapper);
            const modelSize = modelBox.getSize(new THREE.Vector3());
            const modelCenter = modelBox.getCenter(new THREE.Vector3());

            console.log(`🔄 Progressive: Swapping placeholder with full model for item ${item.id}`, {
              originalItemPosition: [item.position[0], item.position[1], item.position[2]],
              placeholderPosition: placeholderInScene.position.toArray(),
              placeholderDimensions: placeholderInScene.userData.dimensions,
              wrapperPosition: wrapper.position.toArray(),
              fullModelScale: fullModel.scale.toArray(),
              fullModelBounds: {
                size: { x: modelSize.x, y: modelSize.y, z: modelSize.z },
                center: { x: modelCenter.x, y: modelCenter.y, z: modelCenter.z }
              },
              placeholderParent: !!placeholderInScene.parent
            });

            // Add wrapper (containing full model) and remove placeholder
            this.bathroomItemsGroup.add(wrapper);
            this.bathroomItemsGroup.remove(placeholderInScene);
            progressiveLoader.disposePlaceholder(placeholderInScene);

            // Update tracking with the wrapper (not the inner model)
            this.existingItems.set(item.id, wrapper);

            // Enhance materials on the inner model
            this.enhanceModelMaterials(fullModel);

            // Create schematic if in 2D mode
            if (this.viewMode === '2d') {
              this.createSchematicForItem(item.id);
            }

            console.log(`✅ Progressive: Full model swapped in for item ${item.id}`);
            callbacks?.onFullModelAdded?.(wrapper);
          } else {
            console.warn(`⚠️ Progressive: Cannot swap - placeholder missing or no parent`, {
              hasPlaceholder: !!placeholderInScene,
              hasParent: placeholderInScene?.parent ? true : false
            });
          }
        },
        onProgress: (progress) => {
          callbacks?.onProgress?.(progress);
        },
        onError: (error) => {
          console.error(`❌ Progressive: Failed to load model for item ${item.id}:`, error);
        }
      }
    );

    return model;
  }

  /**
   * Swap an existing item's model with a new variant progressively
   * Shows placeholder immediately while new variant loads
   */
  async swapItemVariantProgressively(
    itemId: number,
    newVariant: any,
    callbacks?: {
      onPlaceholderSwapped?: (placeholder: THREE.Group) => void;
      onFullModelSwapped?: (model: THREE.Group) => void;
      onProgress?: (progress: number) => void;
    },
    newPosition?: { x: number, y: number, z: number }
  ): Promise<THREE.Group | null> {
    const existingModel = this.existingItems.get(itemId);
    if (!existingModel) {
      console.error(`❌ Progressive: Item ${itemId} not found for variant swap`);
      return null;
    }

    console.log(`🔄 Progressive: Starting variant swap for item ${itemId}`);

    const progressiveLoader = ProgressiveModelLoader.getInstance();
    const modelManager = ModelManager.getInstance();
    const sku = newVariant.sku || newVariant.name;

    // Store original transform before swapping
    const originalPosition = existingModel.position.clone();
    if (newPosition) {
      console.log('📍 Progressive: Using new position for swap:', newPosition);
      originalPosition.set(newPosition.x, newPosition.y, newPosition.z);
    }
    const originalRotation = existingModel.rotation.clone();
    const originalScale = existingModel.scale.clone();
    const originalUserData = { ...existingModel.userData };

    // Check if new variant is cached - use fast path
    if (modelManager.isModelCached(sku)) {
      console.log(`✅ Progressive: Variant ${sku} cached, using fast path`);

      // Load the cached model
      const modelConfig = {
        name: newVariant.name || sku,
        path: newVariant.path,
        scale: newVariant.scale ?? 100, // Default to 100, not 1 (models are typically scaled up)
        dimensions: newVariant.dimensions,
        movement: newVariant.movement,
        orientation: newVariant.orientation
      };

      const newModel = await modelManager.loadModel(sku, modelConfig);

      // IMPORTANT: Wrap the model in a Group for consistent drag behavior
      const wrapper = new THREE.Group();
      wrapper.position.copy(originalPosition);
      wrapper.rotation.copy(originalRotation);
      // Wrapper scale stays at 1 - the model inside has the correct scale

      // Reset newModel position to origin (wrapper handles world position)
      newModel.position.set(0, 0, 0);
      newModel.rotation.set(0, 0, 0);

      // Add newModel to wrapper
      wrapper.add(newModel);

      // Set userData on the wrapper
      wrapper.userData = {
        ...originalUserData,
        isBathroomItem: true,
        itemId: itemId,
        sku: sku,
        model: modelConfig,
        type: originalUserData.type,
        orientation: newVariant.orientation || originalUserData.orientation,
        isPlaceholder: false
      };

      // Swap in scene
      this.bathroomItemsGroup.add(wrapper);
      this.bathroomItemsGroup.remove(existingModel);
      this.disposeModel(existingModel);
      this.existingItems.set(itemId, wrapper);

      this.enhanceModelMaterials(newModel);

      callbacks?.onProgress?.(100);
      callbacks?.onFullModelSwapped?.(wrapper);

      return wrapper;
    }

    // Model not cached - use progressive loading with placeholder
    const modelConfig = {
      name: newVariant.name || sku,
      path: newVariant.path,
      scale: newVariant.scale ?? 100, // Default to 100, not 1 (models are typically scaled up)
      dimensions: newVariant.dimensions,
      movement: newVariant.movement,
      orientation: newVariant.orientation,
      spawnHeight: newVariant.spawnHeight,
      floorOffset: newVariant.floorOffset
    };

    let placeholderInScene: THREE.Group | null = null;

    const newModel = await progressiveLoader.loadProgressively(
      sku,
      modelConfig,
      {
        onPlaceholderReady: (placeholder) => {
          // Get positioning parameters from new variant
          const spawnHeight = newVariant.spawnHeight || 0;
          const floorOffset = newVariant.floorOffset || 0;

          // For wall-mounted models, calculate proper Y position
          // Visual bottom = spawnHeight + floorOffset
          const placeholderY = spawnHeight + floorOffset;

          // Apply transform - use original X/Z but calculated Y for wall-mounted items
          placeholder.position.set(
            originalPosition.x,
            placeholderY, // Use calculated Y for proper wall-mounted positioning
            originalPosition.z
          );
          placeholder.rotation.copy(originalRotation);
          placeholder.scale.copy(originalScale);

          // Set userData
          placeholder.userData = {
            ...originalUserData,
            sku: sku,
            isPlaceholder: true,
            spawnHeight: spawnHeight,
            floorOffset: floorOffset
          };

          // Swap existing model with placeholder
          this.bathroomItemsGroup.add(placeholder);
          this.bathroomItemsGroup.remove(existingModel);
          this.disposeModel(existingModel);
          this.existingItems.set(itemId, placeholder);
          placeholderInScene = placeholder;

          console.log(`🔲 Progressive: Placeholder swapped for variant ${sku}`, {
            spawnHeight,
            floorOffset,
            placeholderY,
            calculation: `spawnHeight(${spawnHeight}) + floorOffset(${floorOffset}) = ${placeholderY}`
          });
          callbacks?.onPlaceholderSwapped?.(placeholder);
        },
        onFullModelReady: (fullModel) => {
          // Get positioning parameters from new variant
          const spawnHeight = newVariant.spawnHeight || 0;
          const floorOffset = newVariant.floorOffset || 0;

          console.log(`🔄 onFullModelReady called for item ${itemId}:`, {
            hasPlaceholderInScene: !!placeholderInScene,
            placeholderHasParent: placeholderInScene?.parent ? true : false,
            fullModelName: fullModel.name,
            spawnHeight,
            floorOffset
          });

          // Get the current model in the scene (could be placeholder or original)
          const currentModel = this.existingItems.get(itemId);

          // Determine position/rotation source
          // IMPORTANT: The placeholder's Y position includes floorOffset for visual display,
          // but the full model wrapper should use spawnHeight only because
          // the model handles floorOffset internally.
          let sourcePosition = originalPosition.clone();
          let sourceRotation = originalRotation;

          if (placeholderInScene) {
            // Use placeholder's X/Z position but calculate Y from spawnHeight only
            // (model handles floorOffset internally)
            sourcePosition.x = placeholderInScene.position.x;
            sourcePosition.y = spawnHeight; // NOT placeholder.position.y which has floorOffset added
            sourcePosition.z = placeholderInScene.position.z;
            sourceRotation = placeholderInScene.rotation.clone();
            console.log(`📍 Using placeholder X/Z with calculated Y for item ${itemId}:`, {
              placeholderY: placeholderInScene.position.y,
              wrapperY: spawnHeight,
              note: 'Model handles floorOffset internally'
            });
          } else if (currentModel) {
            sourcePosition = currentModel.position.clone();
            sourceRotation = currentModel.rotation.clone();
            console.log(`📍 Using currentModel transform for item ${itemId}`);
          } else {
            console.log(`📍 Using original transform for item ${itemId}`);
          }

          // IMPORTANT: Wrap the model in a Group for consistent drag behavior
          // This matches the structure used in addSingleItemProgressively and createModel
          const wrapper = new THREE.Group();
          wrapper.position.copy(sourcePosition);
          wrapper.rotation.copy(sourceRotation);
          // Wrapper scale stays at 1 - the model inside has the correct scale

          // Reset fullModel position to origin (wrapper handles world position)
          fullModel.position.set(0, 0, 0);
          fullModel.rotation.set(0, 0, 0);

          // Add fullModel to wrapper
          wrapper.add(fullModel);

          // Set userData on the wrapper (this is what drag system looks for)
          wrapper.userData = {
            ...originalUserData,
            isBathroomItem: true,
            itemId: itemId,
            sku: sku,
            model: modelConfig,
            type: originalUserData.type,
            orientation: newVariant.orientation || originalUserData.orientation,
            isPlaceholder: false
          };

          // Add wrapper to scene
          console.log(`➕ Adding wrapped fullModel to scene for item ${itemId}`, {
            wrapperPosition: [wrapper.position.x, wrapper.position.y, wrapper.position.z],
            fullModelScale: [fullModel.scale.x, fullModel.scale.y, fullModel.scale.z],
            visible: wrapper.visible,
            childrenCount: wrapper.children.length
          });
          this.bathroomItemsGroup.add(wrapper);
          console.log(`➕ Wrapper added. bathroomItemsGroup now has ${this.bathroomItemsGroup.children.length} children`);

          // Remove placeholder if it exists
          if (placeholderInScene && placeholderInScene.parent) {
            this.bathroomItemsGroup.remove(placeholderInScene);
            progressiveLoader.disposePlaceholder(placeholderInScene);
            console.log(`🗑️ Removed placeholder for item ${itemId}. bathroomItemsGroup now has ${this.bathroomItemsGroup.children.length} children`);
          }
          // Remove current model if different from placeholder
          else if (currentModel && currentModel.parent && currentModel !== placeholderInScene) {
            this.bathroomItemsGroup.remove(currentModel);
            this.disposeModel(currentModel);
            console.log(`🗑️ Removed current model for item ${itemId}. bathroomItemsGroup now has ${this.bathroomItemsGroup.children.length} children`);
          }

          // Update tracking with the WRAPPER (not the inner model)
          this.existingItems.set(itemId, wrapper);

          // Enhance materials on the inner model
          this.enhanceModelMaterials(fullModel);

          // Verify wrapper is in scene
          console.log(`🔍 Verification for item ${itemId}:`, {
            wrapperParent: wrapper.parent?.name || wrapper.parent?.type || 'none',
            wrapperInGroup: this.bathroomItemsGroup.children.includes(wrapper),
            existingItemsHasId: this.existingItems.has(itemId)
          });

          console.log(`✅ Progressive: Full variant model swapped for item ${itemId}`);
          callbacks?.onFullModelSwapped?.(wrapper);
        },
        onProgress: (progress) => {
          callbacks?.onProgress?.(progress);
        },
        onError: (error) => {
          console.error(`❌ Progressive: Failed to load variant ${sku}:`, error);
        }
      }
    );

    return newModel;
  }

  /**
   * Get the model for an item (could be placeholder or full model)
   */
  getItemModel(itemId: number): THREE.Object3D | undefined {
    return this.existingItems.get(itemId);
  }

  /**
   * Check if an item's current model is a placeholder
   */
  isItemPlaceholder(itemId: number): boolean {
    const model = this.existingItems.get(itemId);
    return model?.userData?.isPlaceholder === true;
  }

  // Method to clear all items efficiently
  clearAllItems(): void {
    console.log('🧹 Clearing all bathroom items');

    // Dispose of all models
    this.existingItems.forEach((model) => {
      this.bathroomItemsGroup.remove(model);
      this.disposeModel(model);
    });

    // Clear tracking
    this.existingItems.clear();

    console.log('✅ All items cleared efficiently');
  }


  // ADD: Temporary debug cube method
  addDebugCube(position: [number, number, number]): void {
    if (!this.scene) return;

    const geometry = new THREE.BoxGeometry(50, 50, 50); // 50cm cube
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(position[0], position[1], position[2]);
    this.scene.add(cube);

    console.log('🔴 Debug cube added at position:', position);
    console.log('🔴 Camera info:', this.getCameraInfo());
  }

  private setupPostProcessing(): void {
    if (!this.scene || !this.camera || !this.renderer) return;

    // Get active camera (perspective or orthographic based on view mode)
    const activeCamera = this.getActiveCamera() || this.camera;

    try {
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      // Create render target with higher precision for better outline rendering
      const renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth * pixelRatio,
        window.innerHeight * pixelRatio,
        {
          format: THREE.RGBAFormat,
          type: THREE.FloatType, // Use FloatType for better precision
          colorSpace: THREE.SRGBColorSpace,
          // Add multisampling for smoother outlines
          samples: 8,
          // Higher precision depth buffer
          depthBuffer: true,
          minFilter: THREE.LinearFilter,  // ✅ ADDED: Smooth filtering
          magFilter: THREE.LinearFilter,  // ✅ ADDED: Smooth filtering
          generateMipmaps: false,          // ✅ ADDED: Disable mipmaps for post-processing
          stencilBuffer: false
        }
      );

      this.composer = new EffectComposer(this.renderer, renderTarget);

      // Add render pass with active camera
      const renderPass = new RenderPass(this.scene, activeCamera);
      this.composer.addPass(renderPass);

      // Enhanced outline pass with distance-optimized settings
      this.outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.scene,
        activeCamera
      );

      // IMPROVED: Distance-optimized outline settings
      this.outlinePass.edgeStrength = 6;        // Increased from 10
      this.outlinePass.edgeGlow = 0.1;           // Reduced glow for better visibility
      this.outlinePass.edgeThickness = 1.5;        // Increased thickness
      this.outlinePass.pulsePeriod = 0;          // Disable pulsing for consistency

      // ✅ ADDED: Enable downsampling ratio for smoother edges
      this.outlinePass.downSampleRatio = 1;    // Use full resolution
      this.outlinePass.visibleEdgeColor.set('#00ffcc');
      this.outlinePass.hiddenEdgeColor.set('#00ffcc'); // Make hidden edges more visible

      // CRITICAL: Set resolution multiplier for better edge detection
      this.outlinePass.resolution = new THREE.Vector2(
        window.innerWidth * pixelRatio * 2,
        window.innerHeight * pixelRatio * 2
      );

      this.composer.addPass(this.outlinePass);

      // Add OutputPass
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      // Set outline pass reference
      setOutlinePass(this.outlinePass);

      console.log('Enhanced post-processing setup successful');
    } catch (error) {
      console.warn('Post-processing setup failed:', error);
      this.composer = null;
      this.outlinePass = null;
    }
  }

  private setupEnhancedLighting(roomWidth?: number): void {
    if (!this.scene) return;

    // Use current room dimensions or defaults
    const width = roomWidth ?? 300; // Default fallback

    // Check if we're in 2D mode - lights should be configured differently
    const is2DMode = this.viewMode === '2d';

    // Clear existing lights
    this.lights.forEach(light => this.scene!.remove(light));
    this.lights = [];

    // 1. AMBIENT LIGHT - provides base illumination
    // In 2D mode, use balanced ambient light for flat, even illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, is2DMode ? 1.5 : 0.9);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Calculate safe positions based on room size
    const safeMargin = 30; // 30cm margin from walls

    // FIXED: Clamp maxX to non-negative to prevent negative positions
    const maxX = Math.max(0, (width / 2) - safeMargin); // Maximum X position, clamped to 0

    // 2. CEILING LIGHTS - positioned relative to room size

    // Inner lights - these stay closer to center, using clamped maxX
    const innerX = Math.min(40, maxX * 0.3); // 30% from center or 40cm max
    const ceilingY = WALL_SETTINGS.HEIGHT;

    const outerX = Math.max(innerX, Math.min(100, maxX * 0.7));
    for (const x of [innerX, -innerX, outerX, -outerX]) {
      const light = new THREE.PointLight(0xffffff, 400, 800, 1.5);
      light.position.set(x, ceilingY, 0);
      // Hide point lights in 2D mode for flat appearance (no light spots on floor)
      light.visible = !is2DMode;
      this.scene.add(light);
      this.lights.push(light);
    }

    // 3. Set renderer exposure - same in both modes for consistency
    if (this.renderer) {
      this.renderer.toneMappingExposure = 1.2;
    }
  }

  updateFloor(roomWidth: number, roomHeight: number, floorTexture: TextureConfig, notchWidth?: number, notchHeight?: number): void {
    if (!this.scene) return;

    if (this.floorRef) {
      this.scene.remove(this.floorRef);
    }

    // FIX: Pass room dimensions to material creation
    const floorMaterial = this.createEnhancedFloorMaterial(floorTexture, roomWidth, roomHeight);

    // Check if we should create an L-shaped floor
    const isLShape = notchWidth !== undefined && notchHeight !== undefined && notchWidth > 0 && notchHeight > 0;

    if (isLShape) {
      console.log('Creating L-shaped floor with notch dimensions:', { notchWidth, notchHeight });
      this.floorRef = createLShapeFloor(roomWidth, roomHeight, notchWidth!, notchHeight!, floorMaterial);
    } else {
      this.floorRef = createFloor(roomWidth, roomHeight, floorMaterial);
    }

    this.scene.add(this.floorRef);

    // 🔥 UPDATE: Reposition lights when room dimensions change
    this.setupEnhancedLighting(roomWidth);
    // Update measurement system with new room dimensions (including notch for L-shaped rooms)
    if (this.measurementSystem) {
      this.measurementSystem.updateRoomDimensions(roomWidth, roomHeight, notchWidth, notchHeight);
    }
  }

  private createEnhancedFloorMaterial(floorTexture: TextureConfig, roomWidth: number, roomHeight: number): THREE.MeshStandardMaterial {
    // FIX: Pass room dimensions to texture manager for proper scaling
    const material = textureManager.createTexturedMaterial(floorTexture, { width: roomWidth, height: roomHeight });

    // Enhanced floor material properties
    material.roughness = 0;
    material.metalness = 0.02;
    material.envMapIntensity = 0.5;

    return material;
  }

  updateWalls(roomWidth: number, roomHeight: number, wallTexture: TextureConfig, notchWidth?: number, notchHeight?: number): void {
    if (!this.scene) return;

    // Remove existing walls
    this.wallRefs.forEach(wall => {
      if (wall.parent) wall.parent.remove(wall);
    });
    this.wallRefs = [];

    // Create new walls with enhanced materials
    const wallMaterial = this.createEnhancedWallMaterial(wallTexture);

    // Check if we should create L-shaped walls
    const isLShape = notchWidth !== undefined && notchHeight !== undefined && notchWidth > 0 && notchHeight > 0;

    if (isLShape) {
      console.log('Creating L-shaped walls with notch dimensions:', { notchWidth, notchHeight });
      this.wallRefs = createLShapeWalls(roomWidth, roomHeight, notchWidth!, notchHeight!, wallMaterial);
    } else {
      this.wallRefs = createWalls(roomWidth, roomHeight, wallMaterial);
    }

    this.wallRefs.forEach(wall => this.scene!.add(wall));
    this.wallLabelsDebug?.createWallLabels(this.scene, roomWidth, roomHeight, this.debugLabelsEnabled);
    // NEW: Add axis indicators with notch support for L-shaped rooms
    this.axisIndicatorsDebug.createAxisIndicators(
      this.scene,
      roomWidth,
      roomHeight,
      notchWidth || 0,
      notchHeight || 0,
      this.debugLabelsEnabled
    );

    // 🔥 UPDATE: Reposition lights when room dimensions change
    this.setupEnhancedLighting(roomWidth);
    // Update wall culling manager with new walls and room size (including notch dimensions)
    this.wallCullingManager.updateRoomSize(roomWidth, roomHeight, notchWidth, notchHeight);
    this.wallCullingManager.initialize(this.wallRefs, this.camera!);
    // Update measurement system with new room dimensions (including notch for L-shaped rooms)
    if (this.measurementSystem) {
      this.measurementSystem.updateRoomDimensions(roomWidth, roomHeight, notchWidth, notchHeight);
    }
  }

  updateLabels(roomWidth: number, roomHeight: number): void {
    this.wallLabelsDebug?.createWallLabels(this.scene, roomWidth, roomHeight, this.debugLabelsEnabled);
  }

  private createEnhancedWallMaterial(wallTexture: TextureConfig): THREE.MeshStandardMaterial {
    const material = textureManager.createTexturedMaterial(wallTexture);

    // Enhanced wall material properties
    material.roughness = 0.6;      // Semi-matte for good light distribution
    material.metalness = 0.0;      // Non-metallic
    material.envMapIntensity = 0.1; // Minimal reflections

    return material;
  }

  updateGrid(roomWidth: number, roomHeight: number, showGrid: boolean, showWallGrid: boolean = true, notchWidth?: number, notchHeight?: number): void {
    console.log('🔄 SceneManager.updateGrid called with:', {
      roomWidth,
      roomHeight,
      showGrid,
      showWallGrid,
      notchWidth,
      notchHeight
    });

    if (!this.scene) {
      console.error('❌ Scene is null, cannot update grid');
      return;
    }

    // Remove existing grid
    if (this.gridRef) {
      console.log('🗑️ Removing existing grid from scene');
      this.scene.remove(this.gridRef);
      this.gridRef = null;
    }

    // Remove existing blueprint grid
    if (this.blueprintGridRef) {
      console.log('🗑️ Removing existing blueprint grid from scene');
      this.scene.remove(this.blueprintGridRef);
      this.blueprintGridRef = null;
    }

    // Remove existing wall grid group
    if (this.wallGridGroup) {
      console.log('🗑️ Removing existing wall grid group from scene');
      this.scene.remove(this.wallGridGroup);
      this.wallGridGroup = null;
    }

    // Clear existing wall grid associations
    console.log('🧹 Clearing wall grid associations');
    this.wallCullingManager.clearWallGridLines();

    // Create floor grid if showGrid is enabled
    if (showGrid) {
      console.log('🏗️ Creating floor grid...');
      try {
        // FIXED: Simplified - createCustomGrid now returns THREE.Group directly
        this.gridRef = createCustomGrid(roomWidth, roomHeight);
        // Hide regular grid in 2D mode (blueprint grid is used instead)
        this.gridRef.visible = this.viewMode !== '2d';

        console.log('✅ Floor grid created:', {
          children: this.gridRef.children.length,
          position: this.gridRef.position,
          name: this.gridRef.name,
          visible: this.gridRef.visible
        });

        this.scene.add(this.gridRef);

        console.log('✅ Floor grid added to scene');

        // Verify it's in the scene
        const gridInScene = this.scene.children.find(child => child === this.gridRef);
        console.log('🔍 Grid found in scene:', !!gridInScene);

      } catch (error) {
        console.error('❌ Error creating floor grid:', error);
      }
    } else {
      console.log('⏭️ Skipping floor grid creation (showGrid = false)');
    }

    // Create blueprint grid for 2D mode (10cm spacing)
    try {
      this.blueprintGridRef = createBlueprintGrid(roomWidth, roomHeight);
      // Set visibility based on current view mode - visible in 2D mode, hidden in 3D mode
      this.blueprintGridRef.visible = this.viewMode === '2d';
      this.scene.add(this.blueprintGridRef);
      console.log(`✅ Blueprint grid created (visible: ${this.blueprintGridRef.visible}, viewMode: ${this.viewMode})`);
    } catch (error) {
      console.error('❌ Error creating blueprint grid:', error);
    }

    // Create wall grid group and lines
    console.log('🧱 Creating wall grid group...');
    this.wallGridGroup = new THREE.Group();
    this.wallGridGroup.name = 'WallGridGroup';
    this.wallGridVisible = showWallGrid;

    if (this.wallRefs.length > 0) {
      // console.log('📊 Available walls:', this.wallRefs.map(wall => ({
      //   name: wall.name,
      //   direction: wall.userData.wallDirection,
      //   position: wall.position
      // })));

      try {
        let totalWallGridLines = 0;

        this.wallRefs.forEach((wall, index) => {
          const wallDirection = wall.userData.wallDirection as 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

          if (wallDirection) {
            console.log(`🔨 Creating grid for ${wallDirection} wall...`);

            const wallGridLines = createWallGridLines(wallDirection, roomWidth, roomHeight, notchWidth, notchHeight);

            console.log(`📏 Wall grid lines created for ${wallDirection}:`, wallGridLines.length);

            // Add wall grid lines to the scene
            wallGridLines.forEach((line, lineIndex) => {
              if (line && line.isObject3D) {
                line.name = `WallGrid_${wallDirection}_${lineIndex}`;
                this.wallGridGroup!.add(line); // Add to group, not directly to scene
                totalWallGridLines++;
              } else {
                console.error(`❌ Invalid wall grid line at index ${lineIndex}:`, line);
              }
            });

            // Register the grid lines with the wall culling manager
            this.wallCullingManager.registerWallGridLines(wall, wallGridLines);

            // console.log(`✅ Registered ${wallGridLines.length} grid lines for ${wallDirection} wall`);
          } else {
            console.warn(`⚠️ Wall at index ${index} has no wallDirection:`, wall.userData);
          }
        });

        console.log(`✅ Total wall grid lines added to group: ${totalWallGridLines}`);

        // Set initial visibility based on showWallGrid
        this.wallGridGroup.visible = showWallGrid;
        console.log(`🔍 Wall grid group visibility set to: ${showWallGrid}`);

        // Add the wall grid group to the scene
        this.scene.add(this.wallGridGroup);
        console.log('✅ Wall grid group added to scene');

      } catch (error) {
        console.error('❌ Error creating wall grids:', error);
      }
    } else {
      console.log('⏭️ No walls available for wall grid creation');
    }

    // Final scene debugging
    console.log('🎬 Final scene state:', {
      totalChildren: this.scene.children.length,
      gridRef: this.gridRef ? 'present' : 'null',
      wallGridGroup: this.wallGridGroup ? 'present' : 'null',
      wallGridVisible: this.wallGridVisible,
      sceneChildren: this.scene.children.map(child => ({
        name: child.name || 'unnamed',
        type: child.type,
        visible: child.visible,
        children: child.children ? child.children.length : 0
      }))
    });
  }

  // Method to toggle wall grid visibility
  setWallGridVisible(visible: boolean): void {
    console.log(`🔄 Setting wall grid visibility to: ${visible}`);

    this.wallGridVisible = visible;

    if (this.wallGridGroup) {
      this.wallGridGroup.visible = visible;
      console.log(`✅ Wall grid group visibility updated to: ${visible}`);

      // Also update individual line visibility for wall culling
      this.wallGridGroup.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.visible = visible;
        }
      });
    } else {
      console.warn('⚠️ Wall grid group not found - cannot toggle visibility');
    }
  }

  getWallGridVisible(): boolean {
    return this.wallGridVisible;
  }

  private debugModelVisibility(model: THREE.Object3D, item: any): void {
    console.log('📍📍 selectedModelIs>>>>', model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('🔍 MODEL DEBUG INFO:');
    console.log('  Item ID:', item.id);
    console.log('  Item Type:', item.type);
    console.log('  Model Position:', model.position);
    console.log('  Model Scale:', model.scale);
    console.log('  Model Visible:', model.visible);
    console.log('  Bounding Box Size:', size);
    console.log('  Bounding Box Center:', center);
    console.log('  Children Count:', model.children.length);

    // Check if model is too small
    const maxSize = Math.max(size.x, size.y, size.z);
    if (maxSize < 0.01) {
      console.warn('⚠️ Model might be too small to see (max dimension:', maxSize, ')');
    }

    // Check if model is too far from origin
    const distanceFromOrigin = model.position.length();
    if (distanceFromOrigin > 200) {
      console.warn('⚠️ Model might be too far from camera (distance:', distanceFromOrigin, ')');
    }

    // Check children visibility
    let visibleChildren = 0;
    model.traverse((child) => {
      if (child.visible) visibleChildren++;
    });
    console.log('  Visible Children:', visibleChildren);

    // Check materials
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        console.log('  Mesh Material:', child.material?.type || 'No material');
        if (child.material?.transparent && child.material?.opacity < 0.1) {
          console.warn('⚠️ Material might be too transparent');
        }
      }
    });
  }

  // Replace the current updateBathroomItems method with this optimized version
  async updateBathroomItems(items: BathroomItem[]): Promise<void> {
    if (!this.scene || this.isUpdatingItems) return;

    this.isUpdatingItems = true;

    try {
      console.log('=== INCREMENTAL BATHROOM ITEMS UPDATE ===');
      console.log('>>>111 Items to process:', items.length);
      console.log('>>>111 Existing items in scene:', this.existingItems.size);

      // Get current item IDs
      const newItemIds = new Set(items.map(item => item.id));
      const existingIds = new Set(this.existingItems.keys());

      // 1. REMOVE items that no longer exist
      const itemsToRemove = Array.from(existingIds).filter(id => !newItemIds.has(id));
      for (const itemId of itemsToRemove) {
        const existingModel = this.existingItems.get(itemId);
        if (existingModel) {
          console.log(`🗑️ Removing item ${itemId} from scene`);
          this.bathroomItemsGroup.remove(existingModel);
          this.existingItems.delete(itemId);

          // Clean up the model
          this.disposeModel(existingModel);
        }
      }

      // 2. ADD new items or UPDATE existing ones
      const updatePromises = items.map(async (item, index) => {
        const existingModel = this.existingItems.get(item.id);

        if (existingModel) {
          // UPDATE existing item if position/rotation/scale changed
          const hasChanged = this.hasItemChanged(existingModel, item);
          if (hasChanged) {
            console.log(`🔄 Updating existing item ${item.id}`);
            this.updateExistingModel(existingModel, item);
          }
        } else {
          // ADD new item (using your existing createModel function)
          console.log(`>>>111 ➕ Adding new item ${item.id} to scene`);
          console.log(`>>>111 Creating model for item [${index}]:`, {
            id: item.id,
            type: item.type,
            position: item.position,
            rotation: item.rotation,
            orientation: item.model?.orientation,
            scale: item.scale,
            path: item.model?.path
          });

          try {
            const model = await createModel(
              item.type,
              item.position,
              item.rotation,
              item.scale,
              item.model,
              item.sku
            );

            if (model) {
              model.userData.isBathroomItem = true;
              model.userData.itemId = item.id;
              model.userData.type = item.type;

              // NEW: Add orientation data directly to userData
              model.userData.orientation = getOrientationForItem(item);

              this.debugModelVisibility(model, items[index]);

              console.log(`✅ Model created successfully:`, {
                type: item.type,
                worldPosition: model.position,
                worldScale: model.scale,
                visible: model.visible,
                boundingBox: this.getModelBoundingBox(model)
              });

              // Enhance model materials
              this.enhanceModelMaterials(model);

              // Add to scene and track it
              this.bathroomItemsGroup.add(model);
              this.existingItems.set(item.id, model);

              console.log(`Created model with userData:`, model.userData);
            }
          } catch (error) {
            console.error(`Failed to create model for item ${item.id}:`, error);
          }
        }
      });

      await Promise.all(updatePromises);

      // Update measurement system with new items
      if (this.measurementSystem) {
        this.measurementSystem.updateExistingItems(items);
      }

      console.log('=== INCREMENTAL UPDATE COMPLETE ===');
      console.log(`Scene now has ${this.existingItems.size} items`);
      console.log('Bathroom items group:', {
        children: this.bathroomItemsGroup.children.length,
        position: this.bathroomItemsGroup.position,
        scale: this.bathroomItemsGroup.scale
      });

    } catch (error) {
      console.error('Error updating bathroom items:', error);
    } finally {
      this.isUpdatingItems = false;
    }
  }

  private getModelBoundingBox(model: THREE.Object3D): any {
    const box = new THREE.Box3().setFromObject(model);
    return {
      min: box.min,
      max: box.max,
      size: box.getSize(new THREE.Vector3()),
      center: box.getCenter(new THREE.Vector3())
    };
  }

  private enhanceModelMaterials(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          // Handle both single material and material array
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              // Enhance material properties for better appearance
              material.roughness = material.roughness || 0.7;
              material.metalness = material.metalness || 0.1;
              material.envMapIntensity = 0.5;
            }
          });
        }

        // Ensure shadows are properly configured
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });
  }

  adjustOutlineForDistance(): void {
    const camera = this.getActiveCamera();
    if (!this.outlinePass || !camera) return;

    // Calculate average distance to selected objects
    const selectedObjects = this.outlinePass.selectedObjects;
    if (selectedObjects.length === 0) return;

    let totalDistance = 0;
    selectedObjects.forEach(obj => {
      totalDistance += camera.position.distanceTo(obj.position);
    });

    const averageDistance = totalDistance / selectedObjects.length;

    // Adjust outline parameters based on distance
    const distanceFactor = Math.max(1, averageDistance / 10); // Normalize to 10 units

    // Scale outline thickness and strength with distance
    this.outlinePass.edgeThickness = Math.min(10, 3 * distanceFactor);
    this.outlinePass.edgeStrength = Math.min(20, 8 * distanceFactor);
  }

  startAnimationLoop(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.isAnimating = true;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (!this.isAnimating || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      // Get active camera (perspective or orthographic based on view mode)
      const activeCamera = this.getActiveCamera();
      if (!activeCamera) return;

      // Update wall culling (only in 3D mode)
      if (this.wallCullingManager && this.viewMode === '3d') {
        this.wallCullingManager.updateWallVisibility();
      }

      // ADDED: Adjust outline for distance every frame
      this.adjustOutlineForDistance();

      if (this.eventHandlers && typeof this.eventHandlers.update === 'function') {
        try {
          this.eventHandlers.update();
        } catch (err) {
          console.warn('eventHandlers.update() failed:', err);
        }
      }

      // Render using active camera
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, activeCamera);
      }
    };
    animate();
  }



  // Method to stop animation loop
  stopAnimationLoop(): void {
    this.isAnimating = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Update composer size when window resizes
  updateComposerSize(): void {
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);

      // Update outline pass resolution
      if (this.outlinePass) {
        this.outlinePass.resolution.set(
          window.innerWidth * 2,
          window.innerHeight * 2
        );
      }
    }

    // Update orthographic camera frustum on resize
    if (this.orthographicCamera) {
      this.updateOrthographicFrustum();
    }
  }

  // Wall culling controls
  setWallCullingEnabled(enabled: boolean): void {
    this.wallCullingManager.setEnabled(enabled);
  }

  isWallCullingEnabled(): boolean {
    return this.wallCullingManager.enabled;
  }

  // Cleanup method - enhanced
  dispose(): void {
    // Restore original material states before clearing (prevents leak if disposed while in 2D mode)
    this.originalMaterialStates.forEach((originalState, material) => {
      material.opacity = originalState.opacity;
      material.transparent = originalState.transparent;
      material.needsUpdate = true;
    });
    this.originalMaterialStates.clear();

    // Clear all items first
    this.clearAllItems();

    // Stop animation loop
    this.stopAnimationLoop();

    // Clean up camera transition
    if (this.cameraTransition) {
      this.cameraTransition.dispose();
    }

    if (this.wallCullingManager) {
      this.wallCullingManager.dispose();
    }

    if (this.bathroomItemsGroup) {
      this.bathroomItemsGroup.clear();
    }

    // Clean up lights
    this.lights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
    });
    this.lights = [];

    if (this.composer) {
      this.composer.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.outlinePass = null;
    this.floorRef = null;
    this.wallRefs = [];
    this.gridRef = null;

    if (this.measurementSystem) {
      this.measurementSystem.dispose();
      this.measurementSystem = null;
    }
  }

  // Utility method to get bathroom items group
  getBathroomItemsGroup(): THREE.Group {
    return this.bathroomItemsGroup;
  }

  // Method to adjust lighting intensity
  adjustLightingIntensity(factor: number): void {
    this.lights.forEach(light => {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.PointLight) {
        light.intensity *= factor;
      }
    });
  }

  // Method to switch lighting presets
  setLightingPreset(preset: 'natural' | 'warm' | 'cool'): void {
    this.lights.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        switch (preset) {
          case 'warm':
            light.color.setHex(0xfff8dc);
            light.intensity = 0.3;
            break;
          case 'cool':
            light.color.setHex(0xe6f3ff);
            light.intensity = 0.3;
            break;
          case 'natural':
          default:
            light.color.setHex(0xffffff);
            light.intensity = 0.3;
            break;
        }
      } else if (light instanceof THREE.DirectionalLight) {
        switch (preset) {
          case 'warm':
            light.color.setHex(0xfff8dc);
            break;
          case 'cool':
            light.color.setHex(0xe6f3ff);
            break;
          case 'natural':
          default:
            light.color.setHex(0xffffff);
            break;
        }
      }
    });
  }

  // Method to get current lighting information
  getLightingInfo(): { lightCount: number; shadowsEnabled: boolean } {
    return {
      lightCount: this.lights.length,
      shadowsEnabled: this.renderer?.shadowMap.enabled || false
    };
  }

  // Store reference to collision preview mesh for cleanup
  private _collisionPreviewMesh: THREE.Mesh | null = null;

  // Show collision preview - red wireframe box showing where item would collide
  showCollisionPreview(config: {
    itemId: number | string;
    currentPosition: [number, number, number];
    currentRotation?: number;
    newDimensions: { width: number; height: number; depth: number };
    currentDimensions?: { width: number; height: number; depth: number };
    reason: string;
    roomWidth?: number;
    roomHeight?: number;
  }): void {
    if (!this.scene) return;

    // Remove existing preview mesh if any
    this.clearCollisionPreview();

    const { itemId, currentPosition, currentRotation, newDimensions } = config;

    // Try to get actual position from Three.js object (more accurate than stored data)
    let posX = currentPosition[0];
    let posZ = currentPosition[2];
    let rotation = currentRotation;

    // Find the actual object in the scene to get its real position
    const actualObject = this.bathroomItemsGroup.children.find(
      child => child.userData.itemId === itemId || child.userData.itemId === Number(itemId)
    );

    if (actualObject) {
      posX = actualObject.position.x;
      posZ = actualObject.position.z;
      rotation = actualObject.rotation.y;
      console.log('🔴 Using actual 3D object position:', { x: posX, z: posZ, rotation });
    } else {
      console.log('🔴 Object not found in scene, using passed position');
    }

    // Get room dimensions (passed from Planner or use defaults)
    const roomWidth = config.roomWidth || 300;
    const roomHeight = config.roomHeight || 250;

    // Calculate half dimensions for the new variant (accounting for rotation)
    const rot = rotation || 0;
    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const rotatedHalfWidth = (newDimensions.width * cos + newDimensions.depth * sin) / 2;
    const rotatedHalfDepth = (newDimensions.width * sin + newDimensions.depth * cos) / 2;

    // Room boundaries (interior walls) - using WALL_SETTINGS.THICKNESS
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const halfRoomWidth = roomWidth / 2;
    const halfRoomHeight = roomHeight / 2;

    // Calculate interior boundaries (where object center can be placed)
    const interiorMinX = -halfRoomWidth + wallThickness + rotatedHalfWidth;
    const interiorMaxX = halfRoomWidth - wallThickness - rotatedHalfWidth;
    const interiorMinZ = -halfRoomHeight + wallThickness + rotatedHalfDepth;
    const interiorMaxZ = halfRoomHeight - wallThickness - rotatedHalfDepth;

    // Handle case where object is larger than room - center it
    let constrainedX = posX;
    let constrainedZ = posZ;

    if (interiorMinX <= interiorMaxX) {
      constrainedX = Math.max(interiorMinX, Math.min(interiorMaxX, posX));
    } else {
      // Object too wide - center it in room
      constrainedX = 0;
    }

    if (interiorMinZ <= interiorMaxZ) {
      constrainedZ = Math.max(interiorMinZ, Math.min(interiorMaxZ, posZ));
    } else {
      // Object too deep - center it in room
      constrainedZ = 0;
    }

    posX = constrainedX;
    posZ = constrainedZ;

    const posY = newDimensions.height / 2;  // Center the box vertically (sitting on floor)

    console.log('🔴 Creating collision preview:', {
      itemId,
      itemPosition: currentPosition,
      constrainedPosition: [posX, posY, posZ],
      dimensions: newDimensions,
      rotatedHalfDims: { width: rotatedHalfWidth, depth: rotatedHalfDepth },
      rotation: rotation,
      roomSize: { width: roomWidth, height: roomHeight },
      interiorBounds: { minX: interiorMinX, maxX: interiorMaxX, minZ: interiorMinZ, maxZ: interiorMaxZ }
    });

    // Create a wireframe box showing the new size
    const geometry = new THREE.BoxGeometry(
      newDimensions.width,
      newDimensions.height,
      newDimensions.depth
    );

    // Create red wireframe material
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,  // Bright red
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    // Also create a semi-transparent solid for better visibility
    const solidMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });

    // Create wireframe mesh
    const wireframeMesh = new THREE.Mesh(geometry, material);
    wireframeMesh.position.set(posX, posY, posZ);
    if (rotation !== undefined) {
      wireframeMesh.rotation.y = rotation;
    }
    wireframeMesh.name = 'collision-preview-wireframe';

    // Create solid mesh for better visibility
    const solidGeometry = new THREE.BoxGeometry(
      newDimensions.width,
      newDimensions.height,
      newDimensions.depth
    );
    const solidMesh = new THREE.Mesh(solidGeometry, solidMaterial);
    solidMesh.position.set(posX, posY, posZ);
    if (rotation !== undefined) {
      solidMesh.rotation.y = rotation;
    }
    solidMesh.name = 'collision-preview-solid';

    // Create a group to hold both meshes
    const previewGroup = new THREE.Group();
    previewGroup.name = 'collision-preview';
    previewGroup.add(wireframeMesh);
    previewGroup.add(solidMesh);

    // Add edge geometry for clearer outline
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const edgeMesh = new THREE.LineSegments(edges, edgeMaterial);
    edgeMesh.position.copy(wireframeMesh.position);
    edgeMesh.rotation.copy(wireframeMesh.rotation);
    edgeMesh.name = 'collision-preview-edges';
    previewGroup.add(edgeMesh);

    this.scene.add(previewGroup);
    this._collisionPreviewMesh = previewGroup as any;

    console.log('🔴 Collision preview shown at position:', [posX, posY, posZ], 'with dimensions:', newDimensions);
  }

  // Clear collision preview
  clearCollisionPreview(): void {
    if (!this.scene) return;

    // Remove by reference if available, or by name
    const existingPreview = this._collisionPreviewMesh || this.scene.getObjectByName('collision-preview');
    if (existingPreview) {
      this.scene.remove(existingPreview);
      // Dispose geometries and materials
      existingPreview.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
        if (child instanceof THREE.LineSegments) {
          child.geometry?.dispose();
          (child.material as THREE.Material)?.dispose();
        }
      });
    }

    this._collisionPreviewMesh = null;
  }
}
