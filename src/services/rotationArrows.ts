// File: src/services/rotationArrows.ts

import * as THREE from 'three';

export class RotationArrows {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private selectedObject: THREE.Object3D | null = null;

    // Arrow components
    private arrowGroup: THREE.Group;
    private arrows: THREE.Object3D[] = [];
    private arrowMaterial: THREE.MeshBasicMaterial;
    private hoverArrowMaterial: THREE.MeshBasicMaterial;

    // Interaction state
    private isDragging: boolean = false;
    private draggedArrow: THREE.Object3D | null = null;
    private mouse: THREE.Vector2;
    private raycaster: THREE.Raycaster;
    private rotationStartAngle: number = 0;
    private objectStartRotation: number = 0;

    // Mouse position tracking
    private mouseDownPosition: THREE.Vector2;

    // Callbacks
    private onRotationChange: ((rotation: number) => void) | null = null;
    private onRotationComplete: ((rotation: number) => void) | null = null;

    // NEW: Toggle state
    private enabled: boolean = false;
    // Stable listener references
    private handleMouseDown!: (e: MouseEvent) => void;
    private handleMouseMove!: (e: MouseEvent) => void;
    private handleMouseUp!: (e: MouseEvent) => void;

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.mouseDownPosition = new THREE.Vector2();

        // Create arrow materials
        this.arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50, // Nice green color instead of cyan
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.hoverArrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFEB3B, // Yellow when hovered/dragged
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });

        this.arrowGroup = new THREE.Group();
        this.arrowGroup.name = 'RotationArrows';
        this.arrowGroup.visible = false; // Start hidden
        this.scene.add(this.arrowGroup);

        this.createArrows();
        this.setupEventListeners();
    }

    private createArrows(): void {
        // Clear existing arrows
        this.arrowGroup.clear();
        this.arrows = [];

        // Create 4 curved arrows around the object
        const arrowCount = 4;

        for (let i = 0; i < arrowCount; i++) {
            const angle = (i / arrowCount) * Math.PI * 2;
            const arrow = this.createArrow();

            // Position arrow around the object (closer to the object)
            arrow.position.x = 0;
            arrow.position.z = 0;
            arrow.position.y = 5; // Slightly above the object

            // Rotate arrow to correct orientation for each position
            arrow.rotation.y = angle;

            // Store angle for interaction
            arrow.userData.angle = angle;
            arrow.userData.isRotationArrow = true;
            arrow.userData.arrowIndex = i;

            this.arrows.push(arrow);
            this.arrowGroup.add(arrow);
        }
    }

    private createArrow(): THREE.Object3D {
        const arrowGroup = new THREE.Group();

        // Create curved arrow path (torus segment)
        const curveRadius = 90;
        const curveThickness = 4;
        const curveAngle = Math.PI / 2.3; // Slightly longer arc

        const curveGeometry = new THREE.TorusGeometry(curveRadius, curveThickness, 6, 16, curveAngle);
        const curve = new THREE.Mesh(curveGeometry, this.arrowMaterial);
        curve.rotation.x = Math.PI / 2;
        arrowGroup.add(curve);

        // Create arrow head (triangle pointing in rotation direction)
        const headGeometry = new THREE.ConeGeometry(12, 20, 3); // Triangular cone for sharp arrow
        const head = new THREE.Mesh(headGeometry, this.arrowMaterial);

        // Position the arrow head at the end of the curve
        const endX = Math.cos(curveAngle) * curveRadius;
        const endZ = Math.sin(curveAngle) * curveRadius;

        head.position.x = endX;
        head.position.z = endZ;
        head.position.y = 0;

        // Calculate the tangent direction at the end of the curve for proper arrow pointing
        const tangentAngle = curveAngle + Math.PI / 2; // Tangent to the curve
        head.rotation.y = tangentAngle;
        head.rotation.x = Math.PI / 2; // Point the cone tip forward

        arrowGroup.add(head);

        // Add a small tail at the start of the curve for better visual clarity
        const tailGeometry = new THREE.SphereGeometry(6, 8, 8);
        const tail = new THREE.Mesh(tailGeometry, this.arrowMaterial);
        tail.position.x = curveRadius; // Start of the curve
        tail.position.z = 0;
        tail.position.y = 0;
        arrowGroup.add(tail);

        return arrowGroup;
    }

    // NEW: Method to check if an object can use rotation arrows
    private canObjectUseRotationArrows(object: THREE.Object3D): boolean {
        // This would need to be implemented based on your object's movement config
        // For now, return true, but you can add logic to check the object's movement config
        if (!object || !object.userData) return false;

        // You would need to access the movement config here
        // This is a placeholder - you'd implement the actual check
        return true;
    }

    public setSelectedObject(object: THREE.Object3D | null): void {
        this.selectedObject = object;

        // Only show arrows if enabled AND object allows free rotation
        if (object && this.enabled && this.canObjectUseRotationArrows(object)) {
            this.showArrows();
            this.updateArrowPositions();
        } else {
            this.hideArrows();
        }
    }

    // NEW: Method to enable/disable the rotation arrows
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;

        // If we have a selected object, update arrow visibility based on new enabled state
        if (this.selectedObject) {
            if (enabled) {
                this.showArrows();
                this.updateArrowPositions();
            } else {
                this.hideArrows();
            }
        }
    }

    // NEW: Method to check if arrows are enabled
    public isEnabled(): boolean {
        return this.enabled;
    }

    private showArrows(): void {
        this.arrowGroup.visible = true;
    }

    private hideArrows(): void {
        this.arrowGroup.visible = false;
    }

    private updateArrowPositions(): void {
        if (!this.selectedObject) return;

        // Position arrow group at selected object's position
        this.arrowGroup.position.copy(this.selectedObject.position);

        // IMPORTANT: Rotate the arrows to match the object's rotation
        this.arrowGroup.rotation.y = this.selectedObject.rotation.y;

        // Scale arrows based on camera distance for consistent size
        const distance = this.camera.position.distanceTo(this.selectedObject.position);
        const scale = Math.max(0.3, Math.min(1.0, distance / 500));
        this.arrowGroup.scale.setScalar(scale);
    }

    private setupEventListeners(): void {
        this.handleMouseDown = this.onMouseDown.bind(this);
        this.handleMouseMove = this.onMouseMove.bind(this);
        this.handleMouseUp = this.onMouseUp.bind(this);
        this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);

        // Prevent context menu on arrows
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            this.updateMousePosition(event as MouseEvent);
            if (this.isMouseOverArrow()) {
                event.preventDefault();
            }
        });
    }

    private updateMousePosition(event: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getIntersectedArrow(): THREE.Object3D | null {
        if (!this.arrowGroup.visible) return null;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.arrowGroup.children, true);

        if (intersects.length > 0) {
            // Find the root arrow object
            let object = intersects[0].object;
            while (object.parent && !object.userData.isRotationArrow) {
                object = object.parent;
            }
            return object.userData.isRotationArrow ? object : null;
        }

        return null;
    }

    private isMouseOverArrow(): boolean {
        return this.getIntersectedArrow() !== null;
    }

    private onMouseDown(event: MouseEvent): void {
        if (event.button !== 0) return; // Only left click

        this.updateMousePosition(event);
        this.mouseDownPosition.set(event.clientX, event.clientY);

        const intersectedArrow = this.getIntersectedArrow();

        if (intersectedArrow && this.selectedObject) {
            event.preventDefault();
            event.stopPropagation();

            this.isDragging = true;
            this.draggedArrow = intersectedArrow;

            // Calculate initial rotation angle
            const rect = this.renderer.domElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            this.rotationStartAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
            this.objectStartRotation = this.selectedObject.rotation.y;

            // Change cursor and arrow color
            this.renderer.domElement.style.cursor = 'grab';
            this.setArrowMaterial(intersectedArrow, this.hoverArrowMaterial);

            console.log('🎯 Started rotating with arrow');
        }
    }

    private onMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);

        if (this.isDragging && this.draggedArrow && this.selectedObject) {
            // Perform rotation
            const rect = this.renderer.domElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);

            // FIX: Invert the rotation direction by flipping the delta calculation
            const deltaAngle = this.rotationStartAngle - currentAngle; // Changed from currentAngle - this.rotationStartAngle

            const newRotation = this.objectStartRotation + deltaAngle;
            this.selectedObject.rotation.y = newRotation;

            // Update arrow positions to follow the object
            this.updateArrowPositions();

            // Callback for real-time updates
            if (this.onRotationChange) {
                this.onRotationChange(newRotation);
            }

        } else {
            // Handle hover effects
            const intersectedArrow = this.getIntersectedArrow();

            // Reset all arrows to normal color
            this.arrows.forEach(arrow => {
                this.setArrowMaterial(arrow, this.arrowMaterial);
            });

            // Highlight hovered arrow
            if (intersectedArrow && !this.isDragging) {
                this.setArrowMaterial(intersectedArrow, this.hoverArrowMaterial);
                this.renderer.domElement.style.cursor = 'pointer';
            } else if (!this.isDragging) {
                this.renderer.domElement.style.cursor = 'default';
            }
        }
    }

    private onMouseUp(): void {
        if (this.isDragging && this.selectedObject) {
            // Finalize rotation
            const finalRotation = this.selectedObject.rotation.y;

            // Callback for completion
            if (this.onRotationComplete) {
                this.onRotationComplete(finalRotation);
            }

            console.log('🎯 Completed rotation with arrow, final rotation:', finalRotation);
        }

        // Reset state
        this.isDragging = false;
        this.draggedArrow = null;
        this.renderer.domElement.style.cursor = 'default';

        // Reset arrow colors
        this.arrows.forEach(arrow => {
            this.setArrowMaterial(arrow, this.arrowMaterial);
        });
    }

    private setArrowMaterial(arrow: THREE.Object3D, material: THREE.Material): void {
        arrow.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = material;
            }
        });
    }

    public update(): void {
        if (this.selectedObject && this.arrowGroup.visible) {
            this.updateArrowPositions();
        }
    }

    public setRotationChangeCallback(callback: (rotation: number) => void): void {
        this.onRotationChange = callback;
    }

    public setRotationCompleteCallback(callback: (rotation: number) => void): void {
        this.onRotationComplete = callback;
    }

    public dispose(): void {
        // Remove event listeners
        this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
        this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);

        // Clean up Three.js objects
        this.arrowGroup.clear();
        this.scene.remove(this.arrowGroup);

        this.arrowMaterial.dispose();
        this.hoverArrowMaterial.dispose();
    }

    // Public method to check if currently dragging an arrow
    public isDraggingArrow(): boolean {
        return this.isDragging;
    }

    // Public method to get if mouse is over an arrow (for event handling priority)
    public isMouseOverArrows(): boolean {
        return this.isMouseOverArrow();
    }
}