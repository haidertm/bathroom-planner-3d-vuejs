# Multi-Select Feature for Bathroom Planner

## Overview
The multi-select feature allows users to select and move multiple bathroom items simultaneously, making it easier to rearrange layouts without moving items one by one.

## Features

### 1. **Toggle Button**
- Located in the bottom-right corner of the planner screen
- Shows current state (Multi-Select ON/OFF)
- Displays a badge with the count of selected items
- Touch-friendly design for mobile and tablet devices

### 2. **Selection Mode**
When multi-select mode is **enabled**:
- Click/tap on items to add them to the selection
- Click/tap again to remove them from the selection
- Selected items are highlighted with an outline
- The badge shows the total number of selected items

When multi-select mode is **disabled**:
- Normal single-item selection behavior
- Clicking an item selects it (and deselects others)
- Full access to variant configuration and other item-specific features

### 3. **Bulk Move (Planned)**
Once items are selected in multi-select mode, you can:
- Move all selected items together
- Maintain relative positioning between items
- Collision detection prevents overlapping with non-selected items
- Items stay within room boundaries

## Usage Instructions

### Desktop
1. Click the **Multi-Select** button in the bottom-right corner
2. Click on items you want to select (they will be highlighted)
3. Click selected items again to deselect them
4. Click the button again to exit multi-select mode

### Mobile/Tablet
1. Tap the **Multi-Select** button in the bottom-right corner
2. Tap on items you want to select (they will be highlighted)
3. Tap selected items again to deselect them
4. Tap the button again to exit multi-select mode

## Technical Implementation

### Components
- **MultiSelectToggle.vue**: Toggle button component with visual feedback
- **EventHandlers.ts**: Core multi-select logic and object management
- **Planner.vue**: Integration and state management

### Key Methods
- `setMultiSelectMode(enabled)`: Enable/disable multi-select mode
- `toggleMultiSelection(object)`: Add/remove object from selection
- `getMultiSelectedIds()`: Get array of selected item IDs
- `clearMultiSelection()`: Clear all selections
- `moveMultiSelectedObjects(delta)`: Move all selected objects (future feature)

### State Management
- `multiSelectEnabled`: Boolean flag for mode state
- `multiSelectedCount`: Number of currently selected items
- `selectedObjects`: Set of selected Three.js objects

## Future Enhancements

1. **Drag to Move Multiple Items**
   - Drag any selected item to move all selected items together
   - Maintain relative positioning

2. **Keyboard Shortcuts**
   - Ctrl/Cmd + Click to add to selection
   - Shift + Click for range selection
   - Ctrl/Cmd + A to select all

3. **Selection Box**
   - Click and drag to draw a selection box
   - Select all items within the box

4. **Bulk Operations**
   - Delete multiple items at once
   - Apply same variant to multiple items
   - Rotate multiple items together

5. **Visual Enhancements**
   - Different outline color for multi-selected items
   - Selection count overlay on items
   - Preview of bulk move operation

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Touch events supported for tablets and touch screens

## Notes
- Multi-select mode disables variant configuration to prevent conflicts
- Collision detection ensures items don't overlap during bulk moves
- Items maintain their individual properties (rotation, scale, etc.)
- Undo/redo works with multi-select operations
