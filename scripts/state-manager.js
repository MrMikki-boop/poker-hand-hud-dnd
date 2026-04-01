/* ===== POKER HAND HUD - STATE MANAGEMENT SYSTEM ===== */
/**
 * @fileoverview State management system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, ExpandedCardManager } from './constants.js';

const StateManager = {
    getGlobalCollapsed() {
        try { 
            return JSON.parse(localStorage.getItem(`${MODULE_ID}_collapsed`) || "false"); 
        } catch(e){ 
            return false; 
        }
    },

    setGlobalCollapsed(v) {
        try { 
            localStorage.setItem(`${MODULE_ID}_collapsed`, JSON.stringify(!!v)); 
        } catch(e){}
    },

    applyGlobalCollapse() {
        const collapsed = this.getGlobalCollapsed();
        const hand = document.getElementById("poker-hand-container");
        
        if (hand) {
            hand.classList.toggle("collapsed", collapsed);
            
            // Явно управляем display стилями для надежности
            if (collapsed) {
                hand.style.display = "none";
                hand.style.bottom = '-9999px';
                hand.style.pointerEvents = 'none';
            } else {
                hand.style.display = "flex";
                hand.style.bottom = '20px';
                hand.style.pointerEvents = 'auto';
            }
        }
        
        // Reset expanded card state when collapsing/expanding HUD
        ExpandedCardManager.reset();
        
        if (collapsed) {
            if (typeof deckSleep === 'function') deckSleep(); 
        }
        else {
            if (typeof deckWake === 'function') setTimeout(deckWake, 150);
        }
    }
};

export { StateManager };
