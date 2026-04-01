/* ===== POKER HAND HUD - UI MANAGEMENT SYSTEM ===== */
/**
 * @fileoverview UI management system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';

const UIManager = {
    setupSettingsIntegration() {
        Hooks.on("renderSettingsConfig", (app, html) => {
            if (app.id !== "settings-config") return;

            const root = html[0];
            const moduleTab = root.querySelector(`.tab[data-tab="${MODULE_ID}"]`);
            if (!moduleTab) return;

            const COLOR_KEYS = ["hudBgColor", "accentColor", "labelColor", "textColor", "selectedGlowColor"];
            COLOR_KEYS.forEach(k => {
                const inp = moduleTab.querySelector(`input[name="${MODULE_ID}.${k}"]`);
                if (inp) {
                    inp.setAttribute("type", "color");
                    if (!inp.value || !inp.value.startsWith("#")) inp.value = "#ffffff";
                }
            });
        });
    },
    
    updateBookmarkPosition() {
        const percent = Number(Utils.getSettingSafe("bookmarkTopPercent", 60));
        document.documentElement.style.setProperty("--bookmark-top", `${percent}vh`);
    }
};

export { UIManager };
