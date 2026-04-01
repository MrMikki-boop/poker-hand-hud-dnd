/* ===== POKER HAND HUD - UTILITY FUNCTIONS ===== */
/**
 * @fileoverview Utility functions for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, pokerHandGlobalState } from './constants.js';

const Utils = {
    hexToRgba(hex, a = 1) {
        if (!hex) return `rgba(0,0,0,${a})`;
        const p = (s) => parseInt(s, 16);
        let r, g, b;
        
        if (hex.length === 3) { 
            r = p(hex[0]+hex[0]); 
            g = p(hex[1]+hex[1]); 
            b = p(hex[2]+hex[2]); 
        } else { 
            r = p(hex.slice(0,2)); 
            g = p(hex.slice(2,4)); 
            b = p(hex.slice(4,6)); 
        }
        return `rgba(${r},${g},${b},${a})`;
    },
    
    getSettingSafe(key, fallback) {
        try { 
            return game.settings.get(MODULE_ID, key); 
        } catch(e){ 
            return fallback; 
        }
    },
    
    scheduleRebuild(full = false) {
        clearTimeout(pokerHandGlobalState._rebuildTimer);
        pokerHandGlobalState._rebuildTimer = setTimeout(() => {
            if (full) { 
                try { 
                    pokerHandGlobalState.cleanup?.(); 
                } catch(e){} 
                globalThis.displayCardsAsPokerHand(); 
            } else { 
                globalThis.rebuildStylesOnly(); 
                globalThis.updateBookmarkPosition(); 
                globalThis.restartSparkles(); 
            }
        }, 120);
    }
};

export { Utils };
