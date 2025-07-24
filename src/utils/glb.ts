import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GLBDimensions {
  width: number;
  height: number;
  depth: number;
  box: THREE.Box3;
  center: THREE.Vector3;
  model: THREE.Object3D;
}

export function getGLBDimensions(path: string): Promise<GLBDimensions> {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const center = new THREE.Vector3();
        box.getCenter(center);

        resolve({
          width: size.x,
          height: size.y,
          depth: size.z,
          box,
          center,
          model,
        });
      },
      undefined,
      (error) => {
        reject(error);
      },
    );
  });
}
