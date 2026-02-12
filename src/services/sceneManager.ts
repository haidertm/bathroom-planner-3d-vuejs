//src/services/sceneManager.ts

import * as THREE from 'three';
import { markRaw } from 'vue';
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
import { getSchematicTypeFromSku, type SchematicType } from '../constants/schematicPatterns';

// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
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
  // Cameras are wrapped with markRaw() during initialization to prevent Vue reactivity overhead
  public camera: THREE.PerspectiveCamera | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  private eventHandlers: any = null;

  // 2D Blueprint View - Orthographic camera (marked raw to prevent Vue reactivity)
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
  private ssaoPass: SSAOPass | null = null;

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
  private showGridEnabled: boolean = true; // Track floor grid visibility preference
  private measurementSystem: MeasurementSystem | null = null;
  private existingItems: Map<number, THREE.Object3D> = new Map();

  // Enhanced lighting management
  private lights: THREE.Light[] = [];
  // Store original shadow states for 2D mode
  private shadowsEnabled: boolean = true;
  private originalAmbientIntensity: number = 0.9;
  // Store original floor material for 2D/3D mode switching
  private originalFloorMaterial: THREE.Material | null = null;
  // 2D schematic overlays for thin objects
  private schematic2DOverlays: Map<number, THREE.Group> = new Map();
  // Deferred batch updates for schematic positions (performance optimization)
  private pendingSchematicUpdates: Set<number> = new Set();
  private schematicUpdateScheduled: boolean = false;

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
    this.scene.background = new THREE.Color(0xF4F0EC); // Warm paper/cream tone matching reference
    this.scene.fog = new THREE.Fog(0xF4F0EC, 1000, 5000);

    // Create camera with better positioning and settings
    // Use markRaw to prevent Vue reactivity overhead on Three.js objects
    this.camera = markRaw(new THREE.PerspectiveCamera(CAMERA_SETTINGS.FOV, window.innerWidth / window.innerHeight, CAMERA_SETTINGS.NEAR, CAMERA_SETTINGS.FAR));
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
    }

    // this.renderer = new THREE.WebGLRenderer({
    //   antialias: true,
    //   powerPreference: 'high-performance',
    //   logarithmicDepthBuffer: true  // Set it in the constructor options
    // });

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
    // Set the reverse reference so EventHandlers can call SceneManager methods (e.g., updateSchematicPosition)
    if (eventHandlers?.setSceneManager) {
      eventHandlers.setSceneManager(this);
    }
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

    // Use markRaw to prevent Vue reactivity overhead on Three.js objects
    this.orthographicCamera = markRaw(new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      ORTHOGRAPHIC_SETTINGS.NEAR,
      ORTHOGRAPHIC_SETTINGS.FAR
    ));

    // Position directly above room center, looking down
    // Add vertical offset to shift view upward on screen (leaves room for toolbar)
    const verticalOffset = ORTHOGRAPHIC_SETTINGS.VERTICAL_OFFSET || 0;
    this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, verticalOffset);
    this.orthographicCamera.lookAt(0, 0, verticalOffset);
    // Set up vector for proper top-down orientation (North at top of screen)
    this.orthographicCamera.up.set(0, 0, -1);
    this.orthographicCamera.zoom = ORTHOGRAPHIC_SETTINGS.INITIAL_ZOOM;
    this.orthographicCamera.updateProjectionMatrix();
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
   * Calculate the optimal zoom level for the orthographic camera to fit the room
   * nicely in the viewport with appropriate margins for dimension labels.
   * This ensures consistent presentation regardless of room size.
   */
  private calculateOptimalZoomForRoom(): number {
    if (!this.orthographicCamera) return ORTHOGRAPHIC_SETTINGS.INITIAL_ZOOM;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Account for the sidebar (approximately 400px on desktop)
    const sidebarWidth = viewportWidth > 768 ? 400 : 0;
    const availableWidth = viewportWidth - sidebarWidth;
    const effectiveAspect = availableWidth / viewportHeight;

    // The frustum is based on the max room dimension * padding
    const frustumSize = Math.max(this.roomWidth, this.roomHeight) * ORTHOGRAPHIC_SETTINGS.FRUSTUM_PADDING;

    // Calculate how much of the frustum width/height the room occupies
    const roomAspect = this.roomWidth / this.roomHeight;

    // Calculate the zoom needed to fit the room with margins
    // We want the room to fill about 40-45% of the available viewport
    // This leaves ample space for dimension labels (width/height) around the room
    const targetFillRatio = 0.45;

    let optimalZoom: number;

    if (effectiveAspect > roomAspect) {
      // Viewport is wider than room - height is the limiting factor
      // Room height should fill targetFillRatio of viewport height
      const visibleHeight = frustumSize; // At zoom 1, this is visible
      const desiredVisibleHeight = this.roomHeight / targetFillRatio;
      optimalZoom = visibleHeight / desiredVisibleHeight;
    } else {
      // Viewport is taller than room - width is the limiting factor
      // Room width should fill targetFillRatio of viewport width
      const visibleWidth = frustumSize * effectiveAspect;
      const desiredVisibleWidth = this.roomWidth / targetFillRatio;
      optimalZoom = visibleWidth / desiredVisibleWidth;
    }

    // Clamp to valid zoom range
    optimalZoom = Math.max(ORTHOGRAPHIC_SETTINGS.MIN_ZOOM, Math.min(optimalZoom, ORTHOGRAPHIC_SETTINGS.MAX_ZOOM));

    return optimalZoom;
  }

  // Valid L-shape corner values for localStorage validation
  private static readonly VALID_LSHAPE_CORNERS = ['nw', 'ne', 'se', 'sw'] as const;

  /**
   * Maps L-shape corner identifiers to camera up vectors for 2D orthographic view rotation.
   *
   * **Coordinate System:**
   * - World X-axis: East (+X) / West (-X)
   * - World Z-axis: South (+Z) / North (-Z)
   * - Camera looks down Y-axis (top-down view)
   *
   * **Corner-to-Rotation Mapping:**
   * The corner identifier indicates where the L-shape notch is positioned on screen.
   * The up vector rotates the view so north/south/east/west align correctly:
   *
   * | Corner | Up Vector      | Screen Top | Rotation    |
   * |--------|----------------|------------|-------------|
   * | 'nw'   | (0, 0, -1)     | North      | 0° (default)|
   * | 'ne'   | (-1, 0, 0)     | West       | 90° CW      |
   * | 'se'   | (0, 0, 1)      | South      | 180°        |
   * | 'sw'   | (1, 0, 0)      | East       | 90° CCW     |
   *
   * @param corner - L-shape corner identifier ('ne', 'se', 'sw', 'nw') or null
   * @returns THREE.Vector3 - Camera up vector for OrthographicCamera orientation.
   *          Falls back to northwest (north-up) orientation if corner is null/invalid.
   */
  private getUpVectorForCorner(corner: string | null): THREE.Vector3 {
    switch (corner) {
      case 'ne': return new THREE.Vector3(-1, 0, 0);  // West is up - rotates view 90° CW
      case 'se': return new THREE.Vector3(0, 0, 1);   // South is up - rotates view 180°
      case 'sw': return new THREE.Vector3(1, 0, 0);   // East is up - rotates view 90° CCW
      case 'nw':
      default: return new THREE.Vector3(0, 0, -1);  // North is up - default orientation
    }
  }

  /**
   * Safely retrieve and validate the L-shape corner from localStorage
   * Returns null if value is missing or invalid, triggering default orientation
   */
  private getValidatedLShapeCorner(): string | null {
    const lShapeCorner = localStorage.getItem('l-shape-corner-active');
    if (lShapeCorner && (SceneManager.VALID_LSHAPE_CORNERS as readonly string[]).includes(lShapeCorner)) {
      return lShapeCorner;
    }
    if (lShapeCorner) {
      console.warn(`⚠️ Invalid L-shape corner value in localStorage: "${lShapeCorner}", falling back to default (nw)`);
    }
    return null;
  }

  /**
   * Switch to 2D Blueprint view (orthographic top-down)
   * Features smooth camera flyover animation for immersive transition
   */
  public async switchTo2D(): Promise<void> {
    if (this.viewMode === '2d' || !this.camera || !this.orthographicCamera) return;
    if (this.isViewTransitioning) return; // Prevent double-clicks during animation

    this.isViewTransitioning = true;

    try {
      // Store current 3D camera state for restoration
      this.stored3DState = {
        position: this.camera.position.clone(),
        target: new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z)
      };

      // Calculate room center for camera target
      const roomCenter = new THREE.Vector3(0, 0, 0);

      // Get validated L-shape corner from localStorage to determine camera rotation
      const lShapeCorner = this.getValidatedLShapeCorner();
      const targetUp = this.getUpVectorForCorner(lShapeCorner);

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
      // Update orthographic frustum to current room size
      this.updateOrthographicFrustum();

      // Reset orthographic camera zoom and position to show full room with labels
      // Apply the same up vector rotation to orthographic camera
      if (this.orthographicCamera) {
        // Calculate optimal zoom to fit room nicely in viewport
        this.orthographicCamera.zoom = this.calculateOptimalZoomForRoom();
        // Add vertical offset to shift view upward on screen
        const verticalOffset = ORTHOGRAPHIC_SETTINGS.VERTICAL_OFFSET || 0;
        this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, verticalOffset);
        this.orthographicCamera.up.copy(targetUp);
        this.orthographicCamera.lookAt(0, 0, verticalOffset);
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

      // Update grid visibility for 2D mode
      this.updateGridVisibility();

      // Switch to flat 2D lighting (no shadows, even illumination)
      this.switchTo2DLighting();

      // Switch floor to dark blueprint appearance
      this.switchTo2DFloor();

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

    this.isViewTransitioning = true;

    try {
      // Calculate room center
      const roomCenter = new THREE.Vector3(0, 0, 0);

      // Get validated L-shape corner to determine starting camera rotation (matches 2D view orientation)
      const lShapeCorner = this.getValidatedLShapeCorner();
      const startUpVector = this.getUpVectorForCorner(lShapeCorner);

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

      // Update grid visibility for 3D mode
      this.updateGridVisibility();

      // Notify event handlers of mode change
      if (this.eventHandlers && typeof this.eventHandlers.setViewMode === 'function') {
        this.eventHandlers.setViewMode('3d');
      }

      // Restore full opacity to tall objects
      this.restoreTallObjectsOpacity();

      // Restore 3D lighting with shadows
      this.switchTo3DLighting();

      // Restore floor to 3D textured appearance
      this.switchTo3DFloor();

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
   * Update post-processing passes to use the active camera.
   * Recreates the composer and passes with the new camera reference.
   */
  private updatePostProcessingCamera(): void {
    const activeCamera = this.getActiveCamera();
    if (!activeCamera || !this.scene) return;

    // Recreate composer with new camera
    // The RenderPass and OutlinePass need to be recreated with the new camera
    // since they store camera reference internally
    this.setupPostProcessing();

    // NOTE: measurementSystem.updateCamera() is currently a no-op placeholder.
    // When camera-dependent measurement functionality is needed (e.g., frustum
    // culling for labels, perspective vs orthographic label styles), implement
    // the logic in MeasurementSystem.updateCamera() and uncomment this call.
    // if (this.measurementSystem) {
    //   this.measurementSystem.updateCamera(activeCamera);
    // }
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
   * Transform screen pan deltas to world coordinate deltas based on camera's up vector.
   * This is a pure function that handles the coordinate mapping for all camera orientations.
   *
   * @param deltaX - Screen X delta (horizontal movement)
   * @param deltaZ - Screen Z delta (vertical movement, pre-negated for grab-and-drag feel)
   * @param upVector - Camera's up vector determining orientation
   * @returns World coordinate deltas { worldDeltaX, worldDeltaZ }
   */
  private transformPanDeltasToWorld(
    deltaX: number,
    deltaZ: number,
    upVector: THREE.Vector3
  ): { worldDeltaX: number; worldDeltaZ: number } {
    if (Math.abs(upVector.z) > 0.5) {
      // Up is along Z axis (default or 180° rotation)
      if (upVector.z < 0) {
        // Default: up = (0, 0, -1) - north at top
        // Screen right = +X, Screen up = -Z
        return { worldDeltaX: deltaX, worldDeltaZ: deltaZ };
      } else {
        // 180° rotation: up = (0, 0, 1) - south at top
        // Screen right = -X, Screen up = +Z
        return { worldDeltaX: -deltaX, worldDeltaZ: -deltaZ };
      }
    } else {
      // Up is along X axis (90° rotation)
      if (upVector.x < 0) {
        // 90° CW: up = (-1, 0, 0) - west at top
        // Screen right = -Z, Screen up = -X
        return { worldDeltaX: deltaZ, worldDeltaZ: -deltaX };
      } else {
        // 90° CCW: up = (1, 0, 0) - east at top
        // Screen right = +Z, Screen up = +X
        return { worldDeltaX: -deltaZ, worldDeltaZ: deltaX };
      }
    }
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
    const { worldDeltaX, worldDeltaZ } = this.transformPanDeltasToWorld(
      deltaX,
      deltaZ,
      this.orthographicCamera.up
    );

    this.orthographicCamera.position.x += worldDeltaX * panScale;
    this.orthographicCamera.position.z += worldDeltaZ * panScale;
  }

  /**
   * Reset 2D view to center on room with optimal zoom
   */
  public reset2DView(): void {
    if (!this.orthographicCamera || this.viewMode !== '2d') return;

    // Add vertical offset to shift view upward on screen
    const verticalOffset = ORTHOGRAPHIC_SETTINGS.VERTICAL_OFFSET || 0;
    this.orthographicCamera.position.set(0, ORTHOGRAPHIC_SETTINGS.HEIGHT, verticalOffset);
    // Use calculated optimal zoom for consistent fit
    this.orthographicCamera.zoom = this.calculateOptimalZoomForRoom();
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Centralized grid visibility management based on current view mode.
   * - 2D mode: Show blueprint grid, hide floor grid and wall grid
   * - 3D mode: Show floor grid (if enabled) and wall grid (if enabled), hide blueprint grid
   */
  private updateGridVisibility(): void {
    const is2D = this.viewMode === '2d';

    // Floor grid (15cm spacing) - visible in 3D mode only, respecting showGridEnabled
    if (this.gridRef) {
      this.gridRef.visible = !is2D && this.showGridEnabled;
    }

    // Blueprint grid (10cm spacing) - visible in 2D mode only
    if (this.blueprintGridRef) {
      this.blueprintGridRef.visible = is2D;
    }

    // Wall grid - visible in 3D mode only, respecting wallGridVisible
    if (this.wallGridGroup) {
      this.wallGridGroup.visible = !is2D && this.wallGridVisible;
    }
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
    this.existingItems.forEach((model, _itemId) => {
      const dimensions = model.userData.dimensions;
      if (!dimensions) return;

      // Check if object is taller than threshold
      const objectHeight = dimensions.height * (model.scale.y || 1);
      if (objectHeight > SceneManager.TALL_OBJECT_HEIGHT_THRESHOLD) {
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
    // Disable shadow rendering for clean 2D view
    if (this.renderer) {
      this.shadowsEnabled = this.renderer.shadowMap.enabled;
      this.renderer.shadowMap.enabled = false;
      // Lower tone mapping exposure for darker blueprint appearance
      this.renderer.toneMappingExposure = 0.8;
    }

    // Disable SSAO in 2D mode (not needed for flat view)
    if (this.ssaoPass) {
      this.ssaoPass.enabled = false;
    }

    // Adjust ambient light for even but subdued illumination
    this.lights.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        this.originalAmbientIntensity = light.intensity;
        light.intensity = 1.0; // Lower ambient for darker floor appearance
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
  }

  /**
   * Restore 3D lighting with shadows
   */
  private switchTo3DLighting(): void {
    // Re-enable shadow rendering
    if (this.renderer) {
      this.renderer.shadowMap.enabled = this.shadowsEnabled;
      this.renderer.toneMappingExposure = 1.15; // Optimal photorealistic exposure
    }

    // Re-enable SSAO in 3D mode for photorealistic contact shadows
    if (this.ssaoPass) {
      this.ssaoPass.enabled = true;
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
  }

  /**
   * Switch floor to 2D blueprint appearance - solid dark color for better contrast
   * The blueprint grid overlay provides the tile effect
   */
  private switchTo2DFloor(): void {
    if (!this.floorRef) return;

    // Store original material for restoration
    if (!this.originalFloorMaterial) {
      this.originalFloorMaterial = this.floorRef.material as THREE.Material;
    }

    // Create blueprint floor material - white background for clean look
    const blueprintFloorMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // White background - clean blueprint style
      side: THREE.DoubleSide,
    });

    this.floorRef.material = blueprintFloorMaterial;
  }

  /**
   * Restore floor to 3D textured appearance
   */
  private switchTo3DFloor(): void {
    if (!this.floorRef || !this.originalFloorMaterial) return;

    // Dispose the temporary 2D material
    const currentMaterial = this.floorRef.material as THREE.Material;
    if (currentMaterial !== this.originalFloorMaterial) {
      currentMaterial.dispose();
    }

    // Restore original material
    this.floorRef.material = this.originalFloorMaterial;

    // Clear reference to prevent double-disposal in dispose()
    // (floorRef.material and originalFloorMaterial would be the same object)
    this.originalFloorMaterial = null;
  }

  /**
   * Determines the schematic type for an object in 2D view.
   *
   * Resolution order:
   * 1. Exact ComponentType match from model.userData.type
   * 2. SKU pattern fallback using configurable patterns from schematicPatterns.ts
   * 3. Default to 'generic' if no match found
   *
   * @param model - The Three.js object to get schematic type for
   * @returns The schematic type for 2D representation
   */
  private getSchematicType(model: THREE.Object3D): SchematicType {
    const itemType = model.userData.type || ''; // ComponentType like 'Shower', 'Mirror', 'Bath'
    const sku = model.userData.sku || '';

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

    // Fallback: check SKU patterns from configuration
    // Patterns are defined in src/constants/schematicPatterns.ts for maintainability
    const skuMatch = getSchematicTypeFromSku(sku);
    if (skuMatch) {
      return skuMatch;
    }

    // Default: all other objects get a generic schematic
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
   * Helper method to create the appropriate schematic based on object type.
   * Centralizes the switch statement logic for schematic type dispatch.
   *
   * @param schematicType - The type of schematic to create (e.g., 'shower', 'toilet', 'generic')
   * @param schematicGroup - The THREE.Group to add schematic elements to
   * @param width - Width of the schematic
   * @param depth - Depth of the schematic
   * @param schematicHeight - Y position for the schematic
   */
  private createSchematicByType(
    schematicType: string,
    schematicGroup: THREE.Group,
    width: number,
    depth: number,
    schematicHeight: number
  ): void {
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
  }

  /**
   * Create 2D schematic overlays for objects that are hard to see from top-down view
   * These are architectural-style floor plan symbols
   */
  private create2DSchematicOverlays(): void {
    this.existingItems.forEach((model, itemId) => {
      const dimensions = this.getModelDimensions(model);

      if (!dimensions) {
        return;
      }

      const schematicType = this.getSchematicType(model);

      // Get the bounding box center for positioning
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      // Use the MODEL's original dimensions (not bounding box) so rotation works correctly
      // The schematic will be created with these dimensions and then rotated to match the model
      const width = dimensions.width;
      const depth = dimensions.depth;
      const schematicHeight = 50; // Height above floor for visibility

      // Create a schematic overlay group
      const schematicGroup = new THREE.Group();
      schematicGroup.name = `Schematic2D_${itemId}`;

      // Create schematic based on object type
      this.createSchematicByType(schematicType, schematicGroup, width, depth, schematicHeight);

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
      }
    });
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

    // Create schematic based on object type
    this.createSchematicByType(schematicType, schematicGroup, width, depth, schematicHeight);

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
   * Helper method to create a rectangular schematic with fill plane, border edges, and optional icon.
   * Centralizes the repeated PlaneGeometry/Material/Edges/LineSegments creation logic.
   *
   * @param group - The THREE.Group to add the schematic elements to
   * @param width - Width of the schematic rectangle
   * @param depth - Depth of the schematic rectangle
   * @param height - Y position for the schematic (typically object height)
   * @param fillColor - Color for the fill plane (hex number)
   * @param borderColor - Color for the border lines (hex number)
   * @param fillOpacity - Opacity for the fill plane (0-1)
   * @param icon - Optional emoji icon to display on the schematic
   */
  private createRectangularSchematic(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    fillColor: number,
    borderColor: number,
    fillOpacity: number,
    icon?: string
  ): void {
    // Solid filled background plane
    const fillGeometry = new THREE.PlaneGeometry(width, depth);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: fillColor,
      opacity: fillOpacity,
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

    // Border edges
    const borderGeometry = new THREE.PlaneGeometry(width, depth);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: borderColor,
      linewidth: 2,
      depthTest: false,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMaterial);
    borderLines.rotation.x = -Math.PI / 2;
    borderLines.position.y = height + 1;
    borderLines.renderOrder = 1000;
    group.add(borderLines);

    // Optional icon label
    if (icon) {
      this.addSchematicLabel(group, icon, width, depth, height);
    }
  }

  /**
   * Create generic schematic for objects - lime green
   */
  private createGenericSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    this.createRectangularSchematic(group, width, depth, height, 0x32cd32, 0x006400, 0.6);
  }

  /**
   * Create toilet schematic - off-white with dark gray border
   */
  private createToiletSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    this.createRectangularSchematic(group, width, depth, height, 0xf5f5f5, 0x333333, 0.8, '🚽');
  }

  /**
   * Create sink schematic - sky blue with royal blue border
   */
  private createSinkSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    this.createRectangularSchematic(group, width, depth, height, 0x87ceeb, 0x4169e1, 0.7, '🚰');
  }

  /**
   * Create radiator schematic - orange with dark orange border
   */
  private createRadiatorSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    this.createRectangularSchematic(group, width, depth, height, 0xffa500, 0xcc4400, 0.7, '♨️');
  }

  /**
   * Create furniture schematic - cadet blue (teal) with dark slate gray border
   */
  private createFurnitureSchematic(group: THREE.Group, width: number, depth: number, height: number): void {
    this.createRectangularSchematic(group, width, depth, height, 0x5f9ea0, 0x2f4f4f, 0.7, '🚰');
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
    ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw bright border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw the icon (larger and centered)
    ctx.font = `${size * 0.55}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, size / 2, size / 2 + 4);

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
   * Uses deferred batching to avoid expensive Box3.setFromObject() calls on every drag event
   */
  public updateSchematicPosition(itemId: number): void {
    if (this.viewMode !== '2d') return;

    const schematic = this.schematic2DOverlays.get(itemId);
    const model = this.existingItems.get(itemId);

    if (schematic && model) {
      // Ensure matrix is up to date
      model.updateMatrixWorld(true);

      // Recalculate position from bounding box to ensure correct centering
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      // Update position immediately
      schematic.position.set(center.x, 0, center.z);
      schematic.rotation.y = model.rotation.y;

      // console.log(`🔄 Updated schematic ${itemId} to (${center.x.toFixed(1)}, ${center.z.toFixed(1)})`);
    }
  }

  /**
   * Update all schematic overlay positions and rotations (called after any object movement)
   * Uses deferred batching to avoid expensive Box3.setFromObject() calls on every drag event
   */
  public updateAllSchematicPositions(): void {
    if (this.viewMode !== '2d') return;

    // Add all items to pending updates
    this.schematic2DOverlays.forEach((_schematic, itemId) => {
      this.pendingSchematicUpdates.add(itemId);
    });

    // Schedule a single RAF if not already scheduled
    if (!this.schematicUpdateScheduled) {
      this.schematicUpdateScheduled = true;
      requestAnimationFrame(() => this.flushSchematicUpdates());
    }
  }

  /**
   * Flush pending schematic updates - performs the actual Box3/position/rotation sync
   * Called once per animation frame to batch multiple updates together
   */
  private flushSchematicUpdates(): void {
    // Reusable objects to avoid allocations per item
    const box = new THREE.Box3();
    const center = new THREE.Vector3();

    this.pendingSchematicUpdates.forEach((itemId) => {
      const schematic = this.schematic2DOverlays.get(itemId);
      const model = this.existingItems.get(itemId);

      if (schematic && model) {
        // Ensure model matrix is up to date
        model.updateMatrixWorld(true);

        // Recalculate position from bounding box
        box.setFromObject(model);
        box.getCenter(center);
        schematic.position.set(center.x, 0, center.z);

        // Sync rotation with the model
        schematic.rotation.y = model.rotation.y;
      } else {
        console.warn(`⚠️ Schematic update failed for item ${itemId}: schematic=${!!schematic}, model=${!!model}`);
      }
    });

    // Clear pending updates and reset scheduled flag
    this.pendingSchematicUpdates.clear();
    this.schematicUpdateScheduled = false;
  }

  /**
   * Remove all 2D schematic overlays when switching to 3D view
   */
  private remove2DSchematicOverlays(): void {
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
    }

    // ✅ Also ensure other critical userData is maintained
    if (!model.userData.sku && item.sku) {
      model.userData.sku = item.sku;
    }

    if (!model.userData.model && item.model) {
      model.userData.model = item.model;
    }

    // Update schematic position if in 2D mode
    if (this.viewMode === '2d') {
      this.updateSchematicPosition(item.id);
    }
  }

  // Helper method to properly dispose of a single material and its textures
  private disposeMaterial(material: THREE.Material): void {
    // Dispose all texture maps on the material
    const textureProps = [
      'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
      'envMap', 'alphaMap', 'aoMap', 'displacementMap',
      'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'
    ];

    for (const prop of textureProps) {
      const texture = (material as any)[prop];
      if (texture instanceof THREE.Texture) {
        texture.dispose();
      }
    }

    // Dispose the material itself
    material.dispose();
  }

  // Helper method to dispose a single mesh (geometry + material + textures)
  private disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          this.disposeMaterial(mat);
        });
      } else {
        this.disposeMaterial(mesh.material);
      }
    }
  }

  // Helper method to dispose a group and all its children
  private disposeGroup(group: THREE.Group | THREE.Object3D): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      }
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              this.disposeMaterial(mat);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
      if (child instanceof THREE.Sprite) {
        if (child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      }
    });
  }

  // Helper method to properly dispose of models (geometry, materials, and textures)
  private disposeModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
      // Also handle Line and LineSegments (used in grids/schematics)
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
      // Handle Sprites (used in labels)
      if (child instanceof THREE.Sprite) {
        if (child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      }
    });
  }

  // Add method to add single item (for real-time adding)
  // Method to add single item (for real-time adding from Planner.vue)
  async addSingleItem(item: BathroomItem): Promise<void> {
    if (this.existingItems.has(item.id)) {
      const existingModel = this.existingItems.get(item.id);
      if (existingModel) {
        this.updateExistingModel(existingModel, item);
      }
      return;
    }

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

        this.enhanceModelMaterials(model);

        this.bathroomItemsGroup.add(model);
        this.existingItems.set(item.id, model);

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
      // Remove schematic if it exists
      this.removeSchematicForItem(itemId);

      this.bathroomItemsGroup.remove(existingModel);
      this.existingItems.delete(itemId);
      this.disposeModel(existingModel);
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
    // Check if item already exists
    if (this.existingItems.has(item.id)) {
      const existingModel = this.existingItems.get(item.id);
      if (existingModel) {
        this.updateExistingModel(existingModel, item);
        return existingModel as THREE.Group;
      }
    }

    const progressiveLoader = ProgressiveModelLoader.getInstance();
    const modelManager = ModelManager.getInstance();
    const sku = item.sku || item.model?.name || `item_${item.id}`;

    // Check if model is already cached - use fast path
    const isCached = modelManager.isModelCached(sku);

    if (isCached) {
      await this.addSingleItem(item);
      const model = this.existingItems.get(item.id) as THREE.Group;
      callbacks?.onProgress?.(100);
      callbacks?.onFullModelAdded?.(model);
      return model;
    }

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
    newPosition?: { x: number, y: number, z: number },
    newRotation?: number
  ): Promise<THREE.Group | null> {
    const existingModel = this.existingItems.get(itemId);
    if (!existingModel) {
      console.error(`❌ Progressive: Item ${itemId} not found for variant swap`);
      return null;
    }

    const progressiveLoader = ProgressiveModelLoader.getInstance();
    const modelManager = ModelManager.getInstance();
    const sku = newVariant.sku || newVariant.name;

    // Store original transform before swapping
    const originalPosition = existingModel.position.clone();
    if (newPosition) {
      originalPosition.set(newPosition.x, newPosition.y, newPosition.z);
    }
    const originalRotation = existingModel.rotation.clone();
    if (newRotation !== undefined) {
      originalRotation.set(0, newRotation, 0);
    }
    const originalScale = existingModel.scale.clone();
    const originalUserData = { ...existingModel.userData };

    // Check if new variant is cached - use fast path
    if (modelManager.isModelCached(sku)) {
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

          callbacks?.onPlaceholderSwapped?.(placeholder);
        },
        onFullModelReady: (fullModel) => {
          // Get positioning parameters from new variant
          const spawnHeight = newVariant.spawnHeight || 0;

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
          } else if (currentModel) {
            sourcePosition = currentModel.position.clone();
            sourceRotation = currentModel.rotation.clone();
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
          this.bathroomItemsGroup.add(wrapper);

          // Remove placeholder if it exists
          if (placeholderInScene && placeholderInScene.parent) {
            this.bathroomItemsGroup.remove(placeholderInScene);
            progressiveLoader.disposePlaceholder(placeholderInScene);
          }
          // Remove current model if different from placeholder
          else if (currentModel && currentModel.parent && currentModel !== placeholderInScene) {
            this.bathroomItemsGroup.remove(currentModel);
            this.disposeModel(currentModel);
          }

          // Update tracking with the WRAPPER (not the inner model)
          this.existingItems.set(itemId, wrapper);

          // Enhance materials on the inner model
          this.enhanceModelMaterials(fullModel);

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
    // Dispose of all 3D models
    this.existingItems.forEach((model) => {
      this.bathroomItemsGroup.remove(model);
      this.disposeModel(model);
    });

    // Clear 3D item tracking
    this.existingItems.clear();

    // Clear and dispose 2D schematic overlays
    this.schematic2DOverlays.forEach((overlay) => {
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

    // Clear any pending schematic updates
    this.pendingSchematicUpdates.clear();
    this.schematicUpdateScheduled = false;
  }


  // ADD: Temporary debug cube method
  addDebugCube(position: [number, number, number]): void {
    if (!this.scene) return;

    const geometry = new THREE.BoxGeometry(50, 50, 50); // 50cm cube
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(position[0], position[1], position[2]);
    this.scene.add(cube);
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

      // SSAO Pass for realistic contact shadows (ambient occlusion)
      // Creates subtle darkening where surfaces meet (wall-floor corners, object bases)
      this.ssaoPass = new SSAOPass(this.scene, activeCamera, window.innerWidth, window.innerHeight);
      this.ssaoPass.kernelRadius = 16;      // Radius of occlusion sampling
      this.ssaoPass.minDistance = 0.005;    // Min distance for occlusion
      this.ssaoPass.maxDistance = 0.1;      // Max distance for occlusion
      this.ssaoPass.output = SSAOPass.OUTPUT.Default;
      this.composer.addPass(this.ssaoPass);

      // Add OutputPass
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      // Set outline pass reference
      setOutlinePass(this.outlinePass);
    } catch (error) {
      console.warn('Post-processing setup failed:', error);
      this.composer = null;
      this.outlinePass = null;
      this.ssaoPass = null;
    }
  }

  private setupEnhancedLighting(): void {
    if (!this.scene) return;

    // Use current room dimensions for shadow camera bounds
    const maxDimension = Math.max(this.roomWidth, this.roomHeight, 500);
    const shadowBound = Math.max(500, maxDimension * 0.8);

    // Check if we're in 2D mode - lights should be configured differently
    const is2DMode = this.viewMode === '2d';

    // Clear existing lights
    this.lights.forEach(light => this.scene!.remove(light));
    this.lights = [];

    // 1. AMBIENT & HEMISPHERE LIGHTS - Natural soft fill
    const ambientLight = new THREE.AmbientLight(0xffffff, is2DMode ? 1.5 : 0.8);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    if (!is2DMode) {
      // Hemisphere light for natural top-down lighting
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 0.8);
      hemiLight.position.set(0, 500, 0);
      this.scene.add(hemiLight);
      this.lights.push(hemiLight);

      // 2. DIRECTIONAL LIGHT - softer shadows for natural look
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(200, 500, 400); // Positioned to light the room more naturally
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 1500;
      // Dynamic shadow camera bounds based on room size
      dirLight.shadow.camera.left = -shadowBound;
      dirLight.shadow.camera.right = shadowBound;
      dirLight.shadow.camera.top = shadowBound;
      dirLight.shadow.camera.bottom = -shadowBound;
      dirLight.shadow.bias = -0.0005;
      this.scene!.add(dirLight);
      this.lights.push(dirLight);

      // 2b. SECONDARY DIRECTIONAL LIGHT - from opposite direction to balance wall illumination
      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dirLight2.position.set(-200, 500, -400); // Opposite corner
      dirLight2.castShadow = false; // Only one shadow-casting light needed
      this.scene!.add(dirLight2);
      this.lights.push(dirLight2);

      // 3. SOFT BACK GLOW - very subtle, placed far away to avoid hotspots
      const backGlow = new THREE.PointLight(0xffffff, 150, 1000, 2.0);
      backGlow.position.set(0, WALL_SETTINGS.HEIGHT, 0); // Center of ceiling
      this.scene!.add(backGlow);
      this.lights.push(backGlow);

    }

    // 4. Set renderer exposure (1.15 for optimal photorealistic look)
    if (this.renderer) {
      this.renderer.toneMappingExposure = is2DMode ? 0.8 : 1.15;
    }
  }

  updateFloor(roomWidth: number, roomHeight: number, floorTexture: TextureConfig, notchWidth?: number, notchHeight?: number): void {
    if (!this.scene) return;

    // Update stored room dimensions for lighting calculations
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    // Dispose old floor geometry and materials before creating new
    if (this.floorRef) {
      this.scene.remove(this.floorRef);
      this.disposeMesh(this.floorRef);
      this.floorRef = null;
    }

    // FIX: Pass room dimensions to material creation
    const floorMaterial = this.createEnhancedFloorMaterial(floorTexture, roomWidth, roomHeight);

    // Check if we should create an L-shaped floor
    const isLShape = notchWidth !== undefined && notchHeight !== undefined && notchWidth > 0 && notchHeight > 0;

    if (isLShape) {
      this.floorRef = createLShapeFloor(roomWidth, roomHeight, notchWidth!, notchHeight!, floorMaterial);
    } else {
      this.floorRef = createFloor(roomWidth, roomHeight, floorMaterial);
    }

    this.scene.add(this.floorRef);

    // If we're in 2D mode, store the new textured material and apply 2D appearance
    if (this.viewMode === '2d') {
      // Store the new textured material as the original (for when we switch back to 3D)
      this.originalFloorMaterial = floorMaterial;
      // Apply the 2D blueprint appearance
      this.switchTo2DFloor();
      // Disable shadows on floor for clean 2D view
      this.floorRef.receiveShadow = false;
    }

    // 🔥 UPDATE: Reposition lights when room dimensions change
    this.setupEnhancedLighting();
    // Update measurement system with new room dimensions (including notch for L-shaped rooms)
    if (this.measurementSystem) {
      this.measurementSystem.updateRoomDimensions(roomWidth, roomHeight, notchWidth, notchHeight);
    }
  }

  private createEnhancedFloorMaterial(floorTexture: TextureConfig, roomWidth: number, roomHeight: number): THREE.MeshStandardMaterial {
    // FIX: Pass room dimensions to texture manager for proper scaling
    const material = textureManager.createTexturedMaterial(floorTexture, { width: roomWidth, height: roomHeight });

    // Floor material - clean matte finish, uniform appearance
    material.roughness = 0.7;
    material.metalness = 0.0;
    material.envMapIntensity = 0.05;

    return material;
  }

  updateWalls(roomWidth: number, roomHeight: number, wallTexture: TextureConfig, notchWidth?: number, notchHeight?: number): void {
    if (!this.scene) return;

    // Update stored room dimensions for lighting calculations
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    // Dispose and remove existing walls
    this.wallRefs.forEach(wall => {
      if (wall.parent) wall.parent.remove(wall);
      this.disposeMesh(wall);
    });
    this.wallRefs = [];

    // Create new walls with enhanced materials
    const wallMaterial = this.createEnhancedWallMaterial(wallTexture);

    // Check if we should create L-shaped walls
    const isLShape = notchWidth !== undefined && notchHeight !== undefined && notchWidth > 0 && notchHeight > 0;

    if (isLShape) {
      this.wallRefs = createLShapeWalls(roomWidth, roomHeight, notchWidth!, notchHeight!, wallMaterial);
    } else {
      this.wallRefs = createWalls(roomWidth, roomHeight, wallMaterial);
    }

    this.wallRefs.forEach(wall => this.scene!.add(wall));

    // If we're in 2D mode, disable shadows on walls for clean view
    if (this.viewMode === '2d') {
      this.wallRefs.forEach(wall => {
        wall.receiveShadow = false;
      });
    }

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
    this.setupEnhancedLighting();
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
    // Use createWallMaterial to support procedural tiles and enhanced reflections
    const material = textureManager.createWallMaterial(wallTexture);

    // Very glossy shiny tile settings
    if (wallTexture.roughness === undefined && !wallTexture.procedural) {
      material.roughness = 0.05;  // Super glossy
    }
    if (wallTexture.metalness === undefined && !wallTexture.procedural) {
      material.metalness = 0.1;  // More shine
    }
    // Strong environment reflections
    if (!wallTexture.procedural) {
      material.envMapIntensity = 0.6;
    }

    // Cache key - update version to force shader recompile
    material.customProgramCacheKey = () => 'wall-bathroom-shiny-v10';

    // Round effect on wall facing camera, side walls uniform
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `varying vec2 vWallUv;
        varying float vFacingCamera;
        void main() {`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWallUv = uv;
        // Calculate how much wall faces camera (dot product with view direction)
        vec3 worldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec3 viewDir = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
        vFacingCamera = dot(worldNormal, viewDir);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `varying vec2 vWallUv;
        varying float vFacingCamera;
        void main() {`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        // Side walls gray, front wall white
        vec3 grayTint = vec3(0.68, 0.68, 0.72);
        vec3 whiteTint = vec3(1.0, 1.0, 1.0);
        float facing = smoothstep(0.0, 0.8, vFacingCamera);
        vec3 wallColor = mix(grayTint, whiteTint, facing);

        // Normalize UVs to 0-1 range (handles scaled UVs on east/west walls)
        vec2 normalizedUv = fract(vWallUv);

        // Shiny light spot - center top area glows
        vec2 shinyCenter = vec2(0.5, 0.25);
        float shinyDist = distance(normalizedUv, shinyCenter);
        float shinySpot = 1.0 - smoothstep(0.0, 0.5, shinyDist);
        float shine = 1.0 + shinySpot * 0.2 * facing;

        // Gradient - brighter top, darker bottom
        float topLight = 1.0 - normalizedUv.y * 0.2;

        // Edge darkening (normalized UVs prevent extreme values on long walls)
        float edgeDark = 1.0 - pow(abs(normalizedUv.x - 0.5) * 2.0, 2.0) * 0.15;

        // Combine: wall color + shine + gradient + edges
        gl_FragColor.rgb *= wallColor * shine * topLight * edgeDark;

        // Add slight white highlight for glossy look on front wall
        gl_FragColor.rgb += vec3(shinySpot * 0.08 * facing);`
      );
    };

    return material;
  }

  updateGrid(roomWidth: number, roomHeight: number, showGrid: boolean, showWallGrid: boolean = true, notchWidth?: number, notchHeight?: number): void {
    if (!this.scene) {
      console.error('❌ Scene is null, cannot update grid');
      return;
    }

    // Store grid visibility preferences for centralized visibility management
    this.showGridEnabled = showGrid;
    this.wallGridVisible = showWallGrid;

    // Dispose and remove existing grid
    if (this.gridRef) {
      this.scene.remove(this.gridRef);
      this.disposeGroup(this.gridRef);
      this.gridRef = null;
    }

    // Dispose and remove existing blueprint grid
    if (this.blueprintGridRef) {
      this.scene.remove(this.blueprintGridRef);
      this.disposeGroup(this.blueprintGridRef);
      this.blueprintGridRef = null;
    }

    // Dispose and remove existing wall grid group
    if (this.wallGridGroup) {
      this.scene.remove(this.wallGridGroup);
      this.disposeGroup(this.wallGridGroup);
      this.wallGridGroup = null;
    }

    // Clear existing wall grid associations
    this.wallCullingManager.clearWallGridLines();

    // Create floor grid if showGrid is enabled
    if (showGrid) {
      try {
        // FIXED: Simplified - createCustomGrid now returns THREE.Group directly
        this.gridRef = createCustomGrid(roomWidth, roomHeight);
        // Visibility will be set by updateGridVisibility() at the end
        this.scene.add(this.gridRef);
      } catch (error) {
        console.error('❌ Error creating floor grid:', error);
      }
    }

    // Create blueprint grid for 2D mode (10cm spacing)
    try {
      this.blueprintGridRef = createBlueprintGrid(roomWidth, roomHeight, notchWidth, notchHeight);
      // Visibility will be set by updateGridVisibility() at the end
      this.scene.add(this.blueprintGridRef);
    } catch (error) {
      console.error('❌ Error creating blueprint grid:', error);
    }

    // Create wall grid group and lines
    this.wallGridGroup = new THREE.Group();
    this.wallGridGroup.name = 'WallGridGroup';

    if (this.wallRefs.length > 0) {
      try {
        this.wallRefs.forEach((wall) => {
          const wallDirection = wall.userData.wallDirection as 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

          if (wallDirection) {
            const wallGridLines = createWallGridLines(wallDirection, roomWidth, roomHeight, notchWidth, notchHeight);

            // Add wall grid lines to the scene
            wallGridLines.forEach((line, lineIndex) => {
              if (line && line.isObject3D) {
                line.name = `WallGrid_${wallDirection}_${lineIndex}`;
                this.wallGridGroup!.add(line);
              }
            });

            // Register the grid lines with the wall culling manager
            this.wallCullingManager.registerWallGridLines(wall, wallGridLines);
          }
        });

        // Add the wall grid group to the scene (visibility set below)
        this.scene.add(this.wallGridGroup);
      } catch (error) {
        console.error('❌ Error creating wall grids:', error);
      }
    }

    // Apply centralized visibility settings based on current view mode
    this.updateGridVisibility();
  }

  // Method to toggle wall grid visibility
  setWallGridVisible(visible: boolean): void {
    this.wallGridVisible = visible;

    if (this.wallGridGroup) {
      this.wallGridGroup.visible = visible;

      // Also update individual line visibility for wall culling
      this.wallGridGroup.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.visible = visible;
        }
      });
    }
  }

  getWallGridVisible(): boolean {
    return this.wallGridVisible;
  }

  // Replace the current updateBathroomItems method with this optimized version
  async updateBathroomItems(items: BathroomItem[]): Promise<void> {
    if (!this.scene || this.isUpdatingItems) return;

    this.isUpdatingItems = true;

    try {
      // Get current item IDs
      const newItemIds = new Set(items.map(item => item.id));
      const existingIds = new Set(this.existingItems.keys());

      // 1. REMOVE items that no longer exist
      const itemsToRemove = Array.from(existingIds).filter(id => !newItemIds.has(id));
      for (const itemId of itemsToRemove) {
        const existingModel = this.existingItems.get(itemId);
        if (existingModel) {
          this.bathroomItemsGroup.remove(existingModel);
          this.existingItems.delete(itemId);

          // Clean up the model
          this.disposeModel(existingModel);
        }
      }

      // 2. ADD new items or UPDATE existing ones
      const updatePromises = items.map(async (item) => {
        const existingModel = this.existingItems.get(item.id);

        if (existingModel) {
          // UPDATE existing item if position/rotation/scale changed
          const hasChanged = this.hasItemChanged(existingModel, item);
          if (hasChanged) {
            this.updateExistingModel(existingModel, item);
          }
        } else {
          // ADD new item (using your existing createModel function)
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

              // Enhance model materials
              this.enhanceModelMaterials(model);

              // Add to scene and track it
              this.bathroomItemsGroup.add(model);
              this.existingItems.set(item.id, model);
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

    } catch (error) {
      console.error('Error updating bathroom items:', error);
    } finally {
      this.isUpdatingItems = false;
    }
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

      // Update SSAO pass resolution
      if (this.ssaoPass) {
        this.ssaoPass.setSize(window.innerWidth, window.innerHeight);
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

  // Cleanup method - enhanced with full disposal of geometries, materials, and textures
  dispose(): void {
    // Restore original material states before clearing (prevents leak if disposed while in 2D mode)
    this.originalMaterialStates.forEach((originalState, material) => {
      material.opacity = originalState.opacity;
      material.transparent = originalState.transparent;
      material.needsUpdate = true;
    });
    this.originalMaterialStates.clear();

    // Clear all items first (disposes models, schematics, etc.)
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
      this.disposeGroup(this.bathroomItemsGroup);
      this.bathroomItemsGroup.clear();
    }

    // Dispose floor geometry and materials
    if (this.floorRef) {
      if (this.scene) this.scene.remove(this.floorRef);
      this.disposeMesh(this.floorRef);
      this.floorRef = null;
    }

    // Dispose original floor material if stored (for 2D/3D switching)
    if (this.originalFloorMaterial) {
      this.disposeMaterial(this.originalFloorMaterial);
      this.originalFloorMaterial = null;
    }

    // Dispose wall geometries and materials
    this.wallRefs.forEach(wall => {
      if (this.scene) this.scene.remove(wall);
      this.disposeMesh(wall);
    });
    this.wallRefs = [];

    // Dispose grid
    if (this.gridRef) {
      if (this.scene) this.scene.remove(this.gridRef);
      this.disposeGroup(this.gridRef);
      this.gridRef = null;
    }

    // Dispose blueprint grid
    if (this.blueprintGridRef) {
      if (this.scene) this.scene.remove(this.blueprintGridRef);
      this.disposeGroup(this.blueprintGridRef);
      this.blueprintGridRef = null;
    }

    // Dispose wall grid group
    if (this.wallGridGroup) {
      if (this.scene) this.scene.remove(this.wallGridGroup);
      this.disposeGroup(this.wallGridGroup);
      this.wallGridGroup = null;
    }

    // Clean up lights
    this.lights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
      // Dispose shadow map if present
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
        if (light.shadow?.map) {
          light.shadow.map.dispose();
        }
      }
    });
    this.lights = [];

    if (this.composer) {
      this.composer.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.orthographicCamera = null;
    this.renderer = null;
    this.composer = null;
    this.outlinePass = null;
    this.ssaoPass = null;

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
    newFloorOffset?: number;
    reason: string;
    roomWidth?: number;
    roomHeight?: number;
  }): void {
    if (!this.scene) return;

    // Remove existing preview mesh if any
    this.clearCollisionPreview();

    const { itemId, currentPosition, currentRotation, newDimensions } = config;
    const newFloorOffset = config.newFloorOffset ?? 0;

    // Use the passed position (which already has the expected Y calculated)
    let posX = currentPosition[0];
    let posZ = currentPosition[2];
    let rotation = currentRotation;

    // Find the actual object in the scene to get accurate X, Z and rotation
    const actualObject = this.bathroomItemsGroup.children.find(
      child => child.userData.itemId === itemId || child.userData.itemId === Number(itemId)
    );

    if (actualObject) {
      // Use actual X, Z from the object (more accurate for horizontal position)
      posX = actualObject.position.x;
      posZ = actualObject.position.z;
      rotation = actualObject.rotation.y;
    }

    // Calculate the visual center Y for the collision preview box
    // The box should be centered at: expectedY + floorOffset + height/2
    const expectedY = currentPosition[1];
    const visualCenterY = expectedY + newFloorOffset + newDimensions.height / 2;
    console.log('🔴 Collision preview Y calculation:', { expectedY, newFloorOffset, height: newDimensions.height, visualCenterY });

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
    wireframeMesh.position.set(posX, visualCenterY, posZ);
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
    solidMesh.position.set(posX, visualCenterY, posZ);
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
