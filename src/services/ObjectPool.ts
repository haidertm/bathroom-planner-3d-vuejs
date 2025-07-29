import * as THREE from 'three'

export class ObjectPool {
  private pools = new Map<string, THREE.Object3D[]>();

  getObject(type: string): THREE.Object3D | null {
    const pool = this.pools.get(type) || [];
    return pool.pop() || null;
  }

  returnObject(type: string, object: THREE.Object3D): void {
    if (!this.pools.has(type)) {
      this.pools.set(type, []);
    }

    // Reset object state
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.visible = false;

    this.pools.get(type)!.push(object);
  }

  clear(): void {
    this.pools.clear();
  }
}
