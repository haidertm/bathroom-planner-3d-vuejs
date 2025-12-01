# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Commands](#development-commands)
3. [Architecture Overview](#architecture-overview)
4. [Key Systems](#key-systems)
5. [Data Flow](#data-flow)
6. [Design Persistence](#design-persistence)
7. [Common Patterns](#common-patterns)
8. [Important Notes](#important-notes)
9. [Analytics & Tracking](#analytics--tracking)
10. [Technology Stack](#technology-stack)

---

## Project Overview

This is a 3D bathroom planner built with Vue 3, Three.js, and TypeScript. It allows users to design bathrooms by placing fixtures (toilets, sinks, mirrors, radiators, showers, baths) in a 3D room environment with real-time rendering and collision detection.

**Key Features:**
- 3D room visualization with Three.js
- Drag-and-drop fixture placement
- Real-time collision detection
- Product variant system with in-place swapping
- IKEA-style measurement system
- Visual rotation arrows for free-rotation objects
- Floor and wall texture customization
- Undo/redo functionality (50 state history)
- Mobile touch controls support
- LocalStorage-based design persistence

---

## Development Commands

**Note:** This project uses yarn as the package manager.

```bash
# Start development server
yarn dev

# Build for production (TypeScript compilation + Vite build)
yarn build

# Preview production build
yarn preview

# Scan GLB model dimensions (utility script)
yarn glb:scan

# Generate project structure file
yarn structure
```

---

## Architecture Overview

### Core Services (8 Services)

#### 1. SceneManager (`src/services/sceneManager.ts`)
- Manages the Three.js scene, camera, renderer, and post-processing
- Handles room geometry (floor, walls, grids)
- Controls lighting and shadows
- Manages bathroom fixture placement and updates
- Implements wall culling for better visibility
- Uses EffectComposer with OutlinePass for object selection highlighting
- Maintains `existingItems` map for incremental scene updates
- Provides methods: `updateBathroomItems()`, `addSingleItem()`, `removeSingleItem()`

#### 2. EventHandlers (`src/services/eventHandlers.ts`)
- Handles all user interactions (mouse, touch, keyboard)
- Implements drag, rotate, scale, and height adjustment for objects
- Manages raycasting for object selection
- Enforces collision detection and room boundary constraints
- Integrates with measurement system for real-time feedback
- Camera orbit controls with floor collision prevention
- Touch controls: pinch zoom, double-tap delete
- Keyboard shortcuts: Delete key, Ctrl+drag (height adjustment)

#### 3. ModelManager (`src/models/bathroomFixtures.ts`)
- Singleton pattern for GLB model loading and caching
- Supports selective preloading by category (toilets, sinks, mirrors, etc.)
- Maintains loading promises to prevent duplicate requests
- Provides callbacks when specific models finish loading
- Handles model cloning for efficient scene updates

#### 4. MeasurementSystem (`src/services/measurementSystem.ts`)
- Real-time dimension display during object interaction
- Distance calculations between objects
- Clearance measurements (left, right, front, back, above, below)
- Wall-bound vs free-standing object measurements
- IKEA-style visual labels (black rounded rectangles, white text)
- Measurement lines with end markers
- Height-aware collision detection
- Vertical space calculations
- Smart display logic that only shows relevant measurements

#### 5. RotationArrows (`src/services/rotationArrows.ts`)
- Visual rotation controls for objects with `allowFreeRotation: true`
- 4 curved arrow indicators around selected object
- Interactive drag-to-rotate functionality
- Hover effects (green → yellow on hover)
- Toggle enable/disable via RotationArrowsToggle component

#### 6. TextureManager (`src/services/textureManager.ts`)
- Singleton pattern for texture loading and caching
- Material creation (floor, wall, ceramic, metal)
- Async texture loading with promises
- Quality level management (low/medium/high)
- Environment mapping support
- Anisotropic filtering (up to 16x)
- Supports 7 floor textures and 9 wall textures

#### 7. ModelCache (`src/services/ModelCache.ts`)
- Caching system for 3D models
- Performance optimization for model loading

#### 8. SimpleWallCulling (`src/services/simpleWallCulling.ts`)
- Wall visibility management
- Camera-based frustum culling

**Note:** ObjectPool service (`src/services/ObjectPool.ts`) exists but is currently unused.

---

### Composables

#### useUndoRedo (`src/composables/useUndoRedo.ts`)
- Generic undo/redo functionality with history stack (max 50 states)
- Stores complete state: items, room dimensions, textures
- Deep clones state to prevent reference issues
- Provides `BathroomPlannerState` type for app-specific usage
- Methods: `saveState()`, `undo()`, `redo()`, `canUndo()`, `canRedo()`

**Empty composable folders** (for future organization):
- `camera/`, `collision/`, `common/`, `interaction/`

---

### UI Components

Major components in `src/components/ui/`:

1. **sidebar.vue** - Product catalog with category filters and selection
2. **ProductDrawer.vue** - Detailed product information drawer
3. **ItemConfigurationOverlay.vue** - Configuration overlay for selected objects
4. **VariantConfigurationDrawer.vue** - Product variant selection interface
5. **Header.vue** - Top navigation bar
6. **UndoRedoPanel.vue** - Undo/redo controls
7. **MeasurementToggle.vue** - Toggle measurement system on/off
8. **LoadingModal.vue** - Loading indicator for async operations
9. **RoomSizePanel.vue** - Room dimension controls
10. **RotationArrowsToggle.vue** - Toggle rotation arrows on/off
11. **TexturePanel.vue** - Floor and wall texture selection
12. **MeasurementPanel.vue** - Display measurement values
13. **CameraDebugPanel.vue** - Camera debugging tools
14. **Toolbar.vue** - Main toolbar with common actions

---

## Key Systems

### Movement & Orientation System

Controlled by configurations in `src/constants/models.ts`:

#### OrientationConfig Types
- **`face_into_room`**: Objects face inward (sinks, toilets, mirrors)
- **`flush_with_wall`**: Objects flush with wall surface
- **`custom`**: Custom rotation logic with specific angle offsets

#### MovementConfig
```typescript
{
  snapToWall: boolean,          // Whether object snaps to walls
  cornerInstallOnly: boolean,   // If true, only placeable in room corners
  allowVerticalMovement: boolean, // Enable Ctrl+drag height adjustment
  allowFreeRotation: boolean,   // Enable rotation arrows
  minHeight: number,            // Minimum Y position (cm)
  maxHeight: number,            // Maximum Y position (cm)
  wallBuffer?: number           // Custom wall distance
}
```

---

### Constraint System (`src/utils/constraints.ts`)

Handles object placement validation:

- **`wouldCollideWithExistingOrWalls()`**: Checks collisions with other objects and room boundaries
- **`findFreeWallPosition()`**: Finds available wall position for new objects
- **`constrainToWalls()`**: Snaps objects to nearest wall
- **`constrainToCorner()`**: Places objects in room corners
- **`getBoundingBox()`**: Calculates object bounding box (rotation-aware)

---

### Measurement System

Features:
- Real-time dimension display
- Distance calculations between objects
- Clearance measurements (6 directions)
- IKEA-style visual design
- Smart conditional display
- Height-aware collision detection

---

### Rotation System

- Visual curved arrow indicators (4 arrows around object)
- Drag-to-rotate interaction
- Only enabled for objects with `allowFreeRotation: true`
- Toggle on/off functionality

---

### Texture System

**7 Floor Textures:**
- Tiles, wood, stone, terracotta options

**9 Wall Textures:**
- Paint, tile, brick, subway tile options

**Material Types:**
- Floor, wall, ceramic, metal materials
- Quality levels: low/medium/high
- Texture caching for performance

---

### Unit System

The entire application uses **centimeters** as the internal unit.

#### Key Constants (`src/constants/dimensions.ts`)
```typescript
{
  defaultRoomWidth: 300,      // 3m
  defaultRoomLength: 250,     // 2.5m
  defaultWallHeight: 250,     // 2.5m
  minRoomSize: 100,           // 1m
  maxRoomSize: 600,           // 6m
  gridSpacing: 15,            // 15cm grid
}
```

**localStorage** stores dimensions in meters for backward compatibility, but converts to/from cm internally.

---

### State Management

#### Undo/Redo System
- History stack (max 50 states)
- Deep clones state to prevent reference issues
- Stores: items, room dimensions, textures

#### Reactive State
Vue's reactivity system manages:
- `items` array - List of placed bathroom fixtures
- `roomDimensions` - Room width, length, height
- `selectedTextures` - Current floor and wall textures
- `selectedItemId` - Currently selected object

**Important:** Three.js objects use `shallowRef` or `markRaw` to avoid Vue reactivity overhead.

---

## Data Flow

### Adding an Item Flow

1. User clicks product in Sidebar
2. `addItem()` function in Planner.vue:
   - Calls `findFreeWallPosition()` to calculate spawn position
   - Creates item object with product data (SKU, model path, dimensions)
   - Adds to reactive `items` array
3. Vue watcher detects `items` change
4. Calls `sceneManager.updateBathroomItems(items)`
5. SceneManager:
   - Uses ModelManager to load GLB model (cached if already loaded)
   - Places model in scene at calculated position
   - Applies initial rotation based on orientation config
6. EventHandlers enables interaction once model is loaded
7. State saved to undo/redo history

---

## Design Persistence

### LocalStorage (Primary Storage)

**Key:** `saved-designs`

**Design Data Structure:**
```typescript
{
  id: number | string,
  name: string,
  timestamp: number,
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number,
  currentFloorTexture?: number,
  currentWallTexture?: number
}
```

**Storage Details:**
- Designs saved to browser localStorage as JSON array
- Limit: 20 most recent designs (arbitrary app limit)
- No authentication required
- Data persists in browser only (not synced across devices)

**LocalStorage Keys:**
- `saved-designs` - Array of saved bathroom designs
- `roomWidth`, `roomHeight` - Last used room dimensions (in meters)
- `design-to-load` - Temporary flag for loading design from MyDesigns → Planner

### Design Flow

**Saving:** (Currently appears to be manual - check implementation details)
- User would need to explicitly save design
- Design serialized to JSON
- Stored in localStorage `saved-designs` array

**Loading:**
1. MyDesigns page reads from localStorage `saved-designs`
2. Displays list of saved designs
3. User clicks design
4. Sets `design-to-load` flag in localStorage
5. Navigates to `/planner`
6. Planner checks for `design-to-load` flag
7. Loads design data and rebuilds scene

---

## Router Structure

**File:** `src/router/index.ts`

```typescript
{
  '/': 'RoomShapeSelector',           // Choose square/rectangular room
  '/room-dimensions': 'RoomDimensions', // Set room size
  '/planner': 'Planner',              // Main 3D planner view
  '/my-designs': 'MyDesigns',         // Saved designs gallery (localStorage)
}
```

**No authentication required** - all routes are publicly accessible.

---

## Product Data Structure

**File:** `src/mocks/productData.ts`

```typescript
{
  id: string,              // Unique product ID
  name: string,            // Product display name
  category: ComponentType, // Category enum
  variants: [{
    sku: string,           // Unique SKU
    name: string,          // Variant name
    path: string,          // GLB model path
    dimensions: {          // In centimeters
      width: number,
      height: number,
      depth: number
    },
    orientation: OrientationConfig,
    movement: MovementConfig,
    spawnHeight: number,   // Initial Y position (cm)
    floorOffset: number,   // Height offset in GLB file (cm)
    price: number
  }]
}
```

**Categories:**
- toilet, sink, bath, shower, radiator, mirror, furniture

---

## Common Patterns

### Adding a New Fixture Type

1. Add GLB model to `public/models/[category]/[SKU].glb`
2. Add product image to `public/assets/productImages/[category]/[SKU].jpg`
3. Define product in `src/mocks/productData.ts` with orientation and movement configs
4. Model will be loaded on-demand when category is first accessed

### Debugging Scene Issues

**Enable Debug Labels:**
```typescript
// In SceneManager.ts
const debugLabelsEnabled = true
```

Shows:
- Wall labels (North, South, East, West)
- Axis indicators (X, Y, Z)

**Use Camera Debug Panel:**
- Camera position/rotation display
- Preset buttons (Overview, Close-up, Corner, Side)

---

## Performance Optimizations

### Implemented

1. **Incremental Scene Updates** - Only modified objects updated
2. **Selective Model Preloading** - Models loaded by category
3. **Direct Add/Delete Methods** - Bypass full scene refresh
4. **Texture Caching** - Prevents redundant GPU uploads
5. **Model Caching** - Clones cached models for scene instances
6. **Vue Reactivity Optimization** - `shallowRef` for Three.js objects

### Potential Improvements

1. Remove unused dependencies
2. Code splitting for large components
3. Image optimization (convert to WebP)
4. Geometry instancing for repeated elements
5. Level of detail (LOD) for complex models

---

## Important Notes

### Critical Considerations

1. **Three.js & Vue Reactivity**
   - Always use `shallowRef` or `markRaw` for Three.js objects
   - Vue's reactive proxies cause performance issues

2. **Unit Conversion**
   - Always convert localStorage meters to cm before calculations
   - Internal unit is cm, display can show both

3. **Design Persistence**
   - **Designs ONLY saved to localStorage** (browser-local storage)
   - No cloud storage or cross-device sync
   - Maximum 20 designs stored
   - Data lost if browser cache is cleared

4. **Measurement System**
   - Real-time IKEA-style visual measurements
   - Height-aware collision detection
   - Smart filtering of relevant measurements

5. **Mobile Controls**
   - Pinch zoom instead of mouse wheel
   - Double-tap to delete selected object
   - Two-finger drag for camera pan

6. **Model Floor Offsets**
   - GLB models may have built-in height offsets
   - `floorOffset` in product config compensates for this

7. **Browser Compatibility**
   - WebGL required for Three.js rendering
   - Modern browsers (Chrome, Firefox, Safari, Edge)
   - Mobile browsers supported (iOS Safari, Chrome Android)

### Common Pitfalls

1. **Forgetting to convert units** - Always use cm internally
2. **Modifying Three.js objects without Vue awareness** - Use Vue's reactivity
3. **Clearing browser cache** - Will delete all saved designs (localStorage limitation)
4. **Incorrect collision bounds** - Verify GLB dimensions with `yarn glb:scan`
5. **Expecting cross-device sync** - LocalStorage is per-browser only

### Performance Tips

1. **Limit object count** - Keep designs under 50 objects for best performance
2. **Use texture caching** - Let TextureManager handle texture reuse
3. **Avoid unnecessary scene updates** - Use incremental updates
4. **Profile with Chrome DevTools** - Monitor frame rate and memory

---

## Analytics & Tracking

### Google Tag Manager (GTM)

This project includes GTM integration with advanced lazy loading to ensure zero impact on 3D rendering performance.

**Implementation Details:**

- **Package**: `@gtm-support/vue-gtm` (v3.1.0)
- **Plugin**: `src/plugins/gtm.ts`
- **Types**: `src/types/gtm.d.ts`
- **Config**: `.env` file (`VITE_GTM_ID`)

**Performance Strategy:**

GTM loads only after ONE of these conditions:
1. User interaction (scroll, mousemove, touchstart, click)
2. Browser idle time (requestIdleCallback with 3s timeout)
3. Fallback timeout (5 seconds)

This ensures GTM never blocks initial page load or 3D rendering.

**Usage:**

```typescript
import { useGtm } from '@gtm-support/vue-gtm'

const gtm = useGtm()

// Track events
if (gtm?.enabled()) {
  gtm.trackEvent({
    event: 'fixture_added',
    category: 'Bathroom Planner',
    action: 'Add Fixture',
    label: `${category} - ${fixtureName}`,
    value: 1,
  })
}
```

**Page View Tracking:**

- Automatic via Vue Router integration
- No manual tracking needed for route changes

**Documentation:**

See `GTM_IMPLEMENTATION.md` for:
- Setup instructions
- Common tracking scenarios
- Testing and debugging
- Best practices

**Development Mode:**

GTM logs all activities to console when `import.meta.env.DEV = true`:
- Loading triggers
- Event tracking
- Debug information

---

## Technology Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **3D Rendering**: Three.js
- **State Management**: Vue Composition API, composables
- **Storage**: Browser localStorage
- **Analytics**: Google Tag Manager (lazy-loaded)
- **Build Tool**: Vite
- **Package Manager**: yarn

---

**Last Updated:** December 2025
**Version:** 1.0 (Origin/Main Branch)
**Status:** Production Ready 🚀
