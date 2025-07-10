// src/services/textureManager.ts
import * as THREE from 'three';
import { TextureConfig } from '../constants/textures';

class TextureManager {
  private textureLoader: THREE.TextureLoader;
  private loadedTextures: Map<string, THREE.Texture>;

  constructor () {
    this.textureLoader = new THREE.TextureLoader();
    this.loadedTextures = new Map<string, THREE.Texture>();
  }

  createTexturedMaterial (textureConfig: TextureConfig): THREE.MeshStandardMaterial {
    // Check if we should use file or color
    const hasValidFile: boolean = textureConfig.file.trim() !== '' &&
      textureConfig.file !== null &&
      textureConfig.file !== undefined;

    // Create material with appropriate base
    const material = new THREE.MeshStandardMaterial({
      color: hasValidFile ? 0xffffff : textureConfig.color, // Use white for textures, actual color for solid colors
      roughness: 0.8,
      metalness: 0.0
    });

    // If no valid file, return material with just color
    if (!hasValidFile) {
      return material;
    }

    // Check if texture is already loaded
    const cacheKey: string = `${textureConfig.file}_${textureConfig.scale?.join('x') || 'default'}`;
    if (this.loadedTextures.has(cacheKey)) {
      const texture = this.loadedTextures.get(cacheKey);
      if (texture) {
        material.map = texture;
      }
      return material;
    }

    // Load texture from file
    this.textureLoader.load(
      textureConfig.file,
      (texture: THREE.Texture) => {
        // Configure texture for better color representation
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace; // Updated from deprecated encoding
        texture.flipY = false;

        // Use custom scale if provided, otherwise use defaults
        const scaleX: number = textureConfig.scale ? textureConfig.scale[0] : 4;
        const scaleY: number = textureConfig.scale ? textureConfig.scale[1] : 4;
        texture.repeat.set(scaleX, scaleY);

        // Store loaded texture with scale info
        this.loadedTextures.set(cacheKey, texture);

        // Apply texture to material
        material.map = texture;
        material.needsUpdate = true;
      },
      (progress: ProgressEvent<EventTarget>) => {
        if (progress.lengthComputable) {
          console.log(`Loading texture: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        }
      },
      (error: unknown) => {
        console.warn(`Failed to load texture: ${textureConfig.file}, falling back to color`, error);
        // Fallback to color-based material
        material.color.setHex(textureConfig.color);
        material.needsUpdate = true;
      }
    );

    return material;
  }

  clearCache (): void {
    this.loadedTextures.clear();
  }

  // Additional utility methods for better functionality
  getCacheSize (): number {
    return this.loadedTextures.size;
  }

  getCachedTextures (): string[] {
    return Array.from(this.loadedTextures.keys());
  }

  removeCachedTexture (cacheKey: string): boolean {
    return this.loadedTextures.delete(cacheKey);
  }

  // Check if a texture is already cached
  isTextureCached (textureConfig: TextureConfig): boolean {
    const cacheKey: string = `${textureConfig.file}_${textureConfig.scale?.join('x') || 'default'}`;
    return this.loadedTextures.has(cacheKey);
  }
}

// Export singleton instance
const textureManager = new TextureManager();
export default textureManager;
