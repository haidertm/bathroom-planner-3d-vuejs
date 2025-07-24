import path from 'path';
import fs from 'fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Patch: allow FileLoader to work in Node.js
THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
  fs.readFile(url)
    .then((data) => onLoad(data.buffer))
    .catch(onError);
};

async function loadGLB(filePath: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const arrayBuffer = await fs.readFile(filePath);
  const buffer = arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);
  const gltf = await loader.parseAsync(buffer, path.dirname(filePath));
  return gltf.scene;
}

// Recursive scan of all subdirectories
async function getAllGLBPaths(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const res = path.resolve(dirPath, entry.name);
      return entry.isDirectory() ? getAllGLBPaths(res) : res.endsWith('.glb') ? [res] : [];
    }),
  );

  return files.flat();
}

async function getDimensions(dirPath: string) {
  const glbFiles = await getAllGLBPaths(dirPath);
  if (glbFiles.length === 0) {
    console.warn(`⚠️ No .glb files found in ${dirPath}`);
    return;
  }

  const results: Record<string, { width: number; height: number; depth: number }> = {};

  for (const filePath of glbFiles) {
    const fileName = path.relative(dirPath, filePath);
    try {
      const scene = await loadGLB(filePath);
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);

      results[fileName] = {
        width: Number(size.x.toFixed(3)),
        height: Number(size.y.toFixed(3)),
        depth: Number(size.z.toFixed(3)),
      };
    } catch (err) {
      console.error(`❌ Failed to parse ${fileName}:`, err);
    }
  }

  console.log('\n📐 GLB Dimensions:');
  console.table(results);
}

// CLI Handling
const inputDir = process.argv[2] ?? './public/models/';

getDimensions(inputDir);
