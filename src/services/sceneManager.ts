//src/services/sceneManager.ts

import * as THREE from 'three';
import { type MeasurementData, MeasurementSystem } from './measurementSystem';
import { createModel } from '../models/bathroomFixtures';
import {
  createFloor,
  createWalls,
  createCustomGrid,
  createWallGridLines
} from '../models/roomGeometry';
import textureManager from './textureManager';
import { SimpleWallCulling } from './simpleWallCulling';
import { setOutlinePass } from '../utils/helpers';
import type { BathroomItem } from '../utils/constraints';
import type { TextureConfig } from '../constants/textures';
import { LOOK_AT, CAMERA_SETTINGS, CAMERA_PRESETS } from '../constants/camera';

// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getOrientationForItem } from '../utils/models';

interface SceneComponents {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export class SceneManager {
  public scene: THREE.Scene | null = null;
  public camera: THREE.PerspectiveCamera | null = null;
  public renderer: THREE.WebGLRenderer | null = null;

  // Post-processing components
  private composer: EffectComposer | null = null;
  private outlinePass: OutlinePass | null = null;

  // Animation loop management
  private animationId: number | null = null;
  private isAnimating: boolean = false;

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

  constructor () {
    this.wallCullingManager = new SimpleWallCulling();
    this.bathroomItemsGroup = new THREE.Group();
    this.bathroomItemsGroup.name = 'bathroomItems';
  }

  initializeScene (): SceneComponents {
    // Create scene with better background and atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.Fog(0xf5f5f5, 1000, 5000);

    // Create camera with better positioning and settings
    this.camera = new THREE.PerspectiveCamera(CAMERA_SETTINGS.FOV, window.innerWidth / window.innerHeight, CAMERA_SETTINGS.NEAR, CAMERA_SETTINGS.FAR);
    this.camera.position.set(CAMERA_SETTINGS.INITIAL_POSITION.x, CAMERA_SETTINGS.INITIAL_POSITION.y, CAMERA_SETTINGS.INITIAL_POSITION.z);
    this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

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

  // Add methods to control measurement system
  public enableMeasurements (enabled: boolean): void {
    if (this.measurementSystem) {
      this.measurementSystem.setEnabled(enabled);
    }
  }

  public forceUpdateMeasurements (): void {
    if (this.measurementSystem) {
      this.measurementSystem.forceUpdateMeasurements();
    }
  }

  public setMeasurementSelectedObject (object: THREE.Object3D | null): void {
    if (this.measurementSystem) {
      this.measurementSystem.setSelectedObject(object);
    }
  }

  public getCurrentMeasurements (): MeasurementData | null {
    return this.measurementSystem?.getCurrentMeasurements() || null;
  }

  public isMeasurementEnabled (): boolean {
    return this.measurementSystem?.isEnabled() || false;
  }

  setCameraPreset (preset: 'OVERVIEW' | 'CLOSE_UP' | 'CORNER_VIEW' | 'SIDE_VIEW'): void {
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
  }

  // ADD: Method to get camera info for debugging
  getCameraInfo (): any {
    if (!this.camera) return null;

    return {
      position: this.camera.position,
      lookAt: LOOK_AT,
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far
    };
  }

  private hasItemChanged (model: THREE.Object3D, item: BathroomItem): boolean {
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
  private updateExistingModel (model: THREE.Object3D, item: BathroomItem): void {
    // Update position
    model.position.set(item.position[0], item.position[1], item.position[2]);

    // Update rotation
    model.rotation.y = item.rotation || 0;

    // Update scale
    const scale = item.scale || 1.0;
    model.scale.set(scale, scale, scale);

    console.log(`✅ Updated item ${item.id} properties`);
  }

  // Helper method to properly dispose of models
  private disposeModel (model: THREE.Object3D): void {
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
  async addSingleItem (item: BathroomItem): Promise<void> {
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

        this.debugModelVisibility(model, item);
        this.enhanceModelMaterials(model);

        this.bathroomItemsGroup.add(model);
        this.existingItems.set(item.id, model);
        console.log(`✅ Successfully added item ${item.id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to add single item ${item.id}:`, error);
      throw error;
    }
  }

// Method to remove single item (for real-time deletion from Planner.vue)
  removeSingleItem (itemId: number): void {
    const existingModel = this.existingItems.get(itemId);
    if (existingModel) {
      console.log(`🗑️ Removing single item ${itemId} from scene`);
      this.bathroomItemsGroup.remove(existingModel);
      this.existingItems.delete(itemId);
      this.disposeModel(existingModel);
      console.log(`✅ Successfully removed item ${itemId}`);
    } else {
      console.warn(`⚠️ Item ${itemId} not found in scene for removal`);
    }
  }

// Method to clear all items efficiently
  clearAllItems (): void {
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
  addDebugCube (position: [number, number, number]): void {
    if (!this.scene) return;

    const geometry = new THREE.BoxGeometry(50, 50, 50); // 50cm cube
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(position[0], position[1], position[2]);
    this.scene.add(cube);

    console.log('🔴 Debug cube added at position:', position);
    console.log('🔴 Camera info:', this.getCameraInfo());
  }

  private setupPostProcessing (): void {
    if (!this.scene || !this.camera || !this.renderer) return;

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

      // Add render pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // Enhanced outline pass with distance-optimized settings
      this.outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.scene,
        this.camera
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

  private setupEnhancedLighting (): void {
    if (!this.scene) return;

    // Clear existing lights
    this.lights.forEach(light => this.scene!.remove(light));
    this.lights = [];

    // 1. Ambient light (keep this)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Reduced from 1.2
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // 2. ONLY ONE shadow-casting light (main performance improvement)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(0, 1000, 200);
    mainLight.castShadow = true;

    // CRITICAL: Reduce shadow map size
    mainLight.shadow.mapSize.width = 1024;  // Reduced from 2048
    mainLight.shadow.mapSize.height = 1024; // Reduced from 2048

    mainLight.shadow.camera.near = 10;
    mainLight.shadow.camera.far = 2000;
    mainLight.shadow.camera.left = -800;   // Smaller shadow area
    mainLight.shadow.camera.right = 800;
    mainLight.shadow.camera.top = 800;
    mainLight.shadow.camera.bottom = -800;

    this.scene.add(mainLight);
    this.lights.push(mainLight);

    // 3. Non-shadow fill lights (much cheaper)
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight1.position.set(-500, 800, -500);
    // NO castShadow = true  (this is key!)
    this.scene.add(fillLight1);
    this.lights.push(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight2.position.set(500, 800, 500);
    // NO castShadow = true
    this.scene.add(fillLight2);
    this.lights.push(fillLight2);

    console.log(`✅ Optimized lighting: ${this.lights.length} lights (only 1 with shadows)`);
  }

  updateFloor (roomWidth: number, roomHeight: number, floorTexture: TextureConfig): void {
    if (!this.scene) return;

    if (this.floorRef) {
      this.scene.remove(this.floorRef);
    }

    const floorMaterial = this.createEnhancedFloorMaterial(floorTexture);
    this.floorRef = createFloor(roomWidth, roomHeight, floorMaterial);
    this.scene.add(this.floorRef);

    // Update measurement system with new room dimensions
    if (this.measurementSystem) {
      this.measurementSystem.updateRoomDimensions(roomWidth, roomHeight);
    }
  }

  private createEnhancedFloorMaterial (floorTexture: TextureConfig): THREE.MeshStandardMaterial {
    const material = textureManager.createTexturedMaterial(floorTexture);

    // Enhanced floor material properties
    material.roughness = 0;
    material.metalness = 0.02;
    material.envMapIntensity = 0.5;


    // material.clearcoat = 0.8;
    // material.clearcoatRoughness = 0.1;
    //
    // // Enhance reflectivity
    // material.reflectivity = 0.9;

    return material;
  }

  updateWalls (roomWidth: number, roomHeight: number, wallTexture: TextureConfig): void {
    if (!this.scene) return;

    // Remove existing walls
    this.wallRefs.forEach(wall => {
      if (wall.parent) wall.parent.remove(wall);
    });
    this.wallRefs = [];

    // Create new walls with enhanced materials
    const wallMaterial = this.createEnhancedWallMaterial(wallTexture);
    this.wallRefs = createWalls(roomWidth, roomHeight, wallMaterial);
    this.wallRefs.forEach(wall => this.scene!.add(wall));

    // Update wall culling manager with new walls and room size
    this.wallCullingManager.updateRoomSize(roomWidth, roomHeight);
    this.wallCullingManager.initialize(this.wallRefs, this.camera!);
    // Update measurement system with new room dimensions
    if (this.measurementSystem) {
      this.measurementSystem.updateRoomDimensions(roomWidth, roomHeight);
    }
  }

  private createEnhancedWallMaterial (wallTexture: TextureConfig): THREE.MeshStandardMaterial {
    const material = textureManager.createTexturedMaterial(wallTexture);

    // Enhanced wall material properties
    material.roughness = 0.9;
    material.metalness = 0.0;
    material.envMapIntensity = 0.3;

    return material;
  }

  updateGrid (roomWidth: number, roomHeight: number, showGrid: boolean, showWallGrid: boolean = true): void {
    console.log('🔄 SceneManager.updateGrid called with:', {
      roomWidth,
      roomHeight,
      showGrid,
      showWallGrid
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

        console.log('✅ Floor grid created:', {
          children: this.gridRef.children.length,
          position: this.gridRef.position,
          name: this.gridRef.name
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

    // Create wall grid group and lines
    console.log('🧱 Creating wall grid group...');
    this.wallGridGroup = new THREE.Group();
    this.wallGridGroup.name = 'WallGridGroup';
    this.wallGridVisible = showWallGrid;

    if (this.wallRefs.length > 0) {
      console.log('📊 Available walls:', this.wallRefs.map(wall => ({
        name: wall.name,
        direction: wall.userData.wallDirection,
        position: wall.position
      })));

      try {
        let totalWallGridLines = 0;

        this.wallRefs.forEach((wall, index) => {
          const wallDirection = wall.userData.wallDirection as 'north' | 'south' | 'east' | 'west';

          if (wallDirection) {
            console.log(`🔨 Creating grid for ${wallDirection} wall...`);

            const wallGridLines = createWallGridLines(wallDirection, roomWidth, roomHeight);

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
  setWallGridVisible (visible: boolean): void {
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

  getWallGridVisible (): boolean {
    return this.wallGridVisible;
  }

  private debugModelVisibility (model: THREE.Object3D, item: any): void {
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
  async updateBathroomItems (items: BathroomItem[]): Promise<void> {
    if (!this.scene || this.isUpdatingItems) return;

    this.isUpdatingItems = true;

    try {
      console.log('=== INCREMENTAL BATHROOM ITEMS UPDATE ===');
      console.log('Items to process:', items.length);
      console.log('Existing items in scene:', this.existingItems.size);

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
          console.log(`➕ Adding new item ${item.id} to scene`);
          console.log(`Creating model for item [${index}]:`, {
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

  private getModelBoundingBox (model: THREE.Object3D): any {
    const box = new THREE.Box3().setFromObject(model);
    return {
      min: box.min,
      max: box.max,
      size: box.getSize(new THREE.Vector3()),
      center: box.getCenter(new THREE.Vector3())
    };
  }

  private enhanceModelMaterials (model: THREE.Object3D): void {
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
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  adjustOutlineForDistance (): void {
    if (!this.outlinePass || !this.camera) return;

    // Calculate average distance to selected objects
    const selectedObjects = this.outlinePass.selectedObjects;
    if (selectedObjects.length === 0) return;

    let totalDistance = 0;
    selectedObjects.forEach(obj => {
      totalDistance += this.camera!.position.distanceTo(obj.position);
    });

    const averageDistance = totalDistance / selectedObjects.length;

    // Adjust outline parameters based on distance
    const distanceFactor = Math.max(1, averageDistance / 10); // Normalize to 10 units

    // Scale outline thickness and strength with distance
    this.outlinePass.edgeThickness = Math.min(10, 3 * distanceFactor);
    this.outlinePass.edgeStrength = Math.min(20, 8 * distanceFactor);

    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) { // 1% chance
      console.log(`Outline adjusted for distance: ${averageDistance.toFixed(1)} units`);
    }
  }

  startAnimationLoop (): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.isAnimating = true;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (!this.isAnimating || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      // Update wall culling
      if (this.wallCullingManager) {
        this.wallCullingManager.updateWallVisibility();
      }

      // ADDED: Adjust outline for distance every frame
      this.adjustOutlineForDistance();

      // Render
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  // Method to stop animation loop
  stopAnimationLoop (): void {
    this.isAnimating = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Update composer size when window resizes
  updateComposerSize (): void {
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
  }

  // Wall culling controls
  setWallCullingEnabled (enabled: boolean): void {
    this.wallCullingManager.setEnabled(enabled);
  }

  isWallCullingEnabled (): boolean {
    return this.wallCullingManager.enabled;
  }

  // Cleanup method - enhanced
  dispose (): void {
    // Clear all items first
    this.clearAllItems();

    // Stop animation loop
    this.stopAnimationLoop();

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
  getBathroomItemsGroup (): THREE.Group {
    return this.bathroomItemsGroup;
  }

  // Method to adjust lighting intensity
  adjustLightingIntensity (factor: number): void {
    this.lights.forEach(light => {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.PointLight) {
        light.intensity *= factor;
      }
    });
  }

  // Method to switch lighting presets
  setLightingPreset (preset: 'natural' | 'warm' | 'cool'): void {
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
  getLightingInfo (): { lightCount: number; shadowsEnabled: boolean } {
    return {
      lightCount: this.lights.length,
      shadowsEnabled: this.renderer?.shadowMap.enabled || false
    };
  }
}
