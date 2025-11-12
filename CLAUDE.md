# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D bathroom planner built with Vue 3, Three.js, and TypeScript. It allows users to design bathrooms by placing fixtures (toilets, sinks, mirrors, radiators, showers, baths) in a 3D room environment with real-time rendering and collision detection.

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

## Architecture Overview

### Core Services

**SceneManager** (`src/services/sceneManager.ts`)
- Manages the Three.js scene, camera, renderer, and post-processing
- Handles room geometry (floor, walls, grids)
- Controls lighting and shadows
- Manages bathroom fixture placement and updates
- Implements wall culling for better visibility
- Uses EffectComposer with OutlinePass for object selection highlighting
- Maintains existingItems map for incremental scene updates

**EventHandlers** (`src/services/eventHandlers.ts`)
- Handles all user interactions (mouse, touch, keyboard)
- Implements drag, rotate, scale, and height adjustment for objects
- Manages raycasting for object selection
- Enforces collision detection and room boundary constraints
- Integrates with measurement system for real-time feedback
- Camera orbit controls with floor collision prevention

**ModelManager** (`src/models/bathroomFixtures.ts`)
- Singleton pattern for GLB model loading and caching
- Supports selective preloading by category (toilets, sinks, mirrors, etc.)
- Maintains loading promises to prevent duplicate requests
- Provides callbacks when specific models finish loading

### Movement & Orientation System

The app has a sophisticated object placement system controlled by configurations in `src/constants/models.ts`:

**OrientationConfig Types:**
- `face_into_room`: Objects face inward (sinks, toilets, mirrors)
- `flush_with_wall`: Objects flush with wall surface (doors, windows)
- `custom`: Custom rotation logic

**MovementConfig:**
- `snapToWall`: Whether object snaps to walls
- `cornerInstallOnly`: If true, object can only be placed in room corners
- `allowVerticalMovement`: Enable Ctrl+drag height adjustment
- `allowFreeRotation`: Enable right-click rotation
- `minHeight`/`maxHeight`: Vertical movement limits

Wall rotations are automatically calculated based on which wall an object is placed on (north/south/east/west).

### Constraint System (`src/utils/constraints.ts`)

Handles object placement validation:
- `wouldCollideWithExistingOrWalls()`: Checks collisions with other objects and room boundaries
- `findFreeWallPosition()`: Finds available wall position for new objects
- `constrainToWalls()`: Snaps objects to nearest wall
- `constrainToCorner()`: Places objects in room corners
- Uses actual model dimensions from GLB files for accurate collision detection

### State Management

**Undo/Redo** (`src/composables/useUndoRedo.ts`)
- Generic composable with history stack (max 50 states)
- Stores complete state: items, room dimensions, textures
- Deep clones state to prevent reference issues
- Provides `BathroomPlannerState` type for app-specific usage

### Unit System

The entire application uses **centimeters** as the internal unit. Key constants in `src/constants/dimensions.ts`:
- Default room: 300cm × 250cm (3m × 2.5m)
- Wall height: 250cm
- Room size range: 100cm - 600cm
- Grid spacing: 15cm

localStorage stores dimensions in meters for backward compatibility, but converts to/from cm internally.

### Data Flow

1. User adds item via Sidebar → `addItem()` in Planner.vue
2. `findFreeWallPosition()` calculates spawn position based on orientation config
3. Item added to reactive `items` array with product data (SKU, model path, dimensions)
4. Watcher detects change → calls `sceneManager.updateBathroomItems()`
5. SceneManager uses ModelManager to load GLB → places in scene
6. EventHandlers enable interaction once model is loaded
7. State saved to undo/redo history

### Product Data Structure

Products are defined in `src/mocks/productData.ts` with variants:
```typescript
{
  id: string,
  name: string,
  category: ComponentType,
  variants: [{
    sku: string,
    name: string,
    path: string,  // GLB model path
    dimensions: { width, height, depth },  // in cm
    orientation: OrientationConfig,
    movement: MovementConfig,
    spawnHeight: number,  // initial Y position
    floorOffset: number,  // height offset in GLB file
    price: number
  }]
}
```

### Performance Optimizations

- **Incremental Scene Updates**: Only modified objects are updated in Three.js scene
- **Selective Model Preloading**: Models loaded by category, not all at once
- **Direct Add/Delete**: `addSingleItem()` and `removeSingleItem()` bypass full scene refresh
- **shallowRef** for Three.js objects to prevent Vue reactivity overhead
- Object pooling service exists but currently unused (`src/services/ObjectPool.ts`)

### Router Structure

- `/` - RoomShapeSelector (choose square or rectangular room)
- `/room-dimensions` - RoomDimensions (set room size)
- `/planner` - Main 3D planner view
- `/my-designs` - Saved designs gallery (localStorage)

### Design Persistence

Designs saved to localStorage as JSON:
- Key: `saved-designs`
- Contains: items array, room dimensions, textures, timestamp
- Limit: 20 most recent designs
- MyDesigns page loads design by setting `design-to-load` flag

## Common Patterns

### Adding a New Fixture Type

1. Add GLB model to `public/models/[category]/`
2. Add product images to `public/assets/productImages/[category]/`
3. Define product in `src/mocks/productData.ts` with orientation and movement configs
4. Model will be loaded on-demand when category is first accessed

### Debugging

Set `debugLabelsEnabled: true` in SceneManager to show:
- Wall labels (North, South, East, West)
- Axis indicators
- Controlled via WallLabelsDebug and AxisIndicatorsDebug utilities

### Collision Detection

When dragging objects:
1. `onMouseMove` calculates new position
2. `wouldCollideWithExistingOrWalls()` validates position
3. If collision detected, highlight turns red (outline color changes)
4. On mouse up, position is either committed or snaps back to `originalDragPosition`

## Important Notes

- Three.js objects should use `shallowRef` or `markRaw` to avoid Vue reactivity
- Always convert localStorage meters to cm before using in calculations
- Wall culling can be toggled to see through walls (camera-based frustum culling)
- Measurement system provides real-time distance measurements between objects
- Mobile touch controls differ from desktop (pinch zoom, double-tap delete)
