import path from 'path';
import fs from 'fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Declare Node.js global for TypeScript
declare const global: any;

// Mock browser globals for Node.js environment
const globalContext = global as any;

// Create a minimal DOM-like environment
globalContext.self = globalContext;
globalContext.window = globalContext;
globalContext.document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext: () => null,
        width: 0,
        height: 0
      };
    }
    if (tag === 'img') {
      return {
        onload: null,
        onerror: null,
        src: '',
        crossOrigin: null
      };
    }
    return {};
  }
};

// Mock Image constructor for texture loading
globalContext.Image = function () {
  return {
    onload: null,
    onerror: null,
    src: '',
    crossOrigin: null,
    width: 0,
    height: 0
  };
};

// Mock URL.createObjectURL
globalContext.URL = {
  createObjectURL: () => 'mock-url',
  revokeObjectURL: () => {
  }
};

// Patch FileLoader to work in Node.js
THREE.FileLoader.prototype.load = function (url, onLoad, _onProgress, onError) {
  fs.readFile(url)
    .then((data) => {
      if (onLoad) {
        onLoad(data.buffer);
      }
    })
    .catch((error) => {
      if (onError) {
        onError(error);
      }
    });
};

// Override ImageLoader to handle images in Node.js - Complete implementation
class NodeImageLoader {
  public manager: THREE.LoadingManager;
  public crossOrigin: string = 'anonymous';
  public withCredentials: boolean = false;
  public path: string = '';
  public resourcePath: string = '';
  public requestHeader: Record<string, string> = {};

  constructor(manager?: THREE.LoadingManager) {
    this.manager = manager || THREE.DefaultLoadingManager;
  }

  load (
    url: string,
    onLoad?: (image: any) => void,
    _onProgress?: (event: ProgressEvent) => void,
    _onError?: (event: ErrorEvent) => void
  ) {
    // Create a simple mock image object
    const mockImage = {
      width: 256,
      height: 256,
      src: url,
      crossOrigin: null,
      complete: true,
      naturalWidth: 256,
      naturalHeight: 256
    };

    if (onLoad) {
      setTimeout(() => onLoad(mockImage), 0);
    }

    return mockImage;
  }

  loadAsync(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, undefined, reject);
    });
  }

  setPath(path: string) {
    this.path = path;
    return this;
  }

  setResourcePath(resourcePath: string) {
    this.resourcePath = resourcePath;
    return this;
  }

  setRequestHeader(requestHeader: Record<string, string>) {
    this.requestHeader = requestHeader;
    return this;
  }

  setCrossOrigin(crossOrigin: string) {
    this.crossOrigin = crossOrigin;
    return this;
  }

  setWithCredentials(value: boolean) {
    this.withCredentials = value;
    return this;
  }
}

// Replace the default ImageLoader
THREE.DefaultLoadingManager.setURLModifier((url: string) => url);

async function loadGLB (filePath: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();

  // Use custom image loader
  loader.manager.addHandler(/\.(jpg|jpeg|png|gif|bmp|tga)$/i, new NodeImageLoader());

  const arrayBuffer = await fs.readFile(filePath);
  const buffer = arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);

  try {
    const gltf = await loader.parseAsync(buffer, path.dirname(filePath));
    return gltf.scene;
  } catch (error) {
    console.warn(`⚠️ Texture loading failed for ${path.basename(filePath)}, trying geometry-only approach...`);

    // If texture loading fails, try to extract just the geometry
    const gltf = await loader.parseAsync(buffer, path.dirname(filePath));

    // Remove materials to avoid texture issues
    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      }
    });

    return gltf.scene;
  }
}

// Recursive scan of all subdirectories
async function getAllGLBPaths (dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const files = await Promise.all(
      entries.map((entry) => {
        const res = path.resolve(dirPath, entry.name);
        return entry.isDirectory() ? getAllGLBPaths(res) : res.endsWith('.glb') ? [res] : [];
      })
    );

    return files.flat();
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}:`, error);
    return [];
  }
}

async function getDimensions (dirPath: string) {
  console.log(`🔍 Scanning GLB files in: ${dirPath}`);

  const glbFiles = await getAllGLBPaths(dirPath);
  if (glbFiles.length === 0) {
    console.warn(`⚠️ No .glb files found in ${dirPath}`);
    return;
  }

  console.log(`📁 Found ${glbFiles.length} GLB files`);

  const results: Record<string, { width: number; height: number; depth: number; status: string }> = {};

  for (const filePath of glbFiles) {
    const fileName = path.relative(dirPath, filePath);
    console.log(`📐 Processing: ${fileName}...`);

    try {
      const scene = await loadGLB(filePath);
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Check if dimensions are valid
      const isValid = size.x > 0 && size.y > 0 && size.z > 0;

      results[fileName] = {
        width: Number(size.x.toFixed(3)),
        height: Number(size.y.toFixed(3)),
        depth: Number(size.z.toFixed(3)),
        status: isValid ? '✅ Success' : '⚠️ Invalid dimensions'
      };

      console.log(`  ✅ ${fileName}: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`);

    } catch (err) {
      console.error(`❌ Failed to parse ${fileName}:`, err instanceof Error ? err.message : err);
      results[fileName] = {
        width: 0,
        height: 0,
        depth: 0,
        status: '❌ Failed'
      };
    }
  }

  console.log('\n📐 GLB Dimensions Summary:');
  console.table(results);

  // Summary statistics
  const successful = Object.values(results).filter(r => r.status === '✅ Success').length;
  const failed = Object.values(results).filter(r => r.status === '❌ Failed').length;
  const invalid = Object.values(results).filter(r => r.status === '⚠️ Invalid dimensions').length;

  console.log(`\n📊 Summary: ${successful} successful, ${invalid} invalid dimensions, ${failed} failed`);
}

// CLI Handling
const inputDir: string = process.argv[2] || './public/models/';

console.log('🚀 Starting GLB dimension scanner...');
getDimensions(inputDir).catch(console.error);
