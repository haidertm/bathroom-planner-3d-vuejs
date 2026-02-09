/**
 * CameraHandler - Handles camera orbit, zoom, pan, and view mode operations.
 * Extracted from EventHandlers.ts for better modularity.
 */

import * as THREE from 'three';
import { CAMERA_CONTROLS, LOOK_AT, type ViewMode } from '../../../constants/camera';
import type { SharedState } from '../SharedState';

export class CameraHandler {
  private state: SharedState;

  constructor(state: SharedState) {
    this.state = state;
  }

  // ============================================================================
  // VIEW MODE
  // ============================================================================

  /**
   * Set the current view mode (2D or 3D).
   */
  public setViewMode(mode: ViewMode): void {
    this.state.viewMode = mode;

    // Update rotation arrows camera for proper raycasting in 2D/3D mode
    if (this.state.rotationArrows) {
      const activeCamera = mode === '2d' && this.state.orthographicCamera
        ? this.state.orthographicCamera
        : this.state.camera;
      this.state.rotationArrows.setActiveCamera(activeCamera);
    }
  }

  /**
   * Get the current view mode.
   */
  public getViewMode(): ViewMode {
    return this.state.viewMode;
  }

  /**
   * Check if currently in 3D mode.
   */
  public is3DMode(): boolean {
    return this.state.viewMode === '3d';
  }

  /**
   * Set orthographic camera reference.
   */
  public setOrthographicCamera(camera: THREE.OrthographicCamera): void {
    this.state.orthographicCamera = camera;
  }

  /**
   * Get the active camera based on current view mode.
   */
  public getActiveCamera(): THREE.Camera {
    if (this.state.viewMode === '2d' && this.state.orthographicCamera) {
      return this.state.orthographicCamera;
    }
    return this.state.camera;
  }

  // ============================================================================
  // CAMERA ANIMATION
  // ============================================================================

  /**
   * Start the smooth zoom animation loop.
   * This runs continuously to interpolate camera position.
   */
  public startZoomAnimation(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      const distance = this.state.camera.position.distanceTo(this.state.targetCameraPosition);
      if (distance > 0.1) {
        this.state.camera.position.lerp(this.state.targetCameraPosition, CAMERA_CONTROLS.ZOOM_SMOOTHING);
        this.state.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
      }
    };
    animate();
  }

  /**
   * Sync target camera position with current camera position.
   * Call after setCameraPreset to avoid animation jumps.
   */
  public syncTargetCameraPosition(): void {
    this.state.targetCameraPosition.copy(this.state.camera.position);
  }

  // ============================================================================
  // 3D CAMERA ROTATION (ORBIT)
  // ============================================================================

  /**
   * Handle camera orbit rotation in 3D mode.
   * Called during mouse drag in empty space.
   */
  public handleCameraOrbit(deltaX: number, deltaY: number): void {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.state.camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi -= deltaY * 0.01;

    // Constrain phi to prevent camera from going below floor
    spherical.phi = Math.max(0.1, Math.min(this.state.MAX_PHI_ANGLE, spherical.phi));

    // Apply the constrained position
    this.state.camera.position.setFromSpherical(spherical);

    // Additional check: if camera somehow goes below minimum height, adjust it
    if (this.state.camera.position.y < this.state.MIN_CAMERA_HEIGHT) {
      const distance = this.state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
      const newPhi = Math.acos(this.state.MIN_CAMERA_HEIGHT / distance);
      spherical.phi = Math.min(spherical.phi, newPhi);
      this.state.camera.position.setFromSpherical(spherical);
    }

    this.state.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
    // Sync the target with current position
    this.state.targetCameraPosition.copy(this.state.camera.position);
  }

  // ============================================================================
  // 3D ZOOM (PERSPECTIVE)
  // ============================================================================

  /**
   * Handle zoom in 3D perspective mode.
   * Moves camera along its viewing direction.
   */
  public handlePerspectiveZoom(deltaY: number): void {
    // Simple zoom: move forward or backward along viewing direction
    const zoomStep = deltaY > 0 ? -50 : 50; // positive = zoom out, negative = zoom in

    // Get the direction the camera is currently looking
    const viewDirection = new THREE.Vector3();
    this.state.camera.getWorldDirection(viewDirection);

    // Move camera along that exact direction
    const newPosition = this.state.camera.position.clone();
    newPosition.addScaledVector(viewDirection, zoomStep);

    // Apply distance limits
    const distanceFromCenter = newPosition.distanceTo(new THREE.Vector3(0, 0, 0));

    if (distanceFromCenter >= 100 && distanceFromCenter <= 1200) {
      // Update camera position - direction stays exactly the same
      this.state.camera.position.copy(newPosition);
      this.state.targetCameraPosition.copy(newPosition);
    }
    // Note: NO camera.lookAt() call here to maintain viewing direction
  }

  // ============================================================================
  // 2D CAMERA CONTROLS (via event bus)
  // ============================================================================

  /**
   * Emit 2D pan event via event bus.
   */
  public emitPan2DEvent(deltaX: number, deltaZ: number): void {
    if (this.state.eventBus) {
      this.state.eventBus.emit('camera:pan2d', { deltaX, deltaZ });
    } else if (this.state.sceneManager) {
      // Fallback to direct call for backward compatibility
      this.state.sceneManager.pan2D(deltaX, deltaZ);
    }
  }

  /**
   * Emit 2D zoom event via event bus.
   */
  public emitZoom2DEvent(delta: number): void {
    if (this.state.eventBus) {
      this.state.eventBus.emit('camera:zoom2d', { delta });
    } else if (this.state.sceneManager) {
      // Fallback to direct call for backward compatibility
      this.state.sceneManager.zoom2D(delta);
    }
  }

  // ============================================================================
  // WHEEL ZOOM HANDLER
  // ============================================================================

  /**
   * Handle mouse wheel zoom event.
   * Dispatches to 2D or 3D zoom based on view mode.
   */
  public handleWheelZoom(deltaY: number): void {
    // 2D MODE: Use orthographic zoom
    if (this.state.viewMode === '2d') {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1; // Invert for natural feel
      this.emitZoom2DEvent(zoomDelta);
      return;
    }

    // 3D MODE: Use perspective zoom
    this.handlePerspectiveZoom(deltaY);
  }

  // ============================================================================
  // TOUCH ZOOM
  // ============================================================================

  /**
   * Handle pinch zoom for touch devices.
   * @param scale The scale factor from pinch gesture (>1 = zoom in, <1 = zoom out)
   * @param distance Current touch distance for tracking
   */
  public handleTouchZoom(scale: number, distance: number): boolean {
    if (scale > 1.02 || scale < 0.98) {
      // 2D MODE: Use orthographic zoom
      if (this.state.viewMode === '2d') {
        const zoomDelta = scale > 1.02 ? 0.1 : -0.1; // pinch out = zoom in
        this.emitZoom2DEvent(zoomDelta);
        this.state.lastTouchDistance = distance;
        return true; // Handled
      }

      // 3D MODE: Move camera along viewing direction
      const zoomStep = scale > 1.02 ? -20 : 20; // pinch in = zoom in (negative)

      // Get viewing direction and move along it
      const viewDirection = new THREE.Vector3();
      this.state.camera.getWorldDirection(viewDirection);

      const newPosition = this.state.camera.position.clone();
      newPosition.addScaledVector(viewDirection, zoomStep);

      // Apply distance limits
      const distanceFromCenter = newPosition.distanceTo(new THREE.Vector3(0, 0, 0));

      if (distanceFromCenter >= 100 && distanceFromCenter <= 1200) {
        this.state.camera.position.copy(newPosition);
        this.state.targetCameraPosition.copy(newPosition);
      }

      this.state.lastTouchDistance = distance;
      return true; // Handled
    }

    return false; // Not handled
  }

  // ============================================================================
  // CAMERA ROTATION DURING DRAG (empty space)
  // ============================================================================

  /**
   * Handle camera movement during mouse drag in empty space.
   * In 2D mode: pans the view
   * In 3D mode: orbits the camera
   */
  public handleCameraDrag(event: MouseEvent): void {
    // 2D MODE: Convert camera orbit to panning
    if (this.state.viewMode === '2d') {
      const deltaX = event.clientX - this.state.mouseX;
      const deltaY = event.clientY - this.state.mouseY;

      // Pan the orthographic camera
      // Invert deltaY because screen Y is opposite to world Z in top-down view
      this.emitPan2DEvent(-deltaX, -deltaY);

      this.state.mouseX = event.clientX;
      this.state.mouseY = event.clientY;
      return;
    }

    // 3D MODE: Camera orbit
    const deltaX = event.clientX - this.state.mouseX;
    const deltaY = event.clientY - this.state.mouseY;

    this.handleCameraOrbit(deltaX, deltaY);

    this.state.mouseX = event.clientX;
    this.state.mouseY = event.clientY;
  }

  /**
   * Handle camera movement during touch drag in empty space.
   */
  public handleCameraTouchDrag(touch: Touch): void {
    // 2D MODE: Convert camera orbit to panning
    if (this.state.viewMode === '2d') {
      const deltaX = touch.clientX - this.state.mouseX;
      const deltaY = touch.clientY - this.state.mouseY;

      // Pan the orthographic camera
      this.emitPan2DEvent(-deltaX, -deltaY);

      this.state.mouseX = touch.clientX;
      this.state.mouseY = touch.clientY;
      return;
    }

    // 3D MODE: Camera orbit
    const deltaX = touch.clientX - this.state.mouseX;
    const deltaY = touch.clientY - this.state.mouseY;

    this.handleCameraOrbit(deltaX, deltaY);

    this.state.mouseX = touch.clientX;
    this.state.mouseY = touch.clientY;
  }
}
