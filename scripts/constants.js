/* ===== POKER HAND HUD - CONSTANTS & GLOBAL STATE ===== */
/**
 * @fileoverview Constants and global state for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

// ===== GLOBAL CONSTANTS =====
const MODULE_ID = "poker-hand-hud-dnd";

const CONSTANTS = {
    DEFAULT_CARD_WIDTH: 220,
    DEFAULT_CARD_HEIGHT: 330,
    MAX_VISIBLE_CARDS: 7,
    DEFAULT_SPACING: 105,
    DEFAULT_ARC_HEIGHT: 5,
    DEFAULT_ROTATION: 5
};

// ===== FANCY DISPLAY CONSTANTS =====
const FANCY_DISPLAY_CONSTANTS = {
    MODULE_TITLE: "Poker Hand HUD - Fancy Display",
    MODULE_L18N_PREFIX: "POKER_HAND_HUD",
    MODULE_SHORT: "phh",
    MODULE_DEBUG_TAG: [
        `%c${MODULE_ID}`,
        `color: #4a90e2; font-weight: bold;`,
        `|`,
    ]
};

// ===== GLOBAL STATE =====
const pokerHandGlobalState = {
    hand: null,
    config: null,
    cleanup: null,
    _cardHooks: null,
    sparkleInterval: null,
    _sparkleHandlers: null,
    confirmButton: null,
    cleanupTooltip: null,
    cancelRetractTimer: null,
    startRetractTimer: null
};

// ===== USER-SPECIFIC STATE MANAGEMENT =====
class UserStateManager {
    constructor() {
        this.userStates = new Map(); // userId -> state
    }
    
    getUserState(userId = game.user?.id) {
        if (!this.userStates.has(userId)) {
            this.userStates.set(userId, {
                hand: null,
                config: null,
                _cardHooks: null,
                lastUpdate: Date.now()
            });
        }
        return this.userStates.get(userId);
    }
    
    setUserState(userId, state) {
        this.userStates.set(userId, {
            ...state,
            lastUpdate: Date.now()
        });
    }
    
    clearUserState(userId) {
        this.userStates.delete(userId);
    }
    
    // Get current user's state (backward compatibility)
    getCurrentUserState() {
        return this.getUserState();
    }
    
    // Update current user's hand
    updateCurrentUserHand(hand) {
        const state = this.getCurrentUserState();
        state.hand = hand;
        state.lastUpdate = Date.now();
    }
    
    // Update current user's config
    updateCurrentUserConfig(config) {
        const state = this.getCurrentUserState();
        state.config = config;
        state.lastUpdate = Date.now();
    }
}

const userStateManager = new UserStateManager();

// Global state for expanded card
let expandedCard = null;

// Functions to manage expanded card state
export const ExpandedCardManager = {
    get() { return expandedCard; },
    set(card) { expandedCard = card; },
    reset() { expandedCard = null; }
};

export { MODULE_ID, CONSTANTS, FANCY_DISPLAY_CONSTANTS, pokerHandGlobalState, userStateManager };
