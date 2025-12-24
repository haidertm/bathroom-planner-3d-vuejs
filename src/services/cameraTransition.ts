// src/services/cameraTransition.ts

import * as THREE from 'three';
import { ORTHOGRAPHIC_SETTINGS } from '../constants/camera';

/**
 * Easing functions for smooth camera animations
 */
export const Easing = {
  // Smooth ease-in-out (good for camera movements)
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // Ease-out for landing feel
  easeOutCubic: (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  },

  // Ease-in for takeoff feel
  easeInCubic: (t: number): number => {
    return t * t * t;
  },

  // Smooth ease-in-out quadratic (gentler)
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  // Very smooth ease-out (extra gentle landing - good for 3D->2D)
  easeOutQuart: (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  },

  // Smooth ease-out quintic (even gentler)
  easeOutQuint: (t: number): number => {
    return 1 - Math.pow(1 - t, 5);
  },
};

interface TransitionConfig {
  duration: number;  // Duration in milliseconds
  easing: (t: number) => number;
  onUpdate?: () => void;
  onComplete?: () => void;
}

interface CameraState {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  up: THREE.Vector3;
}

/**
 * CameraTransition - Handles smooth animated transitions between camera positions
 * Creates immersive "same room transforming" effect between 3D and 2D views
 */
export class CameraTransition {
  private isTransitioning: boolean = false;
  private animationId: number | null = null;

  // Default transition duration (ms)
  public static readonly DEFAULT_DURATION = 800;

  // Height for the top-down position (single source of truth from camera constants)
  public static readonly TOP_DOWN_HEIGHT = ORTHOGRAPHIC_SETTINGS.HEIGHT;

  /**
   * Check if a transition is currently in progress
   */
  public isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Cancel any ongoing transition
   */
  public cancelTransition(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isTransitioning = false;
  }

  /**
   * Animate camera from current position to a top-down view (for 3D → 2D transition)
   * The camera rises up and rotates to look straight down at the room center
   */
  public animateToTopDown(
    camera: THREE.PerspectiveCamera,
    roomCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    const {
      duration = CameraTransition.DEFAULT_DURATION,
      easing = Easing.easeInOutCubic,
      onUpdate,
      onComplete
    } = config;

    return new Promise((resolve) => {
      if (this.isTransitioning) {
        this.cancelTransition();
      }

      this.isTransitioning = true;

      // Store starting state
      const startPosition = camera.position.clone();
      const startUp = camera.up.clone();

      // Calculate where the camera is currently looking
      const startLookAt = new THREE.Vector3();
      camera.getWorldDirection(startLookAt);
      startLookAt.multiplyScalar(100).add(camera.position);

      // Target state: directly above room center, looking straight down
      // Go higher than the orthographic camera to create a "pulling away" effect
      const endPosition = new THREE.Vector3(
        roomCenter.x,
        CameraTransition.TOP_DOWN_HEIGHT + 300, // Go higher for smooth transition
        roomCenter.z
      );
      const endLookAt = roomCenter.clone();
      const endUp = new THREE.Vector3(0, 0, -1); // North at top of screen

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const progress = easing(rawProgress);

        // Interpolate position
        camera.position.lerpVectors(startPosition, endPosition, progress);

        // Interpolate look-at target
        const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, endLookAt, progress);
        camera.lookAt(currentLookAt);

        // Interpolate up vector for smooth rotation
        camera.up.lerpVectors(startUp, endUp, progress);

        // Callback for rendering
        onUpdate?.();

        if (rawProgress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          // Ensure final state is exact
          camera.position.copy(endPosition);
          camera.lookAt(endLookAt);
          camera.up.copy(endUp);

          this.isTransitioning = false;
          this.animationId = null;

          onComplete?.();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Animate camera from top-down view to a 3D perspective position (for 2D → 3D transition)
   * The camera descends and rotates from looking straight down to the target angle
   */
  public animateFromTopDown(
    camera: THREE.PerspectiveCamera,
    targetState: CameraState,
    roomCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    const {
      duration = CameraTransition.DEFAULT_DURATION,
      easing = Easing.easeInOutCubic,
      onUpdate,
      onComplete
    } = config;

    return new Promise((resolve) => {
      if (this.isTransitioning) {
        this.cancelTransition();
      }

      this.isTransitioning = true;

      // Start from high top-down position (matching where animateToTopDown ended)
      const startPosition = new THREE.Vector3(
        roomCenter.x,
        CameraTransition.TOP_DOWN_HEIGHT + 300,
        roomCenter.z
      );
      const startLookAt = roomCenter.clone();
      const startUp = new THREE.Vector3(0, 0, -1);

      // Set camera to starting position
      camera.position.copy(startPosition);
      camera.up.copy(startUp);
      camera.lookAt(startLookAt);

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const progress = easing(rawProgress);

        // Interpolate position
        camera.position.lerpVectors(startPosition, targetState.position, progress);

        // Interpolate look-at target
        const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetState.lookAt, progress);
        camera.lookAt(currentLookAt);

        // Interpolate up vector
        camera.up.lerpVectors(startUp, targetState.up, progress);

        // Callback for rendering
        onUpdate?.();

        if (rawProgress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          // Ensure final state is exact
          camera.position.copy(targetState.position);
          camera.lookAt(targetState.lookAt);
          camera.up.copy(targetState.up);

          this.isTransitioning = false;
          this.animationId = null;

          onComplete?.();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Generic camera animation between two states
   */
  public animateBetweenStates(
    camera: THREE.PerspectiveCamera,
    fromState: CameraState,
    toState: CameraState,
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    const {
      duration = CameraTransition.DEFAULT_DURATION,
      easing = Easing.easeInOutCubic,
      onUpdate,
      onComplete
    } = config;

    return new Promise((resolve) => {
      if (this.isTransitioning) {
        this.cancelTransition();
      }

      this.isTransitioning = true;

      // Set starting state
      camera.position.copy(fromState.position);
      camera.up.copy(fromState.up);
      camera.lookAt(fromState.lookAt);

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const progress = easing(rawProgress);

        // Interpolate all properties
        camera.position.lerpVectors(fromState.position, toState.position, progress);

        const currentLookAt = new THREE.Vector3().lerpVectors(fromState.lookAt, toState.lookAt, progress);
        camera.lookAt(currentLookAt);

        camera.up.lerpVectors(fromState.up, toState.up, progress);

        onUpdate?.();

        if (rawProgress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          camera.position.copy(toState.position);
          camera.lookAt(toState.lookAt);
          camera.up.copy(toState.up);

          this.isTransitioning = false;
          this.animationId = null;

          onComplete?.();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.cancelTransition();
  }
}

// Singleton instance for easy access
let instance: CameraTransition | null = null;

export function getCameraTransition(): CameraTransition {
  if (!instance) {
    instance = new CameraTransition();
  }
  return instance;
}