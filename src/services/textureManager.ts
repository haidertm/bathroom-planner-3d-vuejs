// src/services/textureManager.ts - Enhanced version
import * as THREE from "three";

// Type definitions
export interface TextureConfig {
  name: string;
  file: string;
  color: number;
  scale?: readonly [number, number];
}

class TextureManager {
  private textureLoader: THREE.TextureLoader;
  private loadedTextures: Map<string, THREE.Texture>;
  // private cubeTextureLoader: THREE.CubeTextureLoader;
  private environmentMap: THREE.CubeTexture | null = null;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    // this.cubeTextureLoader = new THREE.CubeTextureLoader();
    this.loadedTextures = new Map<string, THREE.Texture>();
    this.initializeEnvironmentMap();
  }

  private initializeEnvironmentMap(): void {
    // Create a simple environment map for better reflections
    // In a real app, you might load actual HDRI images
    const size = 512;
    const data = new Uint8Array(size * size * 3);

    for (let i = 0; i < data.length; i += 3) {
      data[i] = 240;     // R
      data[i + 1] = 240; // G
      data[i + 2] = 255; // B
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.mapping = THREE.EquirectangularReflectionMapping;
  }

  createTexturedMaterial(textureConfig: TextureConfig, roomDimensions?: { width: number, height: number }): THREE.MeshStandardMaterial {
    // Check if we should use file or color
    const hasValidFile: boolean = Boolean(textureConfig.file) &&
      textureConfig.file.trim() !== "";

    // Create material with enhanced properties
    const material = new THREE.MeshStandardMaterial({
      color: hasValidFile ? 0xffffff : textureConfig.color,
      roughness: 0.8,
      metalness: 0.1,
      envMapIntensity: 0.3,
      transparent: false,
      opacity: 1.0,
      side: THREE.FrontSide,
      shadowSide: THREE.DoubleSide
    });

    // Add environment map if available
    if (this.environmentMap) {
      material.envMap = this.environmentMap;
    }

    // If no valid file, return enhanced material with just color
    if (!hasValidFile) {
      // Add subtle variations to solid colors
      this.addColorVariations(material, textureConfig.color);
      return material;
    }

    // Check if texture is already loaded
    const cacheKey: string = `${textureConfig.file}_${textureConfig.scale?.join('x') || 'default'}`;
    if (this.loadedTextures.has(cacheKey)) {
      const cachedTexture = this.loadedTextures.get(cacheKey);
      if (cachedTexture) {
        // CRITICAL FIX: Clone the texture to avoid modifying the shared cached instance
        const texture = cachedTexture.clone();
        texture.needsUpdate = true;

        // Copy essential properties from cached texture
        texture.wrapS = cachedTexture.wrapS;
        texture.wrapT = cachedTexture.wrapT;
        texture.minFilter = cachedTexture.minFilter;
        texture.magFilter = cachedTexture.magFilter;
        texture.anisotropy = cachedTexture.anisotropy;

        // Apply room-specific scaling to the cloned texture
        this.setupTextureProperties(texture, textureConfig, roomDimensions);

        material.map = texture;
        material.needsUpdate = true;
      }
      return material;
    }

    // Load texture from file
    this.textureLoader.load(
      textureConfig.file,
      (texture: THREE.Texture) => {
        this.setupTextureProperties(texture, textureConfig, roomDimensions);

        // Store loaded texture with scale info
        this.loadedTextures.set(cacheKey, texture);

        // Apply texture to material
        material.map = texture;
        material.needsUpdate = true;

          // DISABLED: generateNormalMap uses Math.random() which causes different patterns on each refresh
          // this.generateNormalMap(texture, material);
      },
      (progress: ProgressEvent<EventTarget>) => {
        if (progress.lengthComputable) {
          console.log(`Loading texture: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        }
      },
      (error: unknown) => {
        console.warn(`Failed to load texture: ${textureConfig.file}, falling back to color`, error);
        // Enhanced fallback with color variations
        this.addColorVariations(material, textureConfig.color);
        material.needsUpdate = true;
      }
    );

    return material;
  }

  private setupTextureProperties(texture: THREE.Texture, config: TextureConfig, roomDimensions?: { width: number, height: number }): void {
    // Configure texture for better quality and performance
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;

    // CRITICAL: Force texture to regenerate mipmaps for sharp quality
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16; // Maximum anisotropy for better quality

    // FIX: Calculate texture repeat based on room dimensions for proper scaling
    if (roomDimensions) {
      // Get the base scale from texture config
      const baseScaleX = config.scale ? config.scale[0] : 4;
      const baseScaleY = config.scale ? config.scale[1] : 4;

      // Scale factor: room size in meters (roomWidth is in meters already)
      // We want textures to maintain consistent visual size as room changes
      const repeatX = (roomDimensions.width / 30000) * (baseScaleX / 4);
      const repeatY = (roomDimensions.height / 30000) * (baseScaleY / 4);

      texture.repeat.set(repeatX, repeatY);
    } else {
      // Use default scale if no room dimensions provided
      const scaleX: number = config.scale ? config.scale[0] : 4;
      const scaleY: number = config.scale ? config.scale[1] : 4;
      texture.repeat.set(scaleX, scaleY);
    }
  }

  private addColorVariations(material: THREE.MeshStandardMaterial, baseColor: number): void {
    // FIXED: Use consistent values instead of Math.random() to avoid different appearance on refresh
    material.roughness = 0.8;

    // Add very subtle metalness for some materials
    const color = new THREE.Color(baseColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);

    // Slightly more metallic for darker colors
    if (hsl.l < 0.3) {
      material.metalness = 0.15;
    }

    // Use consistent environment map intensity
    material.envMapIntensity = 0.3;
  }

  // Create specialized materials for different surface types
  createFloorMaterial(textureConfig: TextureConfig): THREE.MeshStandardMaterial {
    const material = this.createTexturedMaterial(textureConfig);

    // Floor-specific properties
    material.roughness = 0.3;
    material.metalness = 0.05;
    material.envMapIntensity = 0.8;
    material.emissive = new THREE.Color(0x111111);

    return material;
  }

  createWallMaterial(textureConfig: TextureConfig): THREE.MeshStandardMaterial {
    const material = this.createTexturedMaterial(textureConfig);

    // Wall-specific properties
    material.roughness = 0.9;
    material.metalness = 0.0;
    material.envMapIntensity = 0.2;

    return material;
  }

  createCeramicMaterial(textureConfig: TextureConfig): THREE.MeshStandardMaterial {
    const material = this.createTexturedMaterial(textureConfig);

    // Ceramic-specific properties (for toilets, sinks, etc.)
    material.roughness = 0.1;
    material.metalness = 0.0;
    material.envMapIntensity = 0.8;

    return material;
  }

  createMetalMaterial(textureConfig: TextureConfig): THREE.MeshStandardMaterial {
    const material = this.createTexturedMaterial(textureConfig);

    // Metal-specific properties (for radiators, fixtures, etc.)
    material.roughness = 0.3;
    material.metalness = 0.8;
    material.envMapIntensity = 1.0;

    return material;
  }

  clearCache(): void {
    this.loadedTextures.clear();
  }

  getCacheSize(): number {
    return this.loadedTextures.size;
  }

  getCachedTextures(): string[] {
    return Array.from(this.loadedTextures.keys());
  }

  removeCachedTexture(cacheKey: string): boolean {
    return this.loadedTextures.delete(cacheKey);
  }

  isTextureCached(textureConfig: TextureConfig): boolean {
    const cacheKey: string = `${textureConfig.file}_${textureConfig.scale?.join('x') || 'default'}`;
    return this.loadedTextures.has(cacheKey);
  }

  // Preload commonly used textures
  async preloadTextures(textureConfigs: TextureConfig[]): Promise<void> {
    const promises = textureConfigs.map(config => {
      return new Promise<void>((resolve) => {
        if (!config.file || config.file.trim() === '') {
          resolve();
          return;
        }

        this.textureLoader.load(
          config.file,
          (texture) => {
            this.setupTextureProperties(texture, config);
            const cacheKey = `${config.file}_${config.scale?.join('x') || 'default'}`;
            this.loadedTextures.set(cacheKey, texture);
            resolve();
          },
          undefined,
          (error) => {
            console.warn(`Failed to preload texture: ${config.file}`, error);
            resolve(); // Don't fail the entire preload process
          }
        );
      });
    });

    await Promise.all(promises);
    console.log(`Preloaded ${promises.length} textures`);
  }

  // Method to update material quality based on performance
  setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    const anisotropy = level === 'high' ? 16 : level === 'medium' ? 8 : 4;

    this.loadedTextures.forEach(texture => {
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    });
  }
}

// Export singleton instance
const textureManager = new TextureManager();
export default textureManager;
