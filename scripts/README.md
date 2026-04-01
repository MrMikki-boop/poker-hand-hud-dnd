# Poker Hand HUD - Refactored Structure

This directory contains the refactored Poker Hand HUD module, split into logical components for better maintainability.

## File Structure

### Core Files
- **`main.js`** - Main entry point and initialization hook
- **`constants.js`** - Global constants and state management
- **`utils.js`** - Utility functions and helpers

### System Components
- **`sound-effects.js`** - Sound effects management system
- **`card-system.js`** - Card management and interaction logic
- **`ui-manager.js`** - UI management and settings integration
- **`state-manager.js`** - State management for collapse/expand functionality
- **`sparkles-system.js`** - Visual effects and sparkle animations
- **`config-system.js`** - Configuration management and settings loading

### Interaction Components
- **`card-interactions.js`** - Card hover, click, and tooltip handlers
- **`main-hud.js`** - Main HUD application logic and rendering

### Configuration
- **`settings-registration.js`** - Foundry VTT settings registration

## Module Dependencies

The module uses ES6 imports/exports and requires Foundry VTT v13+ for proper module support.

## Migration Notes

The original `poker-hand-hud-dnd5e.js` file has been split into:
- 12 separate files for better organization
- Each file handles a specific responsibility
- Legacy compatibility functions are maintained in `main.js`
- All original functionality is preserved

## Usage

The module entry point is now `scripts/main.js` as specified in `module.json`. All original features remain intact:
- Card display in poker hand layout
- Interactive hover effects and tooltips
- Sound effects
- Visual sparkles
- Settings management
- Card usage and chat integration
