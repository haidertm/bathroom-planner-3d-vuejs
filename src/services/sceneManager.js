import * as THREE from "three";
import { createFloor, createWalls, createCustomGrid } from '../models/roomGeometry.js';
import textureManager from './textureManager.js';
import { SimpleWallCulling } from './simpleWallCulling.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.floorRef = null;
    this.wallRefs = [];
    this.gridRef = null;
    this.wallCullingManager = new SimpleWallCulling();
  }

  initializeScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(7, 2, 7);
    this.camera.lookAt(0, 0, 0); // Make camera look at center of scene

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Add lighting
    this.setupLighting();

    return { scene: this.scene, camera: this.camera, renderer: this.renderer };
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);

    // Secondary directional light
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 10, -5);
    this.scene.add(directionalLight2);

    // Front light
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.3);
    frontLight.position.set(0, 5, 10);
    this.scene.add(frontLight);
  }

  updateFloor(roomWidth, roomHeight, floorTexture) {
    if (this.floorRef) {
      this.scene.remove(this.floorRef);
    }

    const floorMaterial = textureManager.createTexturedMaterial(floorTexture);
    this.floorRef = createFloor(roomWidth, roomHeight, floorMaterial);
    this.scene.add(this.floorRef);
  }

  updateWalls(roomWidth, roomHeight, wallTexture) {
    // Remove existing walls
    this.wallRefs.forEach(wall => {
      if (wall.parent) wall.parent.remove(wall);
    });
    this.wallRefs = [];

    // Create new walls
    const wallMaterial = textureManager.createTexturedMaterial(wallTexture);
    this.wallRefs = createWalls(roomWidth, roomHeight, wallMaterial);
    this.wallRefs.forEach(wall => this.scene.add(wall));

    // Update wall culling manager with new walls and room size
    this.wallCullingManager.updateRoomSize(roomWidth, roomHeight);
    this.wallCullingManager.initialize(this.wallRefs, this.camera);
  }

  updateGrid(roomWidth, roomHeight, showGrid) {
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

  updateBathroomItems(items, createModel) {

    console.log('=== UPDATING BATHROOM ITEMS ===');
    console.log('Items to render:', items.length);

    // Remove existing bathroom items
    const objectsToRemove = [];

    this.scene.traverse((child) => {
      if (child.userData.isBathroomItem) {
        objectsToRemove.push(child);
      }
    });
    console.log('Objects to remove from scene:', objectsToRemove.length);

    objectsToRemove.forEach((obj, index) => {
      console.log(`  Removing [${index}] ID: ${obj.userData.itemId}, Type: ${obj.userData.type}`);
      this.scene.remove(obj);
    });

    // Add new items
    items.forEach((item, index) => {
      console.log(`Creating model for item [${index}]:`, item);

      const model = createModel(item.type, item.position, item.rotation || 0, item.scale || 1.0);
      if (model) {
        model.userData.isBathroomItem = true;
        model.userData.itemId = item.id;

        console.log(`  Created model with userData:`, model.userData);

        this.scene.add(model);
      }
    });

    console.log('=== BATHROOM ITEMS UPDATE COMPLETE ===');
  }

  startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      // Update wall culling based on camera position
      this.wallCullingManager.updateWallVisibility();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  // Wall culling controls
  setWallCullingEnabled(enabled) {
    this.wallCullingManager.setEnabled(enabled);
  }

  isWallCullingEnabled() {
    return this.wallCullingManager.enabled;
  }

  dispose() {
    if (this.wallCullingManager) {
      this.wallCullingManager.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
