/* ===== POKER HAND HUD - CARD INTERACTIONS ===== */
/**
 * @fileoverview Card interaction handlers for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, pokerHandGlobalState, ExpandedCardManager } from './constants.js';
import { Utils } from './utils.js';
import { StateManager } from './state-manager.js';
import { SFX } from './sound-effects.js';
import { CardSystem } from './card-system.js';

function smartPlaceTooltip(cardElement, card) {
    // Нет карты — нет тултипа
    if (!card) return;

    // ── Закрытая карта: скрываем личность ──────────────────────────────
    const isFaceDown = card.face === null || cardElement.dataset.isFaceDown === "1";

    // Убираем предыдущий тултип
    const existing = document.querySelector('[data-poker-tooltip]');
    if (existing) existing.remove();

    // Если нечего показывать (открытая карта без описания) — выходим
    if (!isFaceDown && !card.description) return;

    const cardRect = cardElement.getBoundingClientRect();
    const tooltip  = document.createElement("div");
    tooltip.setAttribute('data-poker-tooltip', 'true');
    tooltip.style.cssText = `
        position: fixed;
        background: rgba(10,5,0,0.92);
        border: 2px solid #c0a060;
        color: #f0e6d2;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: "Signika", sans-serif;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        max-width: 260px;
        opacity: 0;
        transition: opacity 0.2s ease;
    `;

    if (isFaceDown) {
        // Закрытая карта — только нейтральное сообщение
        tooltip.innerHTML = `
            <div style="
                display:flex; align-items:center; gap:8px;
                color:rgba(255,215,0,0.6); font-size:13px;
            ">
                <span style="font-size:22px;">🙈</span>
                <span style="font-style:italic;">Закрытая карта<br>
                    <span style="font-size:10px; color:#8a7a65;">
                        Раскроется при розыгрыше
                    </span>
                </span>
            </div>`;
    } else {
        // Открытая карта с описанием
        tooltip.innerHTML = `
            <div style="font-weight:600; margin-bottom:4px;">${card.name || 'Без названия'}</div>
            <div>${card.description}</div>`;
    }

    document.body.appendChild(tooltip);

    // Позиционирование
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = cardRect.left + (cardRect.width - tooltipRect.width) / 2;
    let top  = cardRect.top - tooltipRect.height - 10;

    left = Math.max(10, Math.min(left, window.innerWidth  - tooltipRect.width  - 10));
    top  = Math.max(10, Math.min(top,  window.innerHeight - tooltipRect.height - 10));

    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${top}px`;

    requestAnimationFrame(() => { tooltip.style.opacity = "1"; });

    const removeTooltip = () => {
        tooltip.style.opacity = "0";
        setTimeout(() => tooltip.remove(), 200);
        cardElement.removeEventListener("mouseleave", removeTooltip);
    };
    cardElement.addEventListener("mouseleave", removeTooltip);
    setTimeout(removeTooltip, 4000);
}

function attachHoverEvents(cardEl, card) {
    // Debug: Log the card data
    console.log(`[${MODULE_ID}] attachHoverEvents called for card:`, card?.name, card?.id);
    
    const base = (cx, cy, rot) => `translateX(${cx}px) translateY(${cy}px) rotateZ(${rot}deg)`;
    const toNum = (v) => Number.parseFloat(v) || 0;
    let raf = null;
    
    const onMouseMove = (ev) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            const rect = cardEl.getBoundingClientRect();
            const px = (ev.clientX - rect.left) / rect.width;
            const py = (ev.clientY - rect.top) / rect.height;
            const dx = (px - 0.5) * 2;
            const dy = (py - 0.5) * 2;
            
            const config = pokerHandGlobalState.config;
            const tilt = config.interactiveHover?.disableTilt ? 0 : (config.interactiveHover?.tiltMax || 6);
            const x = toNum(cardEl.dataset.xOffset), y = toNum(cardEl.dataset.yOffset), r = toNum(cardEl.dataset.rotation);
            const rx = -(dy * tilt);
            const ry = dx * tilt;
            
            // Check if this card is expanded
            if (ExpandedCardManager.get() === cardEl) {
                // Keep the expanded position with lift
                const lift = config.interactiveHover?.lift || -120;
                cardEl.style.transform = `perspective(1200px) translateX(${x}px) translateY(${y + lift}px) rotateZ(${r}deg) rotateX(${rx}deg) rotateY(${ry}deg)`;
            } else {
                // Only tilt effects if not disabled, no lifting for non-expanded cards
                if (config.interactiveHover?.disableTilt) {
                    cardEl.style.transform = `perspective(1200px) ${base(x, y, r)}`;
                } else {
                    cardEl.style.transform = `perspective(1200px) ${base(x, y, r)} rotateX(${rx}deg) rotateY(${ry}deg)`;
                }
            }
        });
    };

    cardEl.addEventListener("mouseenter", () => {
        if (StateManager.getGlobalCollapsed()) return;
        SFX.play(SFX.sounds.hover);
        
        const x = toNum(cardEl.dataset.xOffset), y = toNum(cardEl.dataset.yOffset), r = toNum(cardEl.dataset.rotation);
        
        // Only apply visual effects, no lifting
        const currentConfig = pokerHandGlobalState.config;
        const shadowFilter = currentConfig.cardVisuals?.alwaysShowShadow 
            ? "drop-shadow(0 10px 18px rgba(0,0,0,0.55)) brightness(1.04)"
            : "drop-shadow(0 10px 18px rgba(0,0,0,0.55)) brightness(1.04)";
        cardEl.style.filter = shadowFilter;
        cardEl.style.transform = `perspective(1200px) ${base(x, y, r)}`;
        
        // Wake up deck on hover
        const container = document.getElementById("poker-hand-container");
        if (container) {
            container.querySelectorAll(".poker-card").forEach(c => c.classList.remove("face-down"));
        }
        
        smartPlaceTooltip(cardEl, card);
        cardEl.addEventListener("mousemove", onMouseMove);
    });
    
    cardEl.addEventListener("mousemove", () => { 
        const config = pokerHandGlobalState.config;
        if (config.tooltip?.enabled) {
            // Get card data safely
            const cardData = pokerHandGlobalState.hand?.cards?.get(cardEl.dataset.cardId) || 
                           pokerHandGlobalState.hand?.cards?.find(c => c.id === cardEl.dataset.cardId);
            if (cardData) smartPlaceTooltip(cardEl, cardData);
        }
    });
    
    cardEl.addEventListener("mouseleave", () => {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
        }
        const x = toNum(cardEl.dataset.xOffset), y = toNum(cardEl.dataset.yOffset), r = toNum(cardEl.dataset.rotation);
        
        // Only reset if this card is not the expanded one
        if (ExpandedCardManager.get() !== cardEl) {
            cardEl.style.zIndex = cardEl.dataset.originalZIndex || 0;
            cardEl.style.transform = `${base(x, y, r)}`;
            cardEl.style.filter = "";
        }
        
        // Hide tooltip
        const tooltip = document.querySelector('[data-poker-tooltip]');
        if (tooltip) tooltip.style.opacity = "0";
        
        cardEl.removeEventListener("mousemove", onMouseMove);
    });

    // Left click - collapse expanded card
    cardEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        
        // If another card is expanded, collapse it first
        if (ExpandedCardManager.get() && ExpandedCardManager.get() !== cardEl) {
            collapseCard(ExpandedCardManager.get());
        }
        
        if (ExpandedCardManager.get() === cardEl) {
            // Left click on expanded card - collapse it
            collapseCard(cardEl);
            ExpandedCardManager.reset();
        } else {
            // Left click on normal card - expand it
            expandCard(cardEl);
            ExpandedCardManager.set(cardEl);
        }
    });

    // Double click - show fancy display
    cardEl.addEventListener("dblclick", async (e) => {
        e.stopPropagation();
        e.preventDefault();

        // ── Закрытые карты не раскрываем ──────────────────────────────
        const isFaceDown = card?.face === null || cardEl.dataset.isFaceDown === "1";
        if (isFaceDown) {
            // Мягко намекаем игроку что смотреть пока нечего
            ui.notifications.info("🙈 Эта карта закрыта — она раскроется при розыгрыше.");
            return;
        }

        // Проверяем настройку
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) {
            console.log(`[${MODULE_ID}] Fancy display is disabled`);
            return;
        }

        // Получаем данные карты
        const cardId = cardEl.dataset.cardId;
        const hand   = pokerHandGlobalState.hand;
        if (!cardId || !hand) return;

        const cardObj = hand.cards.get(cardId);
        if (!cardObj) {
            console.warn(`[${MODULE_ID}] Card not found: ${cardId}`);
            return;
        }

        // Показываем FancyDisplay
        await CardSystem.displayCardFancy(cardObj, {
            faceDown:       false,
            dramaticReveal: false,
            share:          false,
        });
    });

    // Right click - use card and send to chat (only if expanded)
    cardEl.addEventListener("contextmenu", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Only use card if it's expanded
        if (ExpandedCardManager.get() === cardEl && card) {
            try {
                SFX.play(SFX.sounds.use);
                console.log(`[${MODULE_ID}] Using card:`, card?.name, card?.id);
                await CardSystem.useCardAndChat(card, pokerHandGlobalState.hand, e);
                
                // Collapse card after use
                if (ExpandedCardManager.get() === cardEl) {
                    collapseCard(cardEl);
                    ExpandedCardManager.reset();
                }
            } catch (error) {
                console.error(`[${MODULE_ID}] Failed to use card:`, error);
                ui.notifications.error("Не удалось использовать карту");
            }
        }
    });
}

function expandCard(cardEl) {
    const config = pokerHandGlobalState.config;
    const sc = Utils.getSettingSafe("hudCardScale", 1.35); // Используем настройку из модуля
    const x = Number.parseFloat(cardEl.dataset.xOffset) || 0;
    const y = Number.parseFloat(cardEl.dataset.yOffset) || 0;
    const r = Number.parseFloat(cardEl.dataset.rotation) || 0;
    const lift = config.interactiveHover?.lift || -120;
    
    // Store original dimensions
    const originalWidth = cardEl.style.width || "220px";
    const originalHeight = cardEl.style.height || "330px";
    cardEl.dataset.originalWidth = originalWidth;
    cardEl.dataset.originalHeight = originalHeight;
    
    // Add smooth transition for expansion
    cardEl.style.transition = "width 0.3s ease, height 0.3s ease, filter 0.2s ease, transform 0.3s ease";
    
    // Calculate new dimensions
    const newWidth = Math.round(220 * sc);
    const newHeight = Math.round(330 * sc);
    cardEl.style.width = `${newWidth}px`;
    cardEl.style.height = `${newHeight}px`;
    
    cardEl.style.zIndex = 10000;
    cardEl.style.filter = "drop-shadow(0 15px 25px rgba(0,0,0,0.7)) brightness(1.08) contrast(1.1)";
    // Apply the original hover lift height
    cardEl.style.transform = `perspective(1200px) translateX(${x}px) translateY(${y + lift}px) rotateZ(${r}deg)`;
}

function collapseCard(cardEl) {
    const x = Number.parseFloat(cardEl.dataset.xOffset) || 0;
    const y = Number.parseFloat(cardEl.dataset.yOffset) || 0;
    const r = Number.parseFloat(cardEl.dataset.rotation) || 0;
    
    // Add smooth transition for collapse
    cardEl.style.transition = "width 0.25s cubic-bezier(.15,.85,.15,1), height 0.25s cubic-bezier(.15,.85,.15,1), filter 0.15s ease, transform 0.25s cubic-bezier(.15,.85,.15,1)";
    
    // Restore original dimensions
    cardEl.style.width = cardEl.dataset.originalWidth || "220px";
    cardEl.style.height = cardEl.dataset.originalHeight || "330px";
    
    cardEl.style.zIndex = cardEl.dataset.originalZIndex || 0;
    cardEl.style.filter = "";
    cardEl.style.transform = `translateX(${x}px) translateY(${y}px) rotateZ(${r}deg)`;
    
    // Clear transition after animation completes
    setTimeout(() => {
        cardEl.style.transition = "";
    }, 250);
}

// Click outside to collapse expanded card (only if not expanded)
document.addEventListener("click", (e) => {
    // Don't collapse expanded cards anymore - they stay expanded until right-click
    // This allows users to interact with other UI elements while keeping card expanded
});

export { smartPlaceTooltip, attachHoverEvents, expandCard, collapseCard };
