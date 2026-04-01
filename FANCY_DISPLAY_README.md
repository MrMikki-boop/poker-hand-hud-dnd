# Poker Hand HUD - Fancy Display Integration

## Overview
The poker-hand-hud-dnd module now includes enhanced card visualization features adapted from the orcnog-card-viewer module. This provides professional card display with 3D animations, effects, and improved user experience.

## New Features

### 1. Fancy Card Display
- **3D Card Animations**: Cards flip with realistic 3D transforms
- **Glow Effects**: Customizable border and glow effects
- **Dramatic Reveals**: Cards can be shown face-down then dramatically flipped
- **Mouse Tracking**: Cards respond to mouse movement with perspective effects
- **Sparkle Effects**: Animated sparkles and visual effects

### 2. Enhanced Card Interactions
- **Double-Click**: Double-click any card in the HUD to show fancy display
- **Chat Integration**: Click card images in chat messages to view with fancy display
- **Deck Interface**: Click card images in deck configuration to view with fancy display
- **Share Functionality**: GMs can share card displays with all players

### 3. Customization Settings
- **Enable/Disable**: Turn fancy display on/off per client
- **Card Backs**: Customize default card back images
- **Border Styling**: Adjust border width and colors
- **Glow Effects**: Customize glow colors and intensity
- **Animation Timing**: Control dramatic reveal delays
- **Face Logic**: Choose how cards appear (face-up/down)

## Usage

### Basic Usage
1. **Double-click** any card in your poker hand HUD to view with fancy display
2. **Click** card images in chat messages or deck interfaces
3. Use **macros** to access fancy display functions

### Macro Examples

#### Display a Single Card
```javascript
// Get current hand and display first card
const hand = game.cards.getName("Your Hand Name");
if (hand && hand.cards.contents.length > 0) {
    PokerHandHUD.displayCardFancy(hand.cards.contents[0]);
}
```

#### Draw Cards with Fancy Display
```javascript
// Draw 3 cards from a deck with dramatic reveal
PokerHandHUD.drawCardsFancy("Deck Name", {
    quantity: 3,
    dramaticReveal: true,
    share: true
});
```

#### View Specific Cards
```javascript
// View cards by ID from a deck
PokerHandHUD.viewCardsFancy(["cardId1", "cardId2"], "Deck Name", {
    faceDown: false,
    dramaticReveal: true
});
```

#### Advanced CardDealer Usage
```javascript
// Create a card dealer instance
const dealer = new PokerCardDealer({
    deckName: "Playing Cards",
    discardPileName: "Discard Pile"
});

// Draw cards
await dealer.draw({
    quantity: 2,
    share: false,
    face: "reveal"
});

// View existing cards
await dealer.view(["cardId"], false, false, true, false);
```

## Settings Configuration

### Fancy Display Settings
- **Enable Fancy Card Display**: Master toggle for fancy display features
- **Default Card Back Image**: Image used when cards don't have backs
- **Default Card Border Width**: Border thickness for fancy display
- **Default Card Border Color**: Border color for cards
- **Default Card Glow Color**: Glow effect color
- **Enable Dramatic Reveal on Draw**: Show face-down then flip when drawing
- **Dramatic Reveal Delay**: Milliseconds before flip animation
- **Card Face Logic on Draw**: How to determine face-up/down state
- **Enable Display on Draw**: Auto-show fancy display when cards are drawn
- **Whisper Card Text to DM**: Send card details to GM via chat
- **Players Can Share to All**: Allow non-GMs to share displays
- **Enable Card Icon Click**: Click cards in chat/decks to view

## Technical Details

### File Structure
```
scripts/
├── fancy-display.js     # Main fancy display class
├── card-dealer.js       # Card drawing and viewing system
├── card-system.js       # Enhanced with fancy display methods
└── main.js            # Updated with fancy display initialization

templates/
└── card-viewer.html    # Fancy display template

styles/
└── poker-hand-hud.css # Enhanced with fancy display styles
```

### API Methods

#### CardSystem Methods
- `displayCardFancy(card, options)` - Display single card
- `displayCardsFancy(cards, options)` - Display multiple cards
- `drawCardsFancy(deckName, options)` - Draw from deck
- `viewCardsFancy(cards, deckName, options)` - View existing cards
- `setupFancyDisplayHooks()` - Initialize click handlers

#### Options Object
```javascript
{
    faceDown: false,        // Show card face-down
    dramaticReveal: false,  // Use dramatic flip animation
    share: false,           // Share with all players
    whisper: false,          // Whisper details to GM
    quantity: 1,            // Number of cards to draw
    discardPileName: null   // Target discard pile
}
```

## Compatibility

### Foundry VTT Version
- **Minimum**: v13
- **Tested**: v13.291+

### Browser Support
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

### Dependencies
- **Foundry VTT Core**: Required
- **D&D5e System**: Recommended (for card backs)
- **Socketlib**: Optional (for sharing functionality)

## Troubleshooting

### Common Issues

#### Fancy Display Not Working
1. Check "Enable Fancy Card Display" setting
2. Ensure browser supports CSS 3D transforms
3. Check console for JavaScript errors

#### Cards Not Showing Images
1. Verify card images are accessible
2. Check "Default Card Back Image" setting
3. Ensure image URLs are valid

#### Performance Issues
1. Reduce number of cards displayed simultaneously
2. Disable glow effects in settings
3. Close other resource-intensive applications

#### Sharing Not Working
1. Ensure "Players Can Share to All" is enabled (GM setting)
2. Check if socketlib module is installed
3. Verify user permissions

### Debug Information
Enable browser console to see debug messages:
```
[Poker Hand HUD] Fancy display initialized
[Poker Hand HUD] Card displayed with fancy effects
```

## Migration from Original

If upgrading from the original poker-hand-hud-dnd:
1. All existing settings are preserved
2. New fancy display settings have sensible defaults
3. Existing card functionality remains unchanged
4. No manual migration required

## Credits

Fancy display features adapted from:
- **orcnog-card-viewer** by orcnog
- Enhanced and integrated by Poker Hand HUD Team

## License

This integration maintains the same license as the original poker-hand-hud-dnd module.
