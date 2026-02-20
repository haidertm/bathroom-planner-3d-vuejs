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
import { setOutlinePass, highlightObject } from '../utils/helpers';
import type { BathroomItem } from '../utils/constraints';
import type { TextureConfig } from '../constants/textures';
import { LOOK_AT, CAMERA_SETTINGS, CAMERA_PRESETS, ORTHOGRAPHIC_SETTINGS, type ViewMode } from '../constants/camera';
import { CameraTransition, Easing } from './cameraTransition';
import { getSchematicTypeFromSku, type SchematicType, type DoorConfig, DEFAULT_DOOR_CONFIG } from '../constants/schematicPatterns';

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

    console.log(`📐 Calculated optimal 2D zoom: ${optimalZoom.toFixed(3)} for room ${this.roomWidth}x${this.roomHeight}cm`);

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

      // Get validated L-shape corner from localStorage to determine camera rotation
      const lShapeCorner = this.getValidatedLShapeCorner();
      const targetUp = this.getUpVectorForCorner(lShapeCorner);
      console.log('🔄 L-shape corner:', lShapeCorner ?? 'default (nw)', '-> Target up vector:', targetUp);

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

      // Hide door swing shadows in 2D mode (they have their own 2D arc)
      this.toggleDoorSwingShadows(false);

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

      // Get validated L-shape corner to determine starting camera rotation (matches 2D view orientation)
      const lShapeCorner = this.getValidatedLShapeCorner();
      const startUpVector = this.getUpVectorForCorner(lShapeCorner);
      console.log('🔄 L-shape corner:', lShapeCorner ?? 'default (nw)', '-> Start up vector:', startUpVector);

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

      // Show door swing shadows in 3D mode
      this.toggleDoorSwingShadows(true);

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

    console.log('✅ 3D lighting mode restored');
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
    console.log('✅ 2D floor appearance applied - light blueprint style');
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
    console.log('✅ 3D floor appearance restored');
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

    // Check for doors (Door or WindowAndDoor category with door SKU)
    if (itemType === 'Door' || itemType === 'WindowAndDoor') {
      // Check if it's actually a door (not a window) by SKU pattern
      if (sku.toLowerCase().includes('door')) {
        return 'door';
      }
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
      case 'door':
        // Door schematic needs special handling - will be created in create2DSchematicOverlays
        // with door config passed separately
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

      // Get the bounding box center for positioning (excluding door shadow)
      const shadow = model.getObjectByName('doorSwingShadow');
      const shadowWasVisible = shadow?.visible ?? false;
      if (shadow) shadow.visible = false;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      if (shadow) shadow.visible = shadowWasVisible;

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

      // Create schematic based on object type
      // Door schematics need special handling with doorConfig and collision detection
      if (schematicType === 'door') {
        const doorConfig = model.userData.doorConfig || DEFAULT_DOOR_CONFIG;
        const hasCollision = this.checkDoorSwingCollision(itemId);
        this.createDoorSchematic(schematicGroup, width, depth, schematicHeight, doorConfig, hasCollision);
      } else {
        this.createSchematicByType(schematicType, schematicGroup, width, depth, schematicHeight);
      }

      // Position the schematic
      // For doors, use model.position to match the 3D shadow positioning (which is a child of the model)
      // For other objects, use bounding box center for visual alignment
      if (schematicType === 'door') {
        schematicGroup.position.set(model.position.x, 0, model.position.z);
      } else {
        schematicGroup.position.set(center.x, 0, center.z);
      }

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

    // Get the bounding box center for positioning (excluding door shadow)
    const shadow = model.getObjectByName('doorSwingShadow');
    const shadowWasVisible = shadow?.visible ?? false;
    if (shadow) shadow.visible = false;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    if (shadow) shadow.visible = shadowWasVisible;

    const width = dimensions.width;
    const depth = dimensions.depth;
    const schematicHeight = 50;

    // Create a schematic overlay group
    const schematicGroup = new THREE.Group();
    schematicGroup.name = `Schematic2D_${itemId}`;

    // Create schematic based on object type
    // Door schematics need special handling with doorConfig and collision detection
    if (schematicType === 'door') {
      const doorConfig = model.userData.doorConfig || DEFAULT_DOOR_CONFIG;
      const hasCollision = this.checkDoorSwingCollision(itemId);
      this.createDoorSchematic(schematicGroup, width, depth, schematicHeight, doorConfig, hasCollision);
    } else {
      this.createSchematicByType(schematicType, schematicGroup, width, depth, schematicHeight);
    }

    // Position the schematic
    // For doors, use model.position to match the 3D shadow positioning
    if (schematicType === 'door') {
      schematicGroup.position.set(model.position.x, 0, model.position.z);
    } else {
      schematicGroup.position.set(center.x, 0, center.z);
    }
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
   * Update door configuration and refresh the schematic
   * Called when user changes door swing direction or hinge side
   */
  public updateDoorConfig(itemId: number, doorConfig: DoorConfig): void {
    const model = this.existingItems.get(itemId);
    if (!model) {
      console.warn(`⚠️ Model not found for item ${itemId} when updating door config`);
      return;
    }

    // Get the previous hinge side to detect changes
    const prevDoorConfig = model.userData.doorConfig || DEFAULT_DOOR_CONFIG;
    const hingeChanged = prevDoorConfig.hingeSide !== doorConfig.hingeSide;

    // Update the model's userData with the new door config
    model.userData.doorConfig = doorConfig;

    // Flip the 3D model based on hinge side
    // Default models have hinge on the LEFT, so flip for RIGHT hinge
    if (hingeChanged) {
      // Temporarily hide shadow to exclude from bounding box
      const existingShadow = model.getObjectByName('doorSwingShadow');
      const shadowWasVisible = existingShadow?.visible ?? false;
      if (existingShadow) existingShadow.visible = false;

      // Get bounding box center before flip
      const boxBefore = new THREE.Box3().setFromObject(model);
      const centerBefore = new THREE.Vector3();
      boxBefore.getCenter(centerBefore);

      // Apply the flip
      const flipX = doorConfig.hingeSide === 'right' ? -1 : 1;
      model.scale.x = Math.abs(model.scale.x) * flipX;

      // Get bounding box center after flip
      const boxAfter = new THREE.Box3().setFromObject(model);
      const centerAfter = new THREE.Vector3();
      boxAfter.getCenter(centerAfter);

      // Restore shadow visibility to its original state
      if (existingShadow) existingShadow.visible = shadowWasVisible;

      // Compensate for the position shift caused by flipping
      const shiftX = centerBefore.x - centerAfter.x;
      const shiftZ = centerBefore.z - centerAfter.z;
      model.position.x += shiftX;
      model.position.z += shiftZ;
    }

    // If in 2D mode, recreate the schematic with the new config
    if (this.viewMode === '2d') {
      // Remove existing schematic
      this.removeSchematicForItem(itemId);
      // Create new schematic with updated config
      this.createSchematicForItem(itemId);
    }

    // Update 3D swing shadow
    this.updateDoorSwingShadow(model, doorConfig);

    // Ensure shadow is visible in 3D mode
    if (this.viewMode === '3d') {
      const shadow = model.getObjectByName('doorSwingShadow');
      if (shadow) {
        shadow.visible = true;
      }
    }

    // Re-highlight the door to include the new shadow mesh in the outline pass
    highlightObject(model, true);
  }

  /**
   * Create or update the 3D door swing shadow (arc on floor showing door path)
   */
  private updateDoorSwingShadow(model: THREE.Object3D, doorConfig: DoorConfig): void {
    // Remove existing shadow if any
    const existingShadow = model.getObjectByName('doorSwingShadow');
    if (existingShadow) {
      model.remove(existingShadow);
      if (existingShadow instanceof THREE.Mesh) {
        existingShadow.geometry.dispose();
        if (existingShadow.material instanceof THREE.Material) {
          existingShadow.material.dispose();
        }
      }
    }

    const { swingDirection } = doorConfig;

    // Get door dimensions from userData (original dimensions, not affected by shadow)
    const dimensions = model.userData.dimensions || model.userData.model?.dimensions;
    let doorWidth: number;
    let doorDepth: number;

    if (dimensions) {
      doorWidth = dimensions.width;
      doorDepth = dimensions.depth;
    } else {
      // Fallback to bounding box (shadow already removed above)
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      doorWidth = Math.max(size.x, size.z);
      doorDepth = Math.min(size.x, size.z);
    }

    // Arc radius equals door width
    const arcRadius = doorWidth;

    // Calculate arc angles based on swing direction
    // Since the shadow is a child of the model, when model.scale.x = -1 (right hinge),
    // the shadow gets mirrored automatically. So we always use LEFT hinge angles
    // and let the model's scale handle the mirroring for right hinge.
    let startAngle: number;
    let endAngle: number;

    if (swingDirection === 'inward') {
      startAngle = 0;
      endAngle = -Math.PI / 2;
    } else {
      startAngle = 0;
      endAngle = Math.PI / 2;
    }

    // Create a filled arc sector (pie shape) using THREE.Shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); // Start at center (hinge point)

    // Draw arc
    const segments = 32;
    const angleRange = endAngle - startAngle;
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (i / segments) * angleRange;
      const x = arcRadius * Math.cos(angle);
      const y = arcRadius * Math.sin(angle);
      shape.lineTo(x, y);
    }
    shape.lineTo(0, 0); // Close the shape back to center

    // Create geometry and mesh
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0x222222, // Dark shadow color
      transparent: true,
      opacity: 0.5, // More visible shadow
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const shadowMesh = new THREE.Mesh(geometry, material);
    shadowMesh.name = 'doorSwingShadow';
    shadowMesh.rotation.x = -Math.PI / 2; // Lay flat on floor

    // Position at hinge location - always use left hinge position since model flip handles right hinge
    const hingeX = -doorWidth / 2;
    const hingeZ = swingDirection === 'inward' ? doorDepth / 2 : -doorDepth / 2;

    shadowMesh.position.set(hingeX, 0.5, hingeZ);

    // Only visible in 3D mode
    shadowMesh.visible = this.viewMode === '3d';

    model.add(shadowMesh);
  }

  /**
   * Toggle visibility of all door swing shadows
   * Used when switching between 2D and 3D modes
   */
  private toggleDoorSwingShadows(visible: boolean): void {
    this.existingItems.forEach((model) => {
      const shadow = model.getObjectByName('doorSwingShadow');
      if (shadow) {
        shadow.visible = visible;
      }
    });
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
   * Create door schematic with swing arc
   * Shows a door panel and a 90-degree arc indicating the swing direction
   *
   * @param group - The THREE.Group to add schematic elements to
   * @param width - Door width (in cm)
   * @param depth - Door depth/thickness (in cm)
   * @param height - Y position for the schematic
   * @param doorConfig - Door configuration (hingeSide and swingDirection)
   * @param hasCollision - Whether there's an object collision in the swing path
   */
  private createDoorSchematic(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    doorConfig: DoorConfig = DEFAULT_DOOR_CONFIG,
    hasCollision: boolean = false
  ): void {
    const { hingeSide, swingDirection } = doorConfig;

    // Door panel thickness for visualization (thin line)
    const panelThickness = Math.max(depth, 5); // At least 5cm thick for visibility

    // Colors - arc turns red when there's a collision
    const doorColor = 0x8B4513; // Saddle brown for door
    const arcColor = hasCollision ? 0xff0000 : 0x4169e1; // Red for collision, Royal blue otherwise
    const hingeColor = 0x333333; // Dark gray for hinge indicator

    // Create door panel (thin rectangle along one edge of the door frame)
    const panelGeometry = new THREE.PlaneGeometry(width, panelThickness);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: doorColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    const doorPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    doorPanel.rotation.x = -Math.PI / 2; // Lay flat
    doorPanel.position.y = height;
    doorPanel.renderOrder = 1000;

    // Position door panel based on swing direction
    // When door is closed, it sits at the wall edge where the hinge is
    // inward: panel is at the inside edge of depth (room side)
    // outward: panel is at the outside edge of depth (hallway side)
    const panelZOffset = swingDirection === 'inward' ? depth / 2 - panelThickness / 2 : -depth / 2 + panelThickness / 2;
    doorPanel.position.z = panelZOffset;

    group.add(doorPanel);

    // Create the 90-degree swing arc
    const arcRadius = width; // Arc radius equals door width
    const arcSegments = 32;

    // Determine arc start and end angles based on hinge side and swing direction
    let startAngle: number;
    let endAngle: number;

    // Arc angles are measured from the positive X-axis (right side)
    // We need to calculate based on:
    // - hingeSide: determines which side of the door frame the hinge is on
    // - swingDirection: determines if arc sweeps into room (inward) or out (outward)

    if (hingeSide === 'right') {
      // Hinge on right side of door
      if (swingDirection === 'inward') {
        startAngle = Math.PI; // Closed position (pointing left, along wall)
        endAngle = Math.PI * 1.5; // Open position (into room, 270°)
      } else {
        // Door swings outward
        startAngle = Math.PI; // Closed position
        endAngle = Math.PI / 2; // Open position (out of room, 90°)
      }
    } else {
      // Hinge on left side of door
      if (swingDirection === 'inward') {
        startAngle = 0; // Closed position (pointing right, along wall)
        endAngle = -Math.PI / 2; // Open position (into room, -90°)
      } else {
        // Door swings outward
        startAngle = 0; // Closed position
        endAngle = Math.PI / 2; // Open position (out of room, 90°)
      }
    }

    // Create arc curve
    const arcCurve = new THREE.EllipseCurve(
      0, 0, // Center x, y (will be positioned later)
      arcRadius, arcRadius, // X and Y radius (same for circular arc)
      startAngle, endAngle, // Start and end angles
      startAngle > endAngle, // Clockwise if start > end
      0 // Rotation
    );

    const arcPoints = arcCurve.getPoints(arcSegments);
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
      color: arcColor,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false
    });
    const arcLine = new THREE.Line(arcGeometry, arcMaterial);
    arcLine.rotation.x = -Math.PI / 2; // Lay flat on floor
    arcLine.position.y = height;
    arcLine.renderOrder = 1001;

    // Position arc center at the hinge location
    const hingeX = hingeSide === 'right' ? width / 2 : -width / 2;
    const hingeZ = swingDirection === 'inward' ? depth / 2 : -depth / 2;
    arcLine.position.x = hingeX;
    arcLine.position.z = hingeZ;

    group.add(arcLine);

    // Add small circle at hinge point
    const hingeGeometry = new THREE.CircleGeometry(4, 16); // 4cm radius
    const hingeMaterial = new THREE.MeshBasicMaterial({
      color: hingeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    const hingeDot = new THREE.Mesh(hingeGeometry, hingeMaterial);
    hingeDot.rotation.x = -Math.PI / 2;
    hingeDot.position.set(hingeX, height + 1, panelZOffset);
    hingeDot.renderOrder = 1002;

    group.add(hingeDot);

    // Add a dashed line showing the door in open position
    // Get the arc's end point directly from the curve points
    const lastArcPoint = arcPoints[arcPoints.length - 1];
    // Arc points are 2D (x, y), after rotation.x = -PI/2 they become (x, 0, -y) relative to arc position
    // So the 3D endpoint is: (hingeX + lastArcPoint.x, height, hingeZ - lastArcPoint.y)
    const openDoorEndX = hingeX + lastArcPoint.x;
    const openDoorEndZ = hingeZ - lastArcPoint.y;

    const openDoorPoints = [
      new THREE.Vector3(hingeX, height, hingeZ),
      new THREE.Vector3(openDoorEndX, height, openDoorEndZ)
    ];

    const openDoorGeometry = new THREE.BufferGeometry().setFromPoints(openDoorPoints);
    const openDoorMaterial = new THREE.LineDashedMaterial({
      color: doorColor,
      linewidth: 1,
      dashSize: 10,
      gapSize: 5,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      depthWrite: false
    });
    const openDoorLine = new THREE.Line(openDoorGeometry, openDoorMaterial);
    openDoorLine.computeLineDistances(); // Required for dashed lines
    openDoorLine.renderOrder = 999;

    group.add(openDoorLine);

    // Add border around the door frame area
    const framePoints = [
      new THREE.Vector3(-width / 2, height, -depth / 2),
      new THREE.Vector3(width / 2, height, -depth / 2),
      new THREE.Vector3(width / 2, height, depth / 2),
      new THREE.Vector3(-width / 2, height, depth / 2),
      new THREE.Vector3(-width / 2, height, -depth / 2) // Close the rectangle
    ];
    const frameGeometry = new THREE.BufferGeometry().setFromPoints(framePoints);
    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      linewidth: 1,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false
    });
    const frameLine = new THREE.Line(frameGeometry, frameMaterial);
    frameLine.renderOrder = 998;

    group.add(frameLine);
  }

  /**
   * Check if any object collides with a door's swing path
   * The swing path is a 90-degree arc sector from the hinge point
   *
   * @param doorId - The door item's ID
   * @returns true if any object is in the door's swing path
   */
  public checkDoorSwingCollision(doorId: number): boolean {
    const doorModel = this.existingItems.get(doorId);
    if (!doorModel) return false;

    const doorConfig = doorModel.userData.doorConfig || DEFAULT_DOOR_CONFIG;
    const { hingeSide, swingDirection } = doorConfig;

    // Get door dimensions from bounding box
    const doorBox = new THREE.Box3().setFromObject(doorModel);
    const doorSize = new THREE.Vector3();
    doorBox.getSize(doorSize);
    const doorWidth = Math.max(doorSize.x, doorSize.z);
    const doorDepth = Math.min(doorSize.x, doorSize.z);

    // Get door world position
    const doorWorldPos = new THREE.Vector3();
    doorModel.getWorldPosition(doorWorldPos);

    // Calculate hinge position in world coordinates
    const doorRotation = doorModel.rotation.y;
    const localHingeX = hingeSide === 'right' ? doorWidth / 2 : -doorWidth / 2;
    const localHingeZ = swingDirection === 'inward' ? doorDepth / 2 : -doorDepth / 2;

    // Rotate local hinge position by door's rotation
    const cosR = Math.cos(doorRotation);
    const sinR = Math.sin(doorRotation);
    const hingeWorldX = doorWorldPos.x + (localHingeX * cosR - localHingeZ * sinR);
    const hingeWorldZ = doorWorldPos.z + (localHingeX * sinR + localHingeZ * cosR);

    // Arc radius is the door width
    const arcRadius = doorWidth;

    // Calculate arc angle range in world coordinates
    let startAngle: number;
    let endAngle: number;

    if (hingeSide === 'right') {
      if (swingDirection === 'inward') {
        startAngle = Math.PI;
        endAngle = Math.PI * 1.5;
      } else {
        startAngle = Math.PI;
        endAngle = Math.PI / 2;
      }
    } else {
      if (swingDirection === 'inward') {
        startAngle = 0;
        endAngle = -Math.PI / 2;
      } else {
        startAngle = 0;
        endAngle = Math.PI / 2;
      }
    }

    // Adjust angles by door rotation
    startAngle += doorRotation;
    endAngle += doorRotation;

    // Normalize angles to [0, 2*PI)
    const normalizeAngle = (angle: number): number => {
      while (angle < 0) angle += Math.PI * 2;
      while (angle >= Math.PI * 2) angle -= Math.PI * 2;
      return angle;
    };

    const normStart = normalizeAngle(startAngle);
    const normEnd = normalizeAngle(endAngle);

    // Check if a point is within the arc sector
    const isPointInArcSector = (px: number, pz: number): boolean => {
      // Calculate distance from hinge
      const dx = px - hingeWorldX;
      const dz = pz - hingeWorldZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // If point is outside the arc radius, no collision
      if (distance > arcRadius) return false;

      // Calculate angle of point from hinge
      let pointAngle = Math.atan2(dz, dx);
      pointAngle = normalizeAngle(pointAngle);

      // Check if angle is within arc range
      // Handle wrap-around cases
      if (normStart <= normEnd) {
        return pointAngle >= normStart && pointAngle <= normEnd;
      } else {
        // Arc wraps around 0/2PI
        return pointAngle >= normStart || pointAngle <= normEnd;
      }
    };

    // Check all other objects in the scene
    for (const [itemId, model] of this.existingItems) {
      // Skip the door itself
      if (itemId === doorId) continue;

      // Skip non-bathroom items
      if (!model.userData.isBathroomItem) continue;

      // Get object's bounding box
      const objBox = new THREE.Box3().setFromObject(model);
      const objMin = objBox.min;
      const objMax = objBox.max;

      // Check corners of the bounding box (on floor level, Y doesn't matter for 2D check)
      const corners = [
        { x: objMin.x, z: objMin.z },
        { x: objMin.x, z: objMax.z },
        { x: objMax.x, z: objMin.z },
        { x: objMax.x, z: objMax.z },
      ];

      // Also check center
      const center = new THREE.Vector3();
      objBox.getCenter(center);
      corners.push({ x: center.x, z: center.z });

      // If any corner or center is in the arc sector, there's a collision
      for (const corner of corners) {
        if (isPointInArcSector(corner.x, corner.z)) {
          return true;
        }
      }

      // Additional check: if the arc passes through the object's bounding box
      // Sample points along the arc and check if they're inside the object's XZ bounds
      const arcSamples = 8;
      const angleRange = normEnd >= normStart ? normEnd - normStart : (Math.PI * 2 - normStart + normEnd);
      const angleStep = angleRange / arcSamples;

      for (let i = 0; i <= arcSamples; i++) {
        const sampleAngle = normStart + i * angleStep;
        const arcX = hingeWorldX + arcRadius * Math.cos(sampleAngle);
        const arcZ = hingeWorldZ + arcRadius * Math.sin(sampleAngle);

        if (arcX >= objMin.x && arcX <= objMax.x && arcZ >= objMin.z && arcZ <= objMax.z) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update all door schematics to reflect current collision states
   * Called when objects are moved or placed
   */
  public updateAllDoorCollisions(): void {
    if (this.viewMode !== '2d') return;

    // Find all doors and update their schematics
    for (const [itemId, model] of this.existingItems) {
      const schematicType = this.getSchematicType(model);
      if (schematicType === 'door') {
        // Remove and recreate the schematic with updated collision state
        this.removeSchematicForItem(itemId);
        this.createSchematicForItem(itemId);
      }
    }
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

      // Check if this is a door - doors use model.position for consistency with 3D shadow
      const schematicType = this.getSchematicType(model);

      if (schematicType === 'door') {
        // For doors, use model.position to match the 3D shadow positioning
        schematic.position.set(model.position.x, 0, model.position.z);
      } else {
        // For other objects, use bounding box center (excluding door shadow)
        const shadow = model.getObjectByName('doorSwingShadow');
        const shadowWasVisible = shadow?.visible ?? false;
        if (shadow) shadow.visible = false;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        if (shadow) shadow.visible = shadowWasVisible;

        schematic.position.set(center.x, 0, center.z);
      }

      schematic.rotation.y = model.rotation.y;
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

    // Update door configuration if item has it and apply 3D flip
    if (item.doorConfig) {
      model.userData.doorConfig = item.doorConfig;

      // Flip the 3D model based on hinge side
      // Default models have hinge on LEFT, so flip for RIGHT hinge
      const flipX = item.doorConfig.hingeSide === 'right' ? -1 : 1;
      const currentFlipX = model.scale.x < 0 ? -1 : 1;

      // Only compensate position if the flip state actually changes
      if (currentFlipX !== flipX) {
        // Get bounding box center before flip
        const boxBefore = new THREE.Box3().setFromObject(model);
        const centerBefore = new THREE.Vector3();
        boxBefore.getCenter(centerBefore);

        // Apply the flip
        model.scale.x = Math.abs(model.scale.x) * flipX;

        // Get bounding box center after flip
        const boxAfter = new THREE.Box3().setFromObject(model);
        const centerAfter = new THREE.Vector3();
        boxAfter.getCenter(centerAfter);

        // Compensate for the position shift caused by flipping
        const shiftX = centerBefore.x - centerAfter.x;
        const shiftZ = centerBefore.z - centerAfter.z;
        model.position.x += shiftX;
        model.position.z += shiftZ;
      } else {
        model.scale.x = Math.abs(model.scale.x) * flipX;
      }

      // Update 3D swing shadow for door
      this.updateDoorSwingShadow(model, item.doorConfig);
    }

    // Update schematic position if in 2D mode
    if (this.viewMode === '2d') {
      this.updateSchematicPosition(item.id);
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

        // Store door configuration for door items and apply 3D flip if needed
        if (item.doorConfig) {
          model.userData.doorConfig = item.doorConfig;
          // Flip the 3D model based on hinge side (default model has hinge on LEFT, flip for RIGHT)
          if (item.doorConfig.hingeSide === 'right') {
            // Get bounding box center before flip
            const boxBefore = new THREE.Box3().setFromObject(model);
            const centerBefore = new THREE.Vector3();
            boxBefore.getCenter(centerBefore);

            // Apply the flip
            model.scale.x = Math.abs(model.scale.x) * -1;

            // Get bounding box center after flip
            const boxAfter = new THREE.Box3().setFromObject(model);
            const centerAfter = new THREE.Vector3();
            boxAfter.getCenter(centerAfter);

            // Compensate for the position shift caused by flipping
            const shiftX = centerBefore.x - centerAfter.x;
            const shiftZ = centerBefore.z - centerAfter.z;
            model.position.x += shiftX;
            model.position.z += shiftZ;
          }

          // Add 3D swing shadow for door
          this.updateDoorSwingShadow(model, item.doorConfig);
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
    newPosition?: { x: number, y: number, z: number },
    newRotation?: number
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

    console.log('✅ All items cleared efficiently (3D models and 2D schematics)');
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

      console.log('Enhanced post-processing setup successful with SSAO');
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

    // Store grid visibility preferences for centralized visibility management
    this.showGridEnabled = showGrid;
    this.wallGridVisible = showWallGrid;

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
        // Visibility will be set by updateGridVisibility() at the end

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
      this.blueprintGridRef = createBlueprintGrid(roomWidth, roomHeight, notchWidth, notchHeight);
      // Visibility will be set by updateGridVisibility() at the end
      this.scene.add(this.blueprintGridRef);
      console.log(`✅ Blueprint grid created (viewMode: ${this.viewMode})`);
    } catch (error) {
      console.error('❌ Error creating blueprint grid:', error);
    }

    // Create wall grid group and lines
    console.log('🧱 Creating wall grid group...');
    this.wallGridGroup = new THREE.Group();
    this.wallGridGroup.name = 'WallGridGroup';
    // wallGridVisible already set at the start of the method

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

        // Add the wall grid group to the scene (visibility set below)
        this.scene.add(this.wallGridGroup);
        console.log('✅ Wall grid group added to scene');

      } catch (error) {
        console.error('❌ Error creating wall grids:', error);
      }
    } else {
      console.log('⏭️ No walls available for wall grid creation');
    }

    // Apply centralized visibility settings based on current view mode
    this.updateGridVisibility();

    // Final scene debugging
    console.log('🎬 Final scene state:', {
      totalChildren: this.scene.children.length,
      gridRef: this.gridRef ? 'present' : 'null',
      wallGridGroup: this.wallGridGroup ? 'present' : 'null',
      wallGridVisible: this.wallGridVisible,
      showGridEnabled: this.showGridEnabled,
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
    // Temporarily hide the door swing shadow if it exists to exclude it from bounding box
    const shadow = model.getObjectByName('doorSwingShadow');
    const shadowWasVisible = shadow?.visible ?? false;
    if (shadow) {
      shadow.visible = false;
    }

    const box = new THREE.Box3().setFromObject(model);

    // Restore shadow visibility
    if (shadow) {
      shadow.visible = shadowWasVisible;
    }

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
