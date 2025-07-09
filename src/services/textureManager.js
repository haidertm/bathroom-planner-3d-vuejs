import * as THREE from "three";

class TextureManager {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.loadedTextures = new Map();
  }

  createTexturedMaterial(textureConfig) {
    // Check if we should use file or color
    const hasValidFile = textureConfig.file &&
      textureConfig.file.trim() !== "" &&
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
    const cacheKey = `${textureConfig.file}_${textureConfig.scale?.join('x') || 'default'}`;
    if (this.loadedTextures.has(cacheKey)) {
      const texture = this.loadedTextures.get(cacheKey);
      material.map = texture;
      return material;
    }

    // Load texture from file
    this.textureLoader.load(
      textureConfig.file,
      (texture) => {
        // Configure texture for better color representation
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.encoding = THREE.sRGBEncoding;
        texture.flipY = false;

        // Use custom scale if provided, otherwise use defaults
        const scaleX = textureConfig.scale ? textureConfig.scale[0] : 4;
        const scaleY = textureConfig.scale ? textureConfig.scale[1] : 4;
        texture.repeat.set(scaleX, scaleY);

        // Store loaded texture with scale info
        this.loadedTextures.set(cacheKey, texture);

        // Apply texture to material
        material.map = texture;
        material.needsUpdate = true;
      },
      (progress) => {
        console.log(`Loading texture: ${(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.warn(`Failed to load texture: ${textureConfig.file}, falling back to color`, error);
        // Fallback to color-based material
        material.color.setHex(textureConfig.color);
        material.needsUpdate = true;
      }
    );

    return material;
  }

  clearCache() {
    this.loadedTextures.clear();
  }
}

export default new TextureManager();
