/* ===== POKER HAND HUD - MAIN INITIALIZATION ===== */
/**
 * @fileoverview Main entry point for the Poker Hand HUD module
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import { PokerHandHUD } from './main-hud.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';
import { CardSystem } from './card-system.js';
import { SoundEffects } from './sound-effects.js';
import FancyDisplay from './fancy-display.js';
import CardDealer from './card-dealer.js';

// Initialize socket system
let CardSocket = {
    executeForEveryone: () => {
        console.warn(`[${MODULE_ID}] socketlib is required for sharing cards. Please install and enable the socketlib module.`);
    },
    executeForOthers: () => {
        console.warn(`[${MODULE_ID}] socketlib is required for sharing cards. Please install and enable the socketlib module.`);
    }
};

// Setup socketlib when ready
Hooks.once("socketlib.ready", () => {
    console.log(`[${MODULE_ID}] Socketlib ready hook fired!`);
    
    if (typeof socketlib !== 'undefined') {
        console.log(`[${MODULE_ID}] Socketlib is available, registering module...`);
        CardSocket = socketlib.registerModule(MODULE_ID);
        
        CardSocket.register("ShareCard", (data) => {
            console.log(`[${MODULE_ID}] ShareCard hook fired for user ${game.user.name}`);
            
            // Check if this message was sent by the current user
            const senderId = data.senderId || data.userId;
            if (senderId && senderId === game.user.id) {
                console.log(`[${MODULE_ID}] Ignoring own card display - sent by ${game.user.name}`);
                return;
            }
            
            console.log(`[${MODULE_ID}] Displaying card sent by another user for ${game.user.name}`);
            new FancyDisplay({
                imgArray: data.imgArray,
                faceDown: data.faceDown,
                borderColor: data.borderColor,
                borderWidth: data.borderWidth,
                glowColor: data.glowColor
            }).render(false, data.dramaticReveal);
        });
        
        console.log(`[${MODULE_ID}] Socketlib initialized successfully`);
    } else {
        console.warn(`[${MODULE_ID}] Socketlib not available even though ready hook fired`);
    }
});

// Also try to register in ready hook as fallback
Hooks.on("ready", () => {
    if (typeof socketlib !== 'undefined') {
        console.log(`[${MODULE_ID}] Attempting socketlib registration in ready hook...`);
        try {
            const freshSocket = socketlib.registerModule(MODULE_ID);
            
            freshSocket.register("ShareCard", (data) => {
                console.log(`[${MODULE_ID}] ShareCard hook fired for user ${game.user.name}`);
                
                // Check if this message was sent by the current user
                const senderId = data.senderId || data.userId;
                if (senderId && senderId === game.user.id) {
                    console.log(`[${MODULE_ID}] Ignoring own card display - sent by ${game.user.name}`);
                    return;
                }
                
                console.log(`[${MODULE_ID}] Displaying card sent by another user for ${game.user.name}`);
                new FancyDisplay({
                    imgArray: data.imgArray,
                    faceDown: data.faceDown,
                    borderColor: data.borderColor,
                    borderWidth: data.borderWidth,
                    glowColor: data.glowColor
                }).render(false, data.dramaticReveal);
            });
            
            // Update both global references
            CardSocket = freshSocket;
            globalThis.CardSocket = freshSocket;
            window.CardSocket = freshSocket;
            
            console.log(`[${MODULE_ID}] Socketlib registered via ready hook fallback`);
            
            // Export CardSocket to global scope after successful registration
            globalThis.CardSocket = freshSocket;
            window.CardSocket = freshSocket;
            console.log(`[${MODULE_ID}] CardSocket exported to global scope:`, typeof freshSocket, freshSocket.executeForOthers ? 'ready' : 'not ready');
        } catch (e) {
            console.error(`[${MODULE_ID}] Failed to register socketlib in ready hook:`, e);
        }
    }
});

// Initialize sound effects
const SFX = new SoundEffects();

// Import settings registration
import './settings-registration.js';

// Legacy compatibility functions
async function useCardAndChat(card, hand, evt) {
    return CardSystem.useCardAndChat(card, hand, evt);
}

function selectCardHand() {
    return CardSystem.selectCardHand();
}

function updateBookmarkPosition() {
    return UIManager.updateBookmarkPosition();
}

function getGlobalCollapsed() {
    return StateManager.getGlobalCollapsed();
}

function setGlobalCollapsed(v) {
    return StateManager.setGlobalCollapsed(v);
}

function applyGlobalCollapse() {
    return StateManager.applyGlobalCollapse();
}

function setupSparkles(container) {
    return SparklesSystem.setup(container);
}

function restartSparkles() {
    return SparklesSystem.restart();
}

function getSparkleRates() {
    return SparklesSystem.getRates();
}

function hexToRgba(hex, a = 1) {
    return Utils.hexToRgba(hex, a);
}

// Legacy compatibility function
async function displayCardsAsPokerHand() {
    return PokerHandHUD.init();
}

/* —— Utility Functions —— */
function deckSleep() {
    document.querySelectorAll(".poker-card").forEach(card => {
        card.classList.add("face-down");
    });
}

function deckWake() {
    document.querySelectorAll(".poker-card").forEach(card => {
        card.classList.remove("face-down");
    });
}

function rebuildStylesOnly() {
    // This would rebuild CSS styles without recreating entire UI
    // For now, we'll trigger a full rebuild
    Utils.scheduleRebuild(true);
}

/* —— Initialization Hook —— */
Hooks.on("ready", async () => {
    try {
        if (!Utils.getSettingSafe("enabled", true)) return;
        if (Utils.getSettingSafe("clientOptOut", false)) return;
        if (!canvas?.ready) await new Promise(res => Hooks.once("canvasReady", res));
        
        // Check if socketlib is available and not initialized
        if (typeof socketlib !== 'undefined' && CardSocket.executeForOthers.toString().includes('socketlib is required')) {
            console.log(`[${MODULE_ID}] Socketlib available but not initialized, doing fallback initialization...`);
            try {
                CardSocket = socketlib.registerModule(MODULE_ID);
                
                CardSocket.register("ShareCard", (data) => {
                    console.log(`[${MODULE_ID}] ShareCard hook fired for user ${game.user.name}`);
                    new FancyDisplay({
                        imgArray: data.imgArray,
                        faceDown: data.faceDown,
                        borderColor: data.borderColor,
                        borderWidth: data.borderWidth,
                        glowColor: data.glowColor
                    }).render(false, data.dramaticReveal);
                });
                
                console.log(`[${MODULE_ID}] Socketlib initialized via fallback`);
            } catch (e) {
                console.error(`[${MODULE_ID}] Fallback socketlib initialization failed:`, e);
            }
        } else if (typeof socketlib !== 'undefined') {
            console.log(`[${MODULE_ID}] Socketlib already initialized`);
        } else {
            console.warn(`[${MODULE_ID}] Socketlib not available`);
        }
        
        // Initialize systems
        HandAssignmentSystem.init();
        PokerHandHUD.init();
        CardSystem.setupFancyDisplayHooks();
        
        // Test socket functionality
        if (typeof socketlib !== 'undefined') {
            console.log(`[${MODULE_ID}] Testing socket functionality...`);
            const testSocket = globalThis.CardSocket;
            if (testSocket && testSocket.executeForOthers && !testSocket.executeForOthers.toString().includes('socketlib is required')) {
                console.log(`[${MODULE_ID}] Socket is ready for sharing!`);
            } else {
                console.warn(`[${MODULE_ID}] Socket not ready for sharing, method:`, testSocket?.executeForOthers?.toString().substring(0, 50));
            }
        }
    } catch (e) { console.error(`[${MODULE_ID}] Initialization failed:`, e); }
});

// Export for global access if needed
globalThis.PokerHandHUD = PokerHandHUD;
// CardSocket will be exported after socketlib initialization
// globalThis.CardSocket = CardSocket; // Export socket for use in fancy-display.js
// window.CardSocket = CardSocket; // Also export to window for compatibility
// console.log(`[${MODULE_ID}] CardSocket exported to global scope:`, typeof CardSocket, CardSocket.executeForOthers ? 'ready' : 'not ready');

// Export fancy display functions for macro access
globalThis.PokerHandHUD = {
    ...PokerHandHUD,
    // Fancy display methods
    displayCardFancy: CardSystem.displayCardFancy.bind(CardSystem),
    displayCardsFancy: CardSystem.displayCardsFancy.bind(CardSystem),
    drawCardsFancy: CardSystem.drawCardsFancy.bind(CardSystem),
    viewCardsFancy: CardSystem.viewCardsFancy.bind(CardSystem),
    // Legacy methods
    init: PokerHandHUD.init.bind(PokerHandHUD)
};

// Export CardDealer for advanced usage
globalThis.PokerCardDealer = CardDealer;

// Export legacy functions for global access
globalThis.displayCardsAsPokerHand = displayCardsAsPokerHand;
globalThis.useCardAndChat = useCardAndChat;
globalThis.selectCardHand = selectCardHand;
globalThis.updateBookmarkPosition = updateBookmarkPosition;
globalThis.getGlobalCollapsed = getGlobalCollapsed;
globalThis.setGlobalCollapsed = setGlobalCollapsed;
globalThis.applyGlobalCollapse = applyGlobalCollapse;
globalThis.setupSparkles = setupSparkles;
globalThis.restartSparkles = restartSparkles;
globalThis.getSparkleRates = getSparkleRates;
globalThis.hexToRgba = hexToRgba;
globalThis.deckSleep = deckSleep;
globalThis.deckWake = deckWake;
globalThis.rebuildStylesOnly = rebuildStylesOnly;
