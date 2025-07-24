<template>
  <div class="room-customizer">
    <div class="container">
      <div class="content-wrapper">
        <div class="left-panel">
          <h1 class="title">Add your bathroom's dimensions.</h1>
          <p class="subtitle">
            Drag the room to move it around. Use the green icons on the room edges to resize, or click the dimension numbers to enter precise measurements.
          </p>
        </div>

        <div class="right-panel">
          <div class="canvas-container" ref="canvasContainer">
            <canvas
                ref="canvas"
                @mousedown="handleCanvasMouseDown"
                @mousemove="handleCanvasMouseMove"
                @mouseup="handleCanvasMouseUp"
                @mouseleave="handleCanvasMouseLeave"
                @mouseenter="handleCanvasMouseEnter"
                @wheel="handleCanvasWheel"
                @touchstart="handleCanvasTouchStart"
                @touchmove="handleCanvasTouchMove"
                @touchend="handleCanvasTouchEnd"
            ></canvas>

            <!-- Dimension Input Overlays -->
            <div
                v-for="input in dimensionInputs"
                :key="input.id"
                class="dimension-input-overlay"
                :style="input.style"
                @click="input.onClick"
            >
              <input
                  v-if="input.editing"
                  :ref="'input-' + input.id"
                  v-model.number="input.tempValue"
                  type="number"
                  class="dimension-field"
                  :class="{ 'has-changes': input.tempValue !== input.originalValue }"
                  @blur="finishEditing(input)"
                  @keyup.enter="finishEditing(input)"
                  @keyup.escape="cancelEditing(input)"
                  :min="input.min"
                  :max="input.max"
              />
              <div v-else class="dimension-display"
                   :class="{ 'has-pending-changes': hasPendingChanges(input) }"
                   @click="startEditing(input)">
                {{ input.value }}{{ input.unit }}
                <span v-if="hasPendingChanges(input)" class="pending-indicator">*</span>
              </div>
            </div>

            <!-- Apply Changes Button -->
            <div v-if="hasAnyPendingChanges" class="apply-changes-container">
              <button class="apply-changes-btn" @click="applyPendingChanges">
                Apply Changes
              </button>
              <button class="cancel-changes-btn" @click="cancelAllPendingChanges">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <button class="update-btn" @click="goToPlanner">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {isMobile} from "../utils/helpers.js";

export default {
  name: 'RoomDimensions',
  data() {
    return {
      roomDimensions: { width: 300, height: 251.52 },
      pendingDimensions: { width: null, height: null }, // Store pending input changes
      canvasWidth: 600,
      canvasHeight: 500,
      scale: 1,
      zoomLevel: isMobile() ? 0.5 : 1,

      // Canvas drawing
      ctx: null,

      // Interaction
      isDragging: null,
      dragStartPos: { x: 0, y: 0 },
      dragStartDimensions: { width: 0, height: 0 },
      dragStartRoomCenter: { x: 0, y: 0 },
      hoveredHandle: null,
      hoveredRoom: false,

      // Room positioning
      roomCenter: { x: 400, y: 250 },

      // Handle definitions
      handles: [],

      // Dimension inputs
      dimensionInputs: [],
      editingInput: null,

      // Animation
      animationId: null,
      dragAnimationId: null,
      lastDragTime: 0,
      dragThrottleMs: 16 // ~60fps
    };
  },

  computed: {
    effectiveScale() {
      return this.scale * this.zoomLevel;
    },

    roomPixelWidth() {
      return this.roomDimensions.width * this.effectiveScale;
    },

    roomPixelHeight() {
      return this.roomDimensions.height * this.effectiveScale;
    },

    roomBounds() {
      return {
        left: this.roomCenter.x - this.roomPixelWidth / 2,
        top: this.roomCenter.y - this.roomPixelHeight / 2,
        right: this.roomCenter.x + this.roomPixelWidth / 2,
        bottom: this.roomCenter.y + this.roomPixelHeight / 2
      };
    },

    hasAnyPendingChanges() {
      return this.pendingDimensions.width !== null || this.pendingDimensions.height !== null;
    }
  },

  mounted() {
    this.initCanvas();
    this.updateHandles();
    this.updateDimensionInputs();
    this.startRenderLoop();

    window.addEventListener('resize', this.handleResize);
  },

  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.dragAnimationId) {
      cancelAnimationFrame(this.dragAnimationId);
    }

    // Always clean up drag state and listeners
    this.isDragging = null;
    this.removeGlobalMouseListeners();

    // Restore document state
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    window.removeEventListener('resize', this.handleResize);
  },

  watch: {
    roomDimensions: {
      handler() {
        this.updateHandles();
        this.updateDimensionInputs();
      },
      deep: true
    },

    roomCenter: {
      handler() {
        this.updateHandles();
        this.updateDimensionInputs();
      },
      deep: true
    },

    zoomLevel() {
      this.updateHandles();
      this.updateDimensionInputs();
    }
  },

  methods: {
    goToPlanner() {
      // Fixed: Use this.$router instead of router variable
      this.$router.push('/planner')
    },

    initCanvas() {
      const canvas = this.$refs.canvas;
      const container = this.$refs.canvasContainer;

      // Set canvas size
      this.canvasWidth = container.offsetWidth;
      this.canvasHeight = container.offsetHeight;

      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;

      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = true;

      // Center the room initially
      this.roomCenter = {
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2
      };
    },

    handleResize() {
      this.initCanvas();
      this.updateHandles();
      this.updateDimensionInputs();
    },

    updateHandles() {
      const bounds = this.roomBounds;

      this.handles = [
        // Only edge handles (green resize icons)
        { id: 'top', x: bounds.left + this.roomPixelWidth / 2, y: bounds.top, type: 'edge', cursor: 'ns-resize' },
        { id: 'right', x: bounds.right, y: bounds.top + this.roomPixelHeight / 2, type: 'edge', cursor: 'ew-resize' },
        { id: 'bottom', x: bounds.left + this.roomPixelWidth / 2, y: bounds.bottom, type: 'edge', cursor: 'ns-resize' },
        { id: 'left', x: bounds.left, y: bounds.top + this.roomPixelHeight / 2, type: 'edge', cursor: 'ew-resize' }
      ];
    },

    updateDimensionInputs() {
      const bounds = this.roomBounds;

      this.dimensionInputs = [
        // Top
        {
          id: 'width-top',
          value: this.roomDimensions.width,
          tempValue: this.pendingDimensions.width || this.roomDimensions.width,
          originalValue: this.roomDimensions.width,
          unit: 'cm',
          min: 150,
          max: 600,
          editing: false,
          style: {
            position: 'absolute',
            left: (bounds.left + this.roomPixelWidth / 2 - 40) + 'px',
            top: (bounds.top - 35) + 'px',
            width: '80px',
            height: '25px'
          },
          onClick: () => this.startEditing(this.dimensionInputs.find(i => i.id === 'width-top'))
        },

        // Bottom
        {
          id: 'width-bottom',
          value: this.roomDimensions.width,
          tempValue: this.pendingDimensions.width || this.roomDimensions.width,
          originalValue: this.roomDimensions.width,
          unit: 'cm',
          min: 150,
          max: 600,
          editing: false,
          style: {
            position: 'absolute',
            left: (bounds.left + this.roomPixelWidth / 2 - 40) + 'px',
            top: (bounds.bottom + 15) + 'px',
            width: '80px',
            height: '25px'
          },
          onClick: () => this.startEditing(this.dimensionInputs.find(i => i.id === 'width-bottom'))
        },

        // Left
        {
          id: 'height-left',
          value: this.roomDimensions.height,
          tempValue: this.pendingDimensions.height || this.roomDimensions.height,
          originalValue: this.roomDimensions.height,
          unit: 'cm',
          min: 150,
          max: 600,
          editing: false,
          style: {
            position: 'absolute',
            left: (bounds.left - 90) + 'px',
            top: (bounds.top + this.roomPixelHeight / 2 - 12.5) + 'px',
            width: '80px',
            height: '25px'
          },
          onClick: () => this.startEditing(this.dimensionInputs.find(i => i.id === 'height-left'))
        },

        // Right
        {
          id: 'height-right',
          value: this.roomDimensions.height,
          tempValue: this.pendingDimensions.height || this.roomDimensions.height,
          originalValue: this.roomDimensions.height,
          unit: 'cm',
          min: 150,
          max: 600,
          editing: false,
          style: {
            position: 'absolute',
            left: (bounds.right + 10) + 'px',
            top: (bounds.top + this.roomPixelHeight / 2 - 12.5) + 'px',
            width: '80px',
            height: '25px'
          },
          onClick: () => this.startEditing(this.dimensionInputs.find(i => i.id === 'height-right'))
        }
      ];
    },

    startEditing(input) {
      if (this.editingInput) {
        this.finishEditing(this.editingInput);
      }

      input.editing = true;
      input.tempValue = input.value; // Reset temp value to current value
      this.editingInput = input;

      this.$nextTick(() => {
        const inputEl = this.$refs['input-' + input.id]?.[0];
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
      });
    },

    finishEditing(input) {
      // Validate and constrain the temp value
      const validatedValue = Math.max(input.min, Math.min(input.max, input.tempValue));
      input.tempValue = validatedValue;

      // Store in pending dimensions instead of applying immediately
      if (input.id.includes('width')) {
        this.pendingDimensions.width = validatedValue;
      } else {
        this.pendingDimensions.height = validatedValue;
      }

      input.editing = false;
      this.editingInput = null;
    },

    cancelEditing(input) {
      input.editing = false;
      this.editingInput = null;
      // Reset temp value to current actual value
      input.tempValue = input.value;
    },

    hasPendingChanges(input) {
      if (input.id.includes('width')) {
        return this.pendingDimensions.width !== null && this.pendingDimensions.width !== this.roomDimensions.width;
      } else {
        return this.pendingDimensions.height !== null && this.pendingDimensions.height !== this.roomDimensions.height;
      }
    },

    applyPendingChanges() {
      if (this.pendingDimensions.width !== null) {
        this.roomDimensions.width = this.pendingDimensions.width;
      }
      if (this.pendingDimensions.height !== null) {
        this.roomDimensions.height = this.pendingDimensions.height;
      }

      // Clear pending changes
      this.pendingDimensions = { width: null, height: null };
    },

    cancelAllPendingChanges() {
      this.pendingDimensions = { width: null, height: null };
      // Update temp values in inputs to reflect the cancellation
      this.updateDimensionInputs();
    },

    getMousePos(e) {
      const canvas = this.$refs.canvas;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    getGlobalMousePos(e) {
      // This works even when mouse is outside canvas
      const canvas = this.$refs.canvas;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    getTouchPos(e) {
      const canvas = this.$refs.canvas;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    },

    getGlobalTouchPos(e) {
      // This works even when touch is outside canvas
      const canvas = this.$refs.canvas;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    },

    getHandleAt(pos) {
      const handleRadius = 8; // Increased to match the larger green handles
      return this.handles.find(handle => {
        const dx = pos.x - handle.x;
        const dy = pos.y - handle.y;
        return Math.sqrt(dx * dx + dy * dy) <= handleRadius;
      });
    },

    isInsideRoom(pos) {
      const bounds = this.roomBounds;
      return pos.x >= bounds.left && pos.x <= bounds.right && pos.y >= bounds.top && pos.y <= bounds.bottom;
    },

    handleCanvasMouseDown(e) {
      // Only prevent default for canvas interactions, not all interactions
      const pos = this.getMousePos(e);

      // Priority 1: Check for green resize handles
      const handle = this.getHandleAt(pos);
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = handle.id;
        this.dragStartPos = pos;
        this.dragStartDimensions = { ...this.roomDimensions };
        this.dragStartRoomCenter = { ...this.roomCenter };
        this.lastDragTime = 0;
        this.$refs.canvas.style.cursor = 'grabbing';
        this.addGlobalMouseListeners();
        this.preventSelection();
        return;
      }

      // Priority 2: Check if inside room (for moving)
      if (this.isInsideRoom(pos)) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = 'room-move';
        this.dragStartPos = pos;
        this.dragStartRoomCenter = { ...this.roomCenter };
        this.lastDragTime = 0;
        this.$refs.canvas.style.cursor = 'grabbing';
        this.addGlobalMouseListeners();
        this.preventSelection();
      }

      // If we're not interacting with the canvas elements, don't prevent the event
    },

    addGlobalMouseListeners() {
      // Remove capture: true and be more selective about event handling
      document.addEventListener('mousemove', this.handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', this.handleGlobalMouseUp, { passive: false });
      window.addEventListener('mousemove', this.handleGlobalMouseMove, { passive: false });
      window.addEventListener('mouseup', this.handleGlobalMouseUp, { passive: false });
    },

    preventSelection() {
      console.log('>>> inside the room', this.isInsideRoom(this.dragStartPos));
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    },

    handleCanvasMouseMove(e) {
      // Don't prevent default for hover events
      if (this.isDragging) {
        return;
      }

      const pos = this.getMousePos(e);

      // Reset hover states
      this.hoveredHandle = null;
      this.hoveredRoom = false;

      // Check hover - priority order: handles, room interior
      const handle = this.getHandleAt(pos);
      if (handle) {
        this.hoveredHandle = handle.id;
        const canvas = this.$refs.canvas;
        if (canvas) {
          canvas.style.cursor = handle.cursor;
        }
        return;
      }

      if (this.isInsideRoom(pos)) {
        this.hoveredRoom = true;
        const canvas = this.$refs.canvas;
        if (canvas) {
          canvas.style.cursor = 'move';
        }
        return;
      }

      // Default cursor for empty areas
      const canvas = this.$refs.canvas;
      if (canvas) {
        canvas.style.cursor = 'default';
      }
    },

    handleCanvasMouseUp() {
      if (this.isDragging) {
        return;
      }
    },

    handleCanvasMouseEnter(e) {
      // This ensures cursor is updated correctly when mouse re-enters canvas
      // Especially important after drag operations
      if (!this.isDragging) {
        // Force a cursor update by calling mouse move logic
        this.handleCanvasMouseMove(e);
      }
    },

    handleCanvasMouseLeave() {
      if (!this.isDragging) {
        this.hoveredHandle = null;
        this.hoveredRoom = false;
        this.$refs.canvas.style.cursor = 'default';
      }
    },

    handleGlobalMouseMove(e) {
      // Only prevent default and stop propagation if we're actually dragging
      if (!this.isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - this.lastDragTime >= this.dragThrottleMs) {
        const pos = this.getGlobalMousePos(e);
        this.handleDrag(pos);
        this.lastDragTime = now;
      }
    },

    handleGlobalMouseUp(e) {
      // Only prevent default and stop propagation if we were dragging
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        this.endDrag();
      }
    },

    endDrag() {
      console.log('>>> end drag functions', this.isDragging);

      if (!this.isDragging) return;

      this.isDragging = null;

      // Remove global event listeners - make sure this always happens
      this.removeGlobalMouseListeners();

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      // Update cursor for current position
      this.updateCursorForCurrentPosition();
    },

    removeGlobalMouseListeners() {
      document.removeEventListener('mousemove', this.handleGlobalMouseMove);
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
      window.removeEventListener('mousemove', this.handleGlobalMouseMove);
      window.removeEventListener('mouseup', this.handleGlobalMouseUp);
    },

    updateCursorForCurrentPosition() {
      // Simply reset hover states and let the next mouse move event handle cursor updates
      this.$nextTick(() => {
        this.hoveredHandle = null;
        this.hoveredRoom = false;
        // Don't force cursor to 'default' - let mouse move handle it
      });
    },

    handleCanvasTouchStart(e) {
      const pos = this.getTouchPos(e);

      const handle = this.getHandleAt(pos);
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = handle.id;
        this.dragStartPos = pos;
        this.dragStartDimensions = { ...this.roomDimensions };
        this.dragStartRoomCenter = { ...this.roomCenter };
        this.lastDragTime = 0;
        this.addGlobalTouchListeners();
        return;
      }

      if (this.isInsideRoom(pos)) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = 'room-move';
        this.dragStartPos = pos;
        this.dragStartRoomCenter = { ...this.roomCenter };
        this.lastDragTime = 0;
        this.addGlobalTouchListeners();
      }
    },

    removeGlobalTouchListeners() {
      document.removeEventListener('touchmove', this.handleGlobalTouchMove);
      document.removeEventListener('touchend', this.handleGlobalTouchEnd);
    },



    addGlobalTouchListeners() {
      document.addEventListener('touchmove', this.handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', this.handleGlobalTouchEnd, { passive: false });
    },

    handleCanvasTouchMove(e) {
      e.preventDefault();
      if (this.isDragging) {
        const pos = this.getTouchPos(e);
        this.handleDrag(pos);
      }
    },

    handleCanvasTouchEnd(e) {
      e.preventDefault();
      this.isDragging = null;
    },

// 11. Fix global touch handlers
    handleGlobalTouchMove(e) {
      if (!this.isDragging) return;

      e.preventDefault();
      e.stopPropagation();
      const pos = this.getGlobalTouchPos(e);
      this.handleDrag(pos);
    },

    handleGlobalTouchEnd(e) {
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = null;
        this.removeGlobalTouchListeners();

        // Restore document state
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
    },

    handleDrag(currentPos) {
      if (!this.isDragging) return;

      const deltaX = currentPos.x - this.dragStartPos.x;
      const deltaY = currentPos.y - this.dragStartPos.y;

      // Handle room movement
      if (this.isDragging === 'room-move') {
        this.roomCenter.x = this.dragStartRoomCenter.x + deltaX;
        this.roomCenter.y = this.dragStartRoomCenter.y + deltaY;
        return;
      }

      // Handle dimension changes (from green edge handles only)
      // Keep opposite edges fixed during resize
      const scaledDeltaX = deltaX / this.effectiveScale;
      const scaledDeltaY = deltaY / this.effectiveScale;

      let newWidth = this.dragStartDimensions.width;
      let newHeight = this.dragStartDimensions.height;
      let newCenterX = this.dragStartRoomCenter.x;
      let newCenterY = this.dragStartRoomCenter.y;

      // Calculate original bounds
      const startBounds = {
        left: this.dragStartRoomCenter.x - (this.dragStartDimensions.width * this.effectiveScale) / 2,
        top: this.dragStartRoomCenter.y - (this.dragStartDimensions.height * this.effectiveScale) / 2,
        right: this.dragStartRoomCenter.x + (this.dragStartDimensions.width * this.effectiveScale) / 2,
        bottom: this.dragStartRoomCenter.y + (this.dragStartDimensions.height * this.effectiveScale) / 2
      };

      switch (this.isDragging) {
        case 'right':
          // Keep left edge fixed, expand/contract to the right
          newWidth = Math.max(150, Math.min(600, this.dragStartDimensions.width + scaledDeltaX));
          newCenterX = startBounds.left + (newWidth * this.effectiveScale) / 2;
          break;
        case 'bottom':
          // Keep top edge fixed, expand/contract downward
          newHeight = Math.max(150, Math.min(600, this.dragStartDimensions.height + scaledDeltaY));
          newCenterY = startBounds.top + (newHeight * this.effectiveScale) / 2;
          break;
        case 'left':
          // Keep right edge fixed, expand/contract to the left
          newWidth = Math.max(150, Math.min(600, this.dragStartDimensions.width - scaledDeltaX));
          newCenterX = startBounds.right - (newWidth * this.effectiveScale) / 2;
          break;
        case 'top':
          // Keep bottom edge fixed, expand/contract upward
          newHeight = Math.max(150, Math.min(600, this.dragStartDimensions.height - scaledDeltaY));
          newCenterY = startBounds.bottom - (newHeight * this.effectiveScale) / 2;
          break;
      }

      // Apply changes
      this.roomDimensions.width = Math.round(newWidth * 100) / 100;
      this.roomDimensions.height = Math.round(newHeight * 100) / 100;
      this.roomCenter.x = newCenterX;
      this.roomCenter.y = newCenterY;

      // Clear pending changes since dragging overrides them
      this.pendingDimensions = { width: null, height: null };
    },

    handleCanvasWheel(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.zoomLevel = Math.max(0.5, Math.min(2, this.zoomLevel + delta));
    },

    draw() {
      const ctx = this.ctx;

      // Clear canvas
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      const bounds = this.roomBounds;

      // Draw room
      ctx.fillStyle = this.hoveredRoom && !this.isDragging ? '#f7fafc' : '#ffffff';
      ctx.fillRect(bounds.left, bounds.top, this.roomPixelWidth, this.roomPixelHeight);

      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 8;
      ctx.strokeRect(bounds.left, bounds.top, this.roomPixelWidth, this.roomPixelHeight);

      // Draw green resize handles
      this.drawHandles(ctx);
    },

    drawDimensionLineHighlights(ctx, bounds) {
      if (!this.hoveredDimensionLine && !this.isDragging) return;

      ctx.strokeStyle = '#29275B';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;

      const activeColor = '#48bb78';
      const hoverColor = '#29275B';

      // Determine which line to highlight
      const lineToHighlight = this.isDragging || this.hoveredDimensionLine;

      if (lineToHighlight === 'width-top' || lineToHighlight === 'width-bottom') {
        ctx.strokeStyle = this.isDragging ? activeColor : hoverColor;
        if (lineToHighlight === 'width-top') {
          ctx.beginPath();
          ctx.moveTo(bounds.left - 10, bounds.top - 40);
          ctx.lineTo(bounds.right + 10, bounds.top - 40);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(bounds.left - 10, bounds.bottom + 40);
          ctx.lineTo(bounds.right + 10, bounds.bottom + 40);
          ctx.stroke();
        }
      }

      if (lineToHighlight === 'height-left' || lineToHighlight === 'height-right') {
        ctx.strokeStyle = this.isDragging ? activeColor : hoverColor;
        if (lineToHighlight === 'height-left') {
          ctx.beginPath();
          ctx.moveTo(bounds.left - 40, bounds.top - 10);
          ctx.lineTo(bounds.left - 40, bounds.bottom + 10);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(bounds.right + 40, bounds.top - 10);
          ctx.lineTo(bounds.right + 40, bounds.bottom + 10);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;
    },

    drawDimensionLines(ctx, bounds) {
      ctx.strokeStyle = '#a0aec0';
      ctx.lineWidth = 1;

      // Top line
      ctx.beginPath();
      ctx.moveTo(bounds.left, bounds.top - 40);
      ctx.lineTo(bounds.right, bounds.top - 40);
      ctx.stroke();

      // Bottom line
      ctx.beginPath();
      ctx.moveTo(bounds.left, bounds.bottom + 40);
      ctx.lineTo(bounds.right, bounds.bottom + 40);
      ctx.stroke();

      // Left line
      ctx.beginPath();
      ctx.moveTo(bounds.left - 40, bounds.top);
      ctx.lineTo(bounds.left - 40, bounds.bottom);
      ctx.stroke();

      // Right line
      ctx.beginPath();
      ctx.moveTo(bounds.right + 40, bounds.top);
      ctx.lineTo(bounds.right + 40, bounds.bottom);
      ctx.stroke();

      // Draw dimension indicators (dots)
      ctx.fillStyle = '#29275B';

      // Top center
      ctx.beginPath();
      ctx.arc(bounds.left + this.roomPixelWidth / 2, bounds.top - 40, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Bottom center
      ctx.beginPath();
      ctx.arc(bounds.left + this.roomPixelWidth / 2, bounds.bottom + 40, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Left center
      ctx.beginPath();
      ctx.arc(bounds.left - 40, bounds.top + this.roomPixelHeight / 2, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Right center
      ctx.beginPath();
      ctx.arc(bounds.right + 40, bounds.top + this.roomPixelHeight / 2, 4, 0, 2 * Math.PI);
      ctx.fill();
    },

    drawHandles(ctx) {
      this.handles.forEach(handle => {
        const isHovered = this.hoveredHandle === handle.id;
        const isDragging = this.isDragging === handle.id;

        // Green color for handles
        ctx.fillStyle = isDragging ? '#38a169' : isHovered ? '#48bb78' : '#48bb78';

        ctx.beginPath();
        ctx.arc(handle.x, handle.y, isDragging ? 8 : isHovered ? 7 : 6, 0, 2 * Math.PI);
        ctx.fill();

        // Add white border for better visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    },

    startRenderLoop() {
      const render = () => {
        this.draw();
        this.animationId = requestAnimationFrame(render);
      };
      render();
    },
  }
};
</script>