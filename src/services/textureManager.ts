// src/services/textureManager.ts - Enhanced version
import * as THREE from "three";

// Type definitions
export interface TextureConfig {
  name: string;
  file: string;
  color: number;
  scale?: readonly [number, number];
  normalMap?: string; // Path to normal map texture for grout/depth effects
  roughness?: number; // Material roughness override (0=glossy, 1=matte)
  metalness?: number; // Material metalness override (0=non-metal, 1=metal)
  procedural?: 'tile'; // Use procedural generation instead of file
  groutColor?: number; // Grout color for procedural tiles
  glossiness?: number; // Glossiness for procedural tiles (0-1)
}

// Procedural tile configuration interface
export interface ProceduralTileConfig {
  tileColor: number;        // Base tile color (hex)
  groutColor: number;       // Grout color (hex)
  tileWidth: number;        // Tile width in pixels (within texture)
  tileHeight: number;       // Tile height in pixels
  groutWidth: number;       // Grout line width in pixels
  bevelSize: number;        // Tile edge bevel size
  colorVariation: number;   // Random color variation (0-1)
  glossiness: number;       // 0 = matte, 1 = very glossy
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
    // Create a subtle gradient environment map
    const size = 128;
    const data = new Uint8Array(size * size * 4);  // RGBA

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        const ny = y / size;

        // Gentle top-to-bottom gradient
        const brightness = 0.75 - ny * 0.15;

        // Neutral tones
        data[i] = Math.floor(220 * brightness);       // R
        data[i + 1] = Math.floor(220 * brightness);   // G
        data[i + 2] = Math.floor(225 * brightness);   // B
        data[i + 3] = 255;                             // A
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.mapping = THREE.EquirectangularReflectionMapping;

    this.environmentMap = texture as unknown as THREE.CubeTexture;
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

    // Apply roughness/metalness from config if provided
    if (textureConfig.roughness !== undefined) {
      material.roughness = textureConfig.roughness;
    }
    if (textureConfig.metalness !== undefined) {
      material.metalness = textureConfig.metalness;
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

        // Load normal map if specified for grout/depth effects
        if (textureConfig.normalMap) {
          this.textureLoader.load(
            textureConfig.normalMap,
            (normalTexture: THREE.Texture) => {
              normalTexture.wrapS = THREE.RepeatWrapping;
              normalTexture.wrapT = THREE.RepeatWrapping;
              normalTexture.repeat.copy(texture.repeat);
              material.normalMap = normalTexture;
              material.normalScale.set(0.5, 0.5); // Adjust for grout depth
              material.needsUpdate = true;
            },
            undefined,
            (error: unknown) => {
              console.warn(`Failed to load normal map: ${textureConfig.normalMap}`, error);
            }
          );
        }
      },
      undefined,
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
      const repeatX = (roomDimensions.width / 100) * (baseScaleX / 4);
      const repeatY = (roomDimensions.height / 100) * (baseScaleY / 4);

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
    // Check if this is a procedural tile texture
    if (textureConfig.procedural === 'tile') {
      return this.createProceduralTileMaterial({
        tileColor: textureConfig.color,
        groutColor: textureConfig.groutColor ?? 0xc0c0c0,
        glossiness: textureConfig.glossiness ?? 0.7
      });
    }

    const material = this.createTexturedMaterial(textureConfig);

    // Wall-specific properties - use config values if provided, otherwise defaults
    material.roughness = textureConfig.roughness !== undefined ? textureConfig.roughness : 0.9;
    material.metalness = textureConfig.metalness !== undefined ? textureConfig.metalness : 0.05;

    // Subtle reflection based on glossiness
    const roughness = textureConfig.roughness ?? 0.9;
    if (roughness < 0.1) {
      material.envMapIntensity = 0.25;
    } else if (roughness < 0.3) {
      material.envMapIntensity = 0.15;
    } else {
      material.envMapIntensity = 0.08;
    }

    // Add environment map for reflections
    if (this.environmentMap) {
      material.envMap = this.environmentMap;
    }

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
  }

  // Method to update material quality based on performance
  setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    const anisotropy = level === 'high' ? 16 : level === 'medium' ? 8 : 4;

    this.loadedTextures.forEach(texture => {
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    });
  }

  // Create procedural tile material without needing an image
  createProceduralTileMaterial(config?: Partial<ProceduralTileConfig>): THREE.MeshStandardMaterial {
    const defaults: ProceduralTileConfig = {
      tileColor: 0xf5f5f5,      // Off-white
      groutColor: 0xe0e0e0,     // Very light gray grout (lighter to reduce dark lines)
      tileWidth: 100,           // Realistic tile size
      tileHeight: 100,
      groutWidth: 5,            // Slightly thinner grout lines
      bevelSize: 1,             // Minimal bevel
      colorVariation: 0.0,      // Clean uniform tiles
      glossiness: 0.75
    };

    const settings = { ...defaults, ...config };

    // Generate textures
    const { diffuseTexture, normalTexture, roughnessTexture } = this.generateTileTextures(settings);

    // Create material with ceramic properties
    const material = new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      normalMap: normalTexture,
      roughnessMap: roughnessTexture,
      normalScale: new THREE.Vector2(0.08, 0.08),  // Reduced for less dark grout effect
      roughness: 0.05,  // Very low roughness = very glossy/shiny
      metalness: 0.1,   // Slight metalness for reflections
      envMapIntensity: 0.8,  // Strong environment reflections for shiny look
      side: THREE.FrontSide
    });

    // Add environment map for reflections
    if (this.environmentMap) {
      material.envMap = this.environmentMap;
    }

    return material;
  }

  // Generate tile textures (diffuse, normal, roughness)
  private generateTileTextures(config: ProceduralTileConfig): {
    diffuseTexture: THREE.CanvasTexture;
    normalTexture: THREE.CanvasTexture;
    roughnessTexture: THREE.CanvasTexture;
  } {
    const textureSize = 512;

    // Calculate tile layout - 4 tiles per texture for good detail
    const tilesPerRow = 4;
    const tileWithGrout = textureSize / tilesPerRow;
    const actualTileSize = tileWithGrout - config.groutWidth;

    // Create canvases
    const diffuseCanvas = document.createElement('canvas');
    const normalCanvas = document.createElement('canvas');
    const roughnessCanvas = document.createElement('canvas');

    diffuseCanvas.width = normalCanvas.width = roughnessCanvas.width = textureSize;
    diffuseCanvas.height = normalCanvas.height = roughnessCanvas.height = textureSize;

    const diffuseCtx = diffuseCanvas.getContext('2d')!;
    const normalCtx = normalCanvas.getContext('2d')!;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;

    // Fill entire canvas with grout color first
    const groutColor = new THREE.Color(config.groutColor);
    diffuseCtx.fillStyle = `rgb(${Math.floor(groutColor.r * 255)}, ${Math.floor(groutColor.g * 255)}, ${Math.floor(groutColor.b * 255)})`;
    diffuseCtx.fillRect(0, 0, textureSize, textureSize);

    // Normal map base - grout is very slightly recessed (subtle effect)
    normalCtx.fillStyle = 'rgb(128, 120, 255)';  // Closer to neutral to reduce dark appearance
    normalCtx.fillRect(0, 0, textureSize, textureSize);

    // Roughness map base (grout is slightly rougher/matte)
    roughnessCtx.fillStyle = 'rgb(140, 140, 140)';  // Less contrast
    roughnessCtx.fillRect(0, 0, textureSize, textureSize);

    const baseColor = new THREE.Color(config.tileColor);

    // Draw tiles in a clean grid
    for (let ty = 0; ty < tilesPerRow; ty++) {
      for (let tx = 0; tx < tilesPerRow; tx++) {
        // Calculate tile position
        const x = tx * tileWithGrout + config.groutWidth / 2;
        const y = ty * tileWithGrout + config.groutWidth / 2;

        // Draw tile on diffuse map - clean solid fill
        this.drawTile(diffuseCtx, x, y, actualTileSize, actualTileSize, baseColor, config.bevelSize);

        // Draw tile normal (raised surface)
        this.drawTileNormal(normalCtx, x, y, actualTileSize, actualTileSize, config.bevelSize);

        // Draw tile roughness (tiles are smooth/glossy)
        const tileRoughness = Math.floor((1 - config.glossiness) * 100 + 20);
        roughnessCtx.fillStyle = `rgb(${tileRoughness}, ${tileRoughness}, ${tileRoughness})`;
        roughnessCtx.fillRect(x, y, actualTileSize, actualTileSize);
      }
    }

    // Create Three.js textures
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);

    // Configure textures for tiling
    [diffuseTexture, normalTexture, roughnessTexture].forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);  // 3x3 repeat for good tile density
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;
    });

    diffuseTexture.colorSpace = THREE.SRGBColorSpace;

    return { diffuseTexture, normalTexture, roughnessTexture };
  }

  // Draw a single tile - clean ceramic look
  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    color: THREE.Color,
    bevelSize: number
  ): void {
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    // Main tile body - solid clean fill
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, width, height);

    // Subtle inner highlight for 3D effect (top-left inner edge)
    const highlightR = Math.min(255, r + 6);
    const highlightG = Math.min(255, g + 6);
    const highlightB = Math.min(255, b + 6);
    ctx.fillStyle = `rgb(${highlightR}, ${highlightG}, ${highlightB})`;
    ctx.fillRect(x + bevelSize, y + bevelSize, width - bevelSize * 2, bevelSize);
    ctx.fillRect(x + bevelSize, y + bevelSize, bevelSize, height - bevelSize * 2);

    // Subtle inner shadow (bottom-right inner edge)
    const shadowR = Math.max(0, r - 8);
    const shadowG = Math.max(0, g - 8);
    const shadowB = Math.max(0, b - 8);
    ctx.fillStyle = `rgb(${shadowR}, ${shadowG}, ${shadowB})`;
    ctx.fillRect(x + bevelSize, y + height - bevelSize * 2, width - bevelSize * 2, bevelSize);
    ctx.fillRect(x + width - bevelSize * 2, y + bevelSize, bevelSize, height - bevelSize * 2);
  }

  // Draw normal map for a tile (raised surface effect)
  private drawTileNormal(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    bevelSize: number
  ): void {
    // Flat tile surface (neutral normal - pointing straight out)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(x, y, width, height);

    // Beveled edges for depth - more subtle values
    // Top edge (normal tilted up)
    ctx.fillStyle = 'rgb(128, 145, 255)';
    ctx.fillRect(x, y, width, bevelSize);

    // Bottom edge (normal tilted down)
    ctx.fillStyle = 'rgb(128, 111, 255)';
    ctx.fillRect(x, y + height - bevelSize, width, bevelSize);

    // Left edge (normal tilted left)
    ctx.fillStyle = 'rgb(145, 128, 255)';
    ctx.fillRect(x, y, bevelSize, height);

    // Right edge (normal tilted right)
    ctx.fillStyle = 'rgb(111, 128, 255)';
    ctx.fillRect(x + width - bevelSize, y, bevelSize, height);
  }
}

// Export singleton instance
const textureManager = new TextureManager();
export default textureManager;
