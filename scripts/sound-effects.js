/* ===== POKER HAND HUD - SOUND EFFECTS SYSTEM ===== */
/**
 * @fileoverview Sound effects management for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';

/**
 * Управляет звуковыми эффектами для HUD
 * @class SoundEffects
 */
class SoundEffects {
    constructor() {
        /** @type {{hover: Audio|null, click: Audio|null, use: Audio|null}} */
        this.sounds = { hover: null, click: null, use: null };
        /** @type {boolean} */
        this.enabled = false;
        /** @type {number} */
        this.volume = 0.85;
    }
    
    /**
     * Загружает звуковые файлы из настроек
     */
    load() {
        try {
            this.enabled = Utils.getSettingSafe("sfxEnabled", true);
            this.volume = Utils.getSettingSafe("sfxVolume", 0.85);
            
            const hoverUrl = Utils.getSettingSafe("sfxHoverUrl", "");
            const clickUrl = Utils.getSettingSafe("sfxClickUrl", "");
            const useUrl = Utils.getSettingSafe("sfxUseUrl", "");
            
            // Filter out invalid placeholder URLs
            if (hoverUrl && !hoverUrl.includes("path/to/file.ext")) this.sounds.hover = new Audio(hoverUrl);
            if (clickUrl && !clickUrl.includes("path/to/file.ext")) this.sounds.click = new Audio(clickUrl);
            if (useUrl && !useUrl.includes("path/to/file.ext")) this.sounds.use = new Audio(useUrl);
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to load sound effects:`, error);
        }
    }
    
    /**
     * Воспроизводит звуковой эффект
     * @param {Audio|null} sound - Звуковой файл для воспроизведения
     */
    play(sound) {
        if (!this.enabled || !sound) return;
        try {
            sound.currentTime = 0;
            sound.volume = this.volume;
            sound.play().catch(() => {});
        } catch (e) {
            console.warn(`[${MODULE_ID}] SFX play error`, e);
        }
    }
}

const SFX = new SoundEffects();

export { SoundEffects, SFX };
