/* ===== POKER HAND HUD - CONFIGURATION SYSTEM ===== */
/**
 * @fileoverview Configuration system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';
import { StateManager } from './state-manager.js';

const ConfigSystem = {
    createDefaultConfig() {
        return {
            tooltip: { enabled: true, width: "340px", backgroundColor: "rgba(10,5,0,0.92)", borderColor: "#c0a060", textColor: "#f0e6d2", padding: "12px", offsetY: 60, maxHeight: "60vh" },
            cardVisuals: { width: CONSTANTS.DEFAULT_CARD_WIDTH, height: CONSTANTS.DEFAULT_CARD_HEIGHT, baseImage: "", artMaskImage: "", backImage: "", artBackgroundColor: "rgba(0,0,0,0.5)", artYOffset: 0, nameStyle: { arc: 10, fontSize: '12px', weight: 700, stroke: '0.3px', letter: '0.6px' } },
            handLayout: { maxVisibleCards: CONSTANTS.MAX_VISIBLE_CARDS, spacing: CONSTANTS.DEFAULT_SPACING, arcHeight: CONSTANTS.DEFAULT_ARC_HEIGHT, rotationFactor: CONSTANTS.DEFAULT_ROTATION },
            animations: { entranceDelay: 100 },
            hudLayout: { hudMaxWidth: '980px', hudHeight: '120px', labelFontSize: '12px', valueFontSize: '14px', buttonFontSize: '10px', sidePanelWidth: '90px', rowGap: '6px' },
            interactiveHover: { enabled: true, liftOnHover: 12, tiltMax: 6, scaleOnHover: 1.08, shadowBlur: 20, shadowSpread: 8 },
            cardBack: { showFaceDown: false, customUrl: "", useSystemDefault: true },
            bookmark: { enabled: true, position: "left", verticalAlign: "center", offsetPercent: 60, width: "40px", height: "60px", borderRadius: "8px", icon: "fas fa-hand", fontSize: "20px", bgColor: "rgba(20,15,10,0.85)", hoverBgColor: "rgba(192,160,96,0.7)", textColor: "#f0e6d2", hoverTextColor: "#ffffff", borderColor: "#c0a060", borderWidth: "2px", hoverBorderWidth: "2px", hoverBorderColor: "#ffffff", hoverGlowColor: "rgba(255,255,255,0.6)" },
            colors: { hudBg: "rgba(20,15,10,0.85)", accent: "#c0a060", label: "#d4c5a0", text: "#f0e6d2", selectedGlow: "rgba(255,200,100,0.6)" },
            collapse: { enabled: true, collapsed: false, sleepHudOnly: false, retractDelay: 1000, autoCollapse: false, autoCollapseDelay: 5000 },
            sparkles: { enabled: true, style: "cards", intensity: "high" },
            sfx: { enabled: true, volume: 0.85, hoverUrl: "", clickUrl: "", useUrl: "" }
        };
    },
    
    loadSettings(config) {
        // Load colors
        config.colors.hudBg = Utils.getSettingSafe("hudBgColor", config.colors.hudBg);
        config.colors.accent = Utils.getSettingSafe("accentColor", config.colors.accent);
        config.colors.label = Utils.getSettingSafe("labelColor", config.colors.label);
        config.colors.text = Utils.getSettingSafe("textColor", config.colors.text);
        config.colors.selectedGlow = Utils.getSettingSafe("selectedGlowColor", config.colors.selectedGlow);
        config.cardBack.customUrl = Utils.getSettingSafe("clientBackCustomUrl", config.cardBack.customUrl);
        
        // Load collapse settings
        config.collapse.enabled = Utils.getSettingSafe("collapseEnabled", config.collapse.enabled);
        config.collapse.collapsed = StateManager.getGlobalCollapsed();
        config.collapse.sleepHudOnly = Utils.getSettingSafe("sleepHudOnly", config.collapse.sleepHudOnly);
        config.collapse.retractDelay = Number(Utils.getSettingSafe("handRetractDelay", config.collapse.retractDelay));
        
        // Load interactive settings
        config.interactiveHover = {};
        config.interactiveHover.scale = Number(Utils.getSettingSafe("hoverScale", 1.35));
        config.interactiveHover.lift = Number(Utils.getSettingSafe("hoverLift", -120));
        config.interactiveHover.tiltMax = Number(Utils.getSettingSafe("tiltMax", 6));
        config.interactiveHover.disableTilt = !!Utils.getSettingSafe("disableTilt", false);
        config.cardVisuals.disableGradientMask = !!Utils.getSettingSafe("disableGradientMask", false);
        config.cardVisuals.alwaysShowShadow = !!Utils.getSettingSafe("alwaysShowShadow", false);
        config.handLayout.maxVisibleCards = Number(Utils.getSettingSafe("handMaxVisible", 7));
        config.handLayout.spacing = Number(Utils.getSettingSafe("handSpacing", 105));
        config.handLayout.arcHeight = Number(Utils.getSettingSafe("handArc", 5)) || CONSTANTS.DEFAULT_ARC_HEIGHT;
        config.handLayout.rotationFactor = Number(Utils.getSettingSafe("handRotation", 5));
        config.bookmark.offsetPercent = Number(Utils.getSettingSafe("bookmarkTopPercent", 60));
        config.collapse.sleepHudOnly = !!Utils.getSettingSafe("sleepHudOnly", false);
        config.sparkles.style = Utils.getSettingSafe("sparkleStyle", "cards");
        config.sparkles.intensity = Utils.getSettingSafe("sparkleIntensity", "high");
        config.sfx.enabled = Utils.getSettingSafe("sfxEnabled", true);
        config.sfx.volume = Utils.getSettingSafe("sfxVolume", 0.85);
        config.sfx.hoverUrl = Utils.getSettingSafe("sfxHoverUrl", "");
        config.sfx.clickUrl = Utils.getSettingSafe("sfxClickUrl", "");
        config.sfx.useUrl = Utils.getSettingSafe("sfxUseUrl", "");
        
        return config;
    }
};

export { ConfigSystem };
