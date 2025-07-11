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

  createTexturedMaterial(textureConfig: TextureConfig): THREE.MeshStandardMaterial {
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
      const texture = this.loadedTextures.get(cacheKey);
      if (texture) {
        material.map = texture;
        this.setupTextureProperties(texture, textureConfig);
      }
      return material;
    }

    // Load texture from file
    this.textureLoader.load(
      textureConfig.file,
      (texture: THREE.Texture) => {
        this.setupTextureProperties(texture, textureConfig);

        // Store loaded texture with scale info
        this.loadedTextures.set(cacheKey, texture);

        // Apply texture to material
        material.map = texture;
        material.needsUpdate = true;

        // Generate normal map from height data if not present
        this.generateNormalMap(texture, material);
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

  private setupTextureProperties(texture: THREE.Texture, config: TextureConfig): void {
    // Configure texture for better quality and performance
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16; // Maximum anisotropy for better quality

    // Use custom scale if provided
    const scaleX: number = config.scale ? config.scale[0] : 4;
    const scaleY: number = config.scale ? config.scale[1] : 4;
    texture.repeat.set(scaleX, scaleY);
  }

  private addColorVariations(material: THREE.MeshStandardMaterial, baseColor: number): void {
    // Add subtle roughness variation for more realistic solid colors
    material.roughness = 0.7 + Math.random() * 0.2;

    // Add very subtle metalness for some materials
    const color = new THREE.Color(baseColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);

    // Slightly more metallic for darker colors
    if (hsl.l < 0.3) {
      material.metalness = 0.1 + Math.random() * 0.1;
    }

    // Add environment map intensity variation
    material.envMapIntensity = 0.2 + Math.random() * 0.3;
  }

  private generateNormalMap(diffuseTexture: THREE.Texture, material: THREE.MeshStandardMaterial): void {
    // Simple normal map generation for enhanced surface detail
    // This is a basic implementation - in production you'd use proper normal map generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = 256;
    canvas.height = 256;

    // Create a simple normal map pattern
    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 256;
      const y = Math.floor((i / 4) / 256);

      // Simple noise-based normal map
      const noise = Math.random() * 0.1 + 0.45;

      data[i] = 128 + (x % 2 === 0 ? 10 : -10);     // R (X normal)
      data[i + 1] = 128 + (y % 2 === 0 ? 10 : -10); // G (Y normal)
      data[i + 2] = 255 * noise;                     // B (Z normal)
      data[i + 3] = 255;                             // A
    }

    ctx.putImageData(imageData, 0, 0);

    // Create normal map texture
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.copy(diffuseTexture.repeat);

    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.3, 0.3);
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
