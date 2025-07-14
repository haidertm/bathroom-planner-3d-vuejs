import * as THREE from 'three';
import { createFloor, createWalls, createCustomGrid } from '../models/roomGeometry';
import textureManager from './textureManager';
import { SimpleWallCulling } from './simpleWallCulling';
import { createModel } from '../models/bathroomFixtures';
import { setOutlinePass } from '../utils/helpers';
import type { BathroomItem } from '../utils/constraints';
import type { TextureConfig } from '../constants/textures';

// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

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

  // Enhanced lighting management
  private lights: THREE.Light[] = [];

  constructor() {
    this.wallCullingManager = new SimpleWallCulling();
    this.bathroomItemsGroup = new THREE.Group();
    this.bathroomItemsGroup.name = 'bathroomItems';
  }

  initializeScene(): SceneComponents {
    // Create scene with better background and atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.Fog(0xf5f5f5, 10, 50);

    // Create camera with better positioning and settings
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 9);
    this.camera.lookAt(0, 0, 0);

    // Create renderer with enhanced settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
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

    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    };
  }

  private setupPostProcessing(): void {
    if (!this.scene || !this.camera || !this.renderer) return;

    try {
      // Create render target with higher precision for better outline rendering
      const renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
          format: THREE.RGBAFormat,
          type: THREE.FloatType, // Use FloatType for better precision
          colorSpace: THREE.SRGBColorSpace,
          // Add multisampling for smoother outlines
          samples: 4,
          // Higher precision depth buffer
          depthBuffer: true,
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
      this.outlinePass.edgeStrength = 20;        // Increased from 10
      this.outlinePass.edgeGlow = 2.0;           // Reduced glow for better visibility
      this.outlinePass.edgeThickness = 6;        // Increased thickness
      this.outlinePass.pulsePeriod = 0;          // Disable pulsing for consistency
      this.outlinePass.visibleEdgeColor.set('#00ffcc');
      this.outlinePass.hiddenEdgeColor.set('#00ffcc'); // Make hidden edges more visible

      // CRITICAL: Set resolution multiplier for better edge detection
      this.outlinePass.resolution = new THREE.Vector2(
        window.innerWidth * 2,
        window.innerHeight * 2
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

  private setupEnhancedLighting(): void {
    if (!this.scene) return;

    // Clear existing lights
    this.lights.forEach(light => this.scene!.remove(light));
    this.lights = [];

    // 1. Bright ambient light - creates that "well-lit room" base
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased from 0.8
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // 2. Main ceiling light - bright overhead illumination
    const mainCeilingLight = new THREE.PointLight(0xffffff, 2.0, 30); // Back to original
    mainCeilingLight.position.set(0, 2.8, 0);
    mainCeilingLight.castShadow = true;
    mainCeilingLight.shadow.mapSize.width = 2048;
    mainCeilingLight.shadow.mapSize.height = 2048;
    mainCeilingLight.shadow.camera.near = 0.1;
    mainCeilingLight.shadow.camera.far = 20;
    mainCeilingLight.shadow.bias = -0.0001;

    this.scene.add(mainCeilingLight);
    this.lights.push(mainCeilingLight);

    // 3. Additional ceiling lights for even coverage
    const ceilingLight1 = new THREE.PointLight(0xffffff, 1.4, 18); // Increased from 0.8
    ceilingLight1.position.set(1.5, 2.8, 1.5);
    ceilingLight1.castShadow = true;
    ceilingLight1.shadow.mapSize.width = 1024;
    ceilingLight1.shadow.mapSize.height = 1024;
    ceilingLight1.shadow.camera.near = 0.1;
    ceilingLight1.shadow.camera.far = 15;

    this.scene.add(ceilingLight1);
    this.lights.push(ceilingLight1);

    const ceilingLight2 = new THREE.PointLight(0xffffff, 1.4, 18); // Increased from 0.8
    ceilingLight2.position.set(-1.5, 2.8, -1.5);
    ceilingLight2.castShadow = true;
    ceilingLight2.shadow.mapSize.width = 1024;
    ceilingLight2.shadow.mapSize.height = 1024;
    ceilingLight2.shadow.camera.near = 0.1;
    ceilingLight2.shadow.camera.far = 15;

    this.scene.add(ceilingLight2);
    this.lights.push(ceilingLight2);

    // 4. MORE ceiling lights for corner coverage
    const ceilingLight3 = new THREE.PointLight(0xffffff, 1.2, 16);
    ceilingLight3.position.set(1.5, 2.8, -1.5);
    ceilingLight3.castShadow = true;
    ceilingLight3.shadow.mapSize.width = 1024;
    ceilingLight3.shadow.mapSize.height = 1024;
    ceilingLight3.shadow.camera.near = 0.1;
    ceilingLight3.shadow.camera.far = 15;

    this.scene.add(ceilingLight3);
    this.lights.push(ceilingLight3);

    const ceilingLight4 = new THREE.PointLight(0xffffff, 1.2, 16);
    ceilingLight4.position.set(-1.5, 2.8, 1.5);
    ceilingLight4.castShadow = true;
    ceilingLight4.shadow.mapSize.width = 1024;
    ceilingLight4.shadow.mapSize.height = 1024;
    ceilingLight4.shadow.camera.near = 0.1;
    ceilingLight4.shadow.camera.far = 15;

    this.scene.add(ceilingLight4);
    this.lights.push(ceilingLight4);

    // 5. Brighter directional light from above - simulates natural light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.8); // Increased from 0.4
    topLight.position.set(0, 10, 2);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 0.1;
    topLight.shadow.camera.far = 30;
    topLight.shadow.camera.left = -10;
    topLight.shadow.camera.right = 10;
    topLight.shadow.camera.top = 10;
    topLight.shadow.camera.bottom = -10;
    topLight.shadow.bias = -0.0001;

    this.scene.add(topLight);
    this.lights.push(topLight);

    // 6. Multiple fill lights to reduce harsh shadows
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.5); // Increased from 0.2
    fillLight1.position.set(-5, 8, -5);
    this.scene.add(fillLight1);
    this.lights.push(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight2.position.set(5, 8, 5);
    this.scene.add(fillLight2);
    this.lights.push(fillLight2);

    const fillLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight3.position.set(-5, 8, 5);
    this.scene.add(fillLight3);
    this.lights.push(fillLight3);

    // 7. Side rim lights for better object definition
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight1.position.set(8, 5, 0);
    this.scene.add(rimLight1);
    this.lights.push(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight2.position.set(-8, 5, 0);
    this.scene.add(rimLight2);
    this.lights.push(rimLight2);

    // 8. Additional ambient fill from below (subtle floor bounce)
    const floorBounce = new THREE.HemisphereLight(0xffffff, 0xf0f0f0, 0.4);
    floorBounce.position.set(0, -1, 0);
    this.scene.add(floorBounce);
    this.lights.push(floorBounce);

    console.log(`Enhanced lighting setup complete: ${this.lights.length} lights total`);
  }

  updateFloor(roomWidth: number, roomHeight: number, floorTexture: TextureConfig): void {
    if (!this.scene) return;

    if (this.floorRef) {
      this.scene.remove(this.floorRef);
    }

    const floorMaterial = this.createEnhancedFloorMaterial(floorTexture);
    this.floorRef = createFloor(roomWidth, roomHeight, floorMaterial);
    this.scene.add(this.floorRef);
  }

  private createEnhancedFloorMaterial(floorTexture: TextureConfig): THREE.MeshStandardMaterial {
    const material = textureManager.createTexturedMaterial(floorTexture);

    // Enhanced floor material properties
    material.roughness = 0.05;
    material.metalness = 0.02;
    material.envMapIntensity = 0.5;


    material.clearcoat = 0.8;
    material.clearcoatRoughness = 0.1;

    // Enhance reflectivity
    material.reflectivity = 0.9;

    return material;
  }

  updateWalls(roomWidth: number, roomHeight: number, wallTexture: TextureConfig): void {
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
  }

  private createEnhancedWallMaterial(wallTexture: TextureConfig): THREE.MeshStandardMaterial {
    const material = textureManager.createTexturedMaterial(wallTexture);

    // Enhanced wall material properties
    material.roughness = 0.9;
    material.metalness = 0.0;
    material.envMapIntensity = 0.3;

    return material;
  }

  updateGrid(roomWidth: number, roomHeight: number, showGrid: boolean): void {
    if (!this.scene) return;

    // Remove existing grid
    if (this.gridRef) {
      this.scene.remove(this.gridRef);
      this.gridRef = null;
    }

    // Create new grid if needed
    if (showGrid) {
      this.gridRef = createCustomGrid(roomWidth, roomHeight);
      this.scene.add(this.gridRef);
    }
  }

  async updateBathroomItems(items: BathroomItem[]): Promise<void> {
    if (!this.scene || this.isUpdatingItems) return;

    this.isUpdatingItems = true;

    try {
      console.log('=== UPDATING BATHROOM ITEMS ===');
      console.log('Items to render:', items.length);

      // Clear existing bathroom items
      this.bathroomItemsGroup.clear();

      // Create all models concurrently for better performance
      const modelPromises = items.map(async (item, index) => {
        console.log(`Creating model for item [${index}]:`, item);

        try {
          const model = await createModel(
            item.type,
            item.position,
            item.rotation || 0,
            item.scale || 1.0
          );

          if (model) {
            model.userData.isBathroomItem = true;
            model.userData.itemId = item.id;
            model.userData.type = item.type;

            // Enhance model materials
            this.enhanceModelMaterials(model);

            console.log(`  Created model with userData:`, model.userData);
            return model;
          }
        } catch (error) {
          console.error(`Failed to create model for item ${item.id}:`, error);
        }

        return null;
      });

      // Wait for all models to be created
      const models = await Promise.all(modelPromises);

      // Add all successfully created models to the group
      models.forEach(model => {
        if (model) {
          this.bathroomItemsGroup.add(model);
        }
      });

      console.log('=== BATHROOM ITEMS UPDATE COMPLETE ===');
      console.log(`Added ${models.filter(m => m !== null).length} models to scene`);

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
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  adjustOutlineForDistance(): void {
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

  startAnimationLoop(): void {
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
}
