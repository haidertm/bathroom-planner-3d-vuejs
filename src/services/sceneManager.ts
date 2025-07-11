import * as THREE from 'three';
import { createFloor, createWalls, createCustomGrid } from '../models/roomGeometry';
import textureManager from './textureManager';
import { SimpleWallCulling } from './simpleWallCulling';
import { createModel } from '../models/bathroomFixtures';
import type { BathroomItem } from '../utils/constraints';
import type { TextureConfig } from '../constants/textures';

interface SceneComponents {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export class SceneManager {
  public scene: THREE.Scene | null = null;
  public camera: THREE.PerspectiveCamera | null = null;
  public renderer: THREE.WebGLRenderer | null = null;

  // Animation loop management (your additions)
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
    this.camera.position.set(8, 6, 8);
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

    // Better color management and tone mapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;

    // Enable physically correct lights
    this.renderer.physicallyCorrectLights = true;

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

  private setupEnhancedLighting(): void {
    if (!this.scene) return;

    // Clear existing lights
    this.lights.forEach(light => this.scene!.remove(light));
    this.lights = [];

    // 1. Bright ambient light - creates that "well-lit room" base
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // 2. Main ceiling light - bright overhead illumination
    const mainCeilingLight = new THREE.PointLight(0xffffff, 1.2, 25);
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
    const ceilingLight1 = new THREE.PointLight(0xffffff, 0.8, 15);
    ceilingLight1.position.set(1.5, 2.8, 1.5);
    ceilingLight1.castShadow = true;
    ceilingLight1.shadow.mapSize.width = 1024;
    ceilingLight1.shadow.mapSize.height = 1024;
    ceilingLight1.shadow.camera.near = 0.1;
    ceilingLight1.shadow.camera.far = 15;

    this.scene.add(ceilingLight1);
    this.lights.push(ceilingLight1);

    const ceilingLight2 = new THREE.PointLight(0xffffff, 0.8, 15);
    ceilingLight2.position.set(-1.5, 2.8, -1.5);
    ceilingLight2.castShadow = true;
    ceilingLight2.shadow.mapSize.width = 1024;
    ceilingLight2.shadow.mapSize.height = 1024;
    ceilingLight2.shadow.camera.near = 0.1;
    ceilingLight2.shadow.camera.far = 15;

    this.scene.add(ceilingLight2);
    this.lights.push(ceilingLight2);

    // 4. Soft directional light from above - simulates natural light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
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

    // 5. Fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(-5, 8, -5);
    this.scene.add(fillLight);
    this.lights.push(fillLight);

    // Optional: Add light helpers for debugging (comment out in production)
    // const helper = new THREE.PointLightHelper(mainCeilingLight, 0.5);
    // this.scene.add(helper);
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
    material.roughness = 0.3;
    material.metalness = 0.05;
    material.envMapIntensity = 0.8;

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

              // Add subtle normal mapping if not present
              if (!material.normalMap) {
                // Could add a default normal map here
              }
            }
          });
        }

        // Ensure shadows are properly configured
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  startAnimationLoop(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.isAnimating = true;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Check if we should continue animating and if objects still exist
      if (!this.isAnimating || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      // Update wall culling based on camera position
      if (this.wallCullingManager) {
        this.wallCullingManager.updateWallVisibility();
      }

      this.renderer.render(this.scene, this.camera);
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

    if (this.renderer) {
      this.renderer.dispose();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
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
