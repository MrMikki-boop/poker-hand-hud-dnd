/* ===== POKER HAND HUD - CARD MANAGEMENT SYSTEM ===== */
/**
 * @fileoverview Card management system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.6.0
 *
 * CHANGES v2.6:
 *  - Компактный messageContent в чате (горизонтальный лейаут, мелкий шрифт)
 *  - FancyDisplay показывается у ГМа когда игрок РАЗЫГРЫВАЕТ карту
 *  - Добавлен query showCardFancyToGM
 */

import { MODULE_ID, pokerHandGlobalState, userStateManager } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';
import FancyDisplay from './fancy-display.js';
import CardDealer from './card-dealer.js';

let PokerHandHUD = null;

const CardSystem = {
    async useCardAndChat(card, hand = pokerHandGlobalState.hand, evt = null) {
        if (!card) return;
        try {
            // 1. АВТО-РАСКРЫТИЕ (flip face-up если карта закрыта)
            if (card.face === null) {
                if (game.user.isGM) {
                    await card.update({ face: 0 });
                } else {
                    const gmUser = game.users.find(u => u.isGM && u.active);
                    if (gmUser) {
                        await gmUser.query(`${MODULE_ID}.flipCardUp`, { cardId: card.id });
                    } else {
                        await card.update({ face: 0 });
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 2. ГАРАНТИРОВАННЫЙ ФРОНТ
            const updatedCard = hand?.cards?.get(card.id)
                || game.cards.contents.flatMap(c => Array.from(c.cards)).find(c => c.id === card.id)
                || card;

            let realName = updatedCard.name;
            if (realName === "Неизвестно" || realName === "Unknown") {
                realName = updatedCard.faces?.[0]?.name || updatedCard._source?.name || "Карта";
            }

            const cardName  = foundry.utils.escapeHTML(realName);
            const cardFront = updatedCard.faces?.[0]?.img || updatedCard.img || "";
            const cardDesc  = updatedCard.description ? foundry.utils.escapeHTML(updatedCard.description) : "";

            // 3. ОТПРАВКА В ЧАТ — компактный горизонтальный лейаут
            const messageContent = `
<div class="card-draw ${MODULE_ID}-msg" data-deck="${hand?.name || ''}" data-card="${updatedCard.id}"
     style="
        display:flex; align-items:center; gap:10px;
        padding:8px 10px;
        background:rgba(18,12,6,0.92);
        border:1px solid rgba(192,160,96,0.4);
        border-radius:8px;
     ">
    <img class="card-face" src="${cardFront}" alt="${cardName}"
         style="
            width:44px; height:66px;
            object-fit:contain; border-radius:4px;
            flex-shrink:0; cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,0.6);
         ">
    <div style="min-width:0;">
        <div style="
            color:#ffd700; font-family:'Cinzel',serif;
            font-weight:bold; font-size:12px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
            margin-bottom:${cardDesc ? '3px' : '0'};
        ">${cardName}</div>
        ${cardDesc ? `
        <div style="
            color:#a89a80; font-size:11px;
            line-height:1.4; font-style:italic;
        ">${cardDesc}</div>` : ''}
    </div>
</div>`;

            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker(),
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                content: messageContent,
                flags: { [MODULE_ID]: { cardId: updatedCard.id, handId: hand?.id } }
            });

            // 4. ПОКАЗАТЬ КАРТУ ГМУ НА ВЕСЬ ЭКРАН (с dramatic reveal)
            // Игрок отправляет запрос ГМу, ГМ видит FancyDisplay локально.
            // Если ГМ сам играет карту — показываем ему сразу.
            if (cardFront) {
                const cardDataForDisplay = {
                    front: cardFront,
                    back:  updatedCard.back?.img || updatedCard.faces?.[0]?.back?.img || null,
                    name:  realName,
                };

                if (game.user.isGM) {
                    // ГМ разыгрывает сам — показываем локально
                    new FancyDisplay({
                        imgArray: [cardDataForDisplay],
                        faceDown: false,
                        borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                        borderWidth:  Utils.getSettingSafe("defaultCardBorderWidth", "8px"),
                        glowColor:    Utils.getSettingSafe("defaultCardGlowColor", "rgb(210 154 56 / 30%)"),
                    }).render(false, true);
                } else {
                    // Игрок разыгрывает — отправляем запрос ГМу
                    const gmUser = game.users.find(u => u.isGM && u.active);
                    if (gmUser) {
                        gmUser.query(
                            `${MODULE_ID}.showCardFancyToGM`,
                            { cardData: cardDataForDisplay },
                            { timeout: 8000 }
                        ).catch(e => console.warn(`[${MODULE_ID}] showCardFancyToGM:`, e));
                    }
                }
            }

            // 5. УДАЛЕНИЕ КАРТЫ ИЗ РУКИ
            const removeCardAfterUse = Utils.getSettingSafe("removeCardAfterUse", true);
            const returnToMainDeck   = Utils.getSettingSafe("returnToMainDeck", true);

            if (removeCardAfterUse || returnToMainDeck) {
                await this.removeCardFromHand(updatedCard, hand);
            }
        } catch (e) {
            console.error(`[${MODULE_ID}] useCardAndChat error`, e);
        }
    },

    setupCardUpdates() {
        Hooks.on("createCard", (card) => {
            const targetHandId = card.parent?.id;
            if (!targetHandId) return;
            const userState = userStateManager.getCurrentUserState();
            if (targetHandId === userState?.hand?.id) { this.updateHandDynamically(userState.hand); return; }
            if (targetHandId === pokerHandGlobalState.hand?.id) { this.updateHandDynamically(); }
        });

        Hooks.on("deleteCard", (card) => {
            const sourceHandId = card.parent?.id;
            if (!sourceHandId) return;
            const userState = userStateManager.getCurrentUserState();
            if (sourceHandId === userState?.hand?.id) { this.updateHandDynamically(userState.hand); return; }
            if (sourceHandId === pokerHandGlobalState.hand?.id) { this.updateHandDynamically(); }
        });

        Hooks.on("updateCard", (card) => {
            const targetHandId = card.parent?.id;
            if (!targetHandId) return;
            const userState = userStateManager.getCurrentUserState();
            if (targetHandId === userState?.hand?.id) { this.updateHandDynamically(userState.hand); return; }
            if (targetHandId === pokerHandGlobalState.hand?.id) { this.updateHandDynamically(); }
        });
    },

    findUserHand() {
        const hands = game.cards?.filter(c => c.type === 'hand' && c.isOwner) || [];
        if (!hands.length) return null;
        const userName = game.user?.name || game.user?.id;
        return hands.find(h => h.name.toLowerCase().includes(userName.toLowerCase())) || hands[0];
    },

    async updateHandDynamically(targetHand = null) {
        let hand = targetHand;
        if (!hand) {
            const userState = userStateManager.getCurrentUserState();
            hand = userState?.hand || pokerHandGlobalState.hand;
        }
        if (!hand) return;

        try {
            let config = userStateManager.getCurrentUserState()?.config || pokerHandGlobalState.config;
            if (!config) {
                config = globalThis.ConfigSystem?.createDefaultConfig() || {};
                if (globalThis.ConfigSystem?.loadSettings) config = globalThis.ConfigSystem.loadSettings(config);
            }
            const isLocalUpdate = targetHand && targetHand.id !== pokerHandGlobalState.hand?.id;
            await globalThis.PokerHandHUD.renderCards(hand, config, { skipGlobalState: isLocalUpdate });
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to update HUD dynamically:`, error);
        }
    },

    async removeCardFromHand(card, hand) {
        try {
            await this.animateCardRemoval(card);
            const returnToMainDeck = Utils.getSettingSafe("returnToMainDeck", true);

            if (returnToMainDeck) {
                try {
                    const originId = card.origin?.id || card.origin;
                    const originalDeck = originId ? game.cards.get(originId) : null;
                    if (originalDeck && originalDeck.type === "deck") {
                        await card.pass(originalDeck, { chat: false, display: false, render: false });
                    } else {
                        await this.fallbackCardReturn(card);
                    }
                } catch {
                    await this.fallbackCardReturn(card);
                }
            } else {
                await this.fallbackCardReturn(card);
            }

            if (!pokerHandGlobalState.config) {
                await globalThis.PokerHandHUD.renderCards(hand, pokerHandGlobalState.config);
            }
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to remove card from hand:`, error);
        }
    },

    async animateCardRemoval(card) {
        return new Promise((resolve) => {
            const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
            if (!cardElement) { resolve(); return; }

            const x = Number.parseFloat(cardElement.dataset.xOffset) || 0;
            const y = Number.parseFloat(cardElement.dataset.yOffset) || 0;
            const r = Number.parseFloat(cardElement.dataset.rotation) || 0;

            cardElement.style.transition = "transform 0.8s cubic-bezier(.2,.7,.1,1), opacity 0.6s ease";
            cardElement.style.opacity = "0";
            cardElement.style.transform = `translateX(${x}px) translateY(${y - 200}px) rotateZ(${r + 360}deg) scale(0.5)`;
            this.createRemovalSparkles(cardElement);
            setTimeout(resolve, 800);
        });
    },

    createRemovalSparkles(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const container = document.createElement("div");
        container.style.cssText = `position:fixed;left:${rect.left + rect.width/2}px;top:${rect.top + rect.height/2}px;transform:translate(-50%,-50%);pointer-events:none;z-index:10000;`;

        for (let i = 0; i < 12; i++) {
            const s = document.createElement("div");
            const angle = (i / 12) * Math.PI * 2;
            const d = 50 + Math.random() * 50;
            s.style.cssText = `position:absolute;width:4px;height:4px;background:radial-gradient(circle,rgba(255,220,150,0.9),rgba(255,180,100,0.4));border-radius:50%;opacity:0;animation:removal-sparkle 0.8s ease-out forwards;transform:translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d}px);`;
            container.appendChild(s);
        }
        document.body.appendChild(container);

        if (!document.querySelector('#removal-sparkle-style')) {
            const style = document.createElement('style');
            style.id = 'removal-sparkle-style';
            style.textContent = `@keyframes removal-sparkle{0%{opacity:0;transform:translate(0,0) scale(0);}50%{opacity:1;}100%{opacity:0;transform:translate(calc(var(--x,0)*1.5),calc(var(--y,0)*1.5)) scale(0.5);}}`;
            document.head.appendChild(style);
        }
        setTimeout(() => container.remove(), 800);
    },

    async fallbackCardReturn(card) {
        const mainDeckNames = ["Deck","Main Deck","Draw Deck","Колода","Основная колода","Draw Pile","Library","Библиотека"];
        let target = null;

        if (game.cards?.contents) {
            target = game.cards.contents.find(c => c.type === "deck" && mainDeckNames.includes(c.name))
                || game.cards.contents.find(c => c.type === "deck");
        }

        if (target) {
            try { await card.pass(target, { chat: false, display: false, render: false }); }
            catch (e) { console.error(`[${MODULE_ID}] fallbackCardReturn:`, e); }
        }
    },

    async selectCardHand() {
        const enableAssignment = Utils.getSettingSafe("enableUserHandAssignment", true);
        if (!enableAssignment) {
            const hands = game.cards?.filter(c => c.type === 'hand' && c.isOwner) || [];
            return hands[0] || null;
        }

        const assignedHand = await HandAssignmentSystem.getAssignedHandForCurrentUser();
        if (assignedHand) return assignedHand;

        const assignmentMode = Utils.getSettingSafe("handAssignmentMode", "manual");
        const gmPrefix = Utils.getSettingSafe("gmHandPrefix", "GM");
        const hands = game.cards.filter(c => c.type === 'hand' && c.isOwner);
        if (!hands.length) return null;

        const userName = game.user?.name || game.user?.id;
        let selected = null;

        switch (assignmentMode) {
            case "name":    selected = this.selectHandByName(hands, userName, gmPrefix); break;
            case "flags":   selected = this.selectHandByFlags(hands); break;
            case "smart":   selected = this.selectHandSmart(hands, userName, gmPrefix); break;
            case "manual":  default: selected = this.selectHandByManualAssignment(hands); break;
            case "first":   selected = hands[0]; break;
        }

        return selected || hands[0];
    },

    selectHandByName(hands, userName, gmPrefix) {
        const byName = hands.find(h => h.name.toLowerCase().includes(userName.toLowerCase()));
        if (byName) return byName;
        if (game.user.isGM) return hands.find(h => h.name.toLowerCase().includes(gmPrefix.toLowerCase())) || null;
        return null;
    },

    selectHandByFlags(hands) {
        return hands.find(h => {
            try { return h.getFlag?.(MODULE_ID, 'assignedUser') === game.user.id; } catch { return false; }
        }) || null;
    },

    selectHandByManualAssignment(hands) {
        const name = HandAssignmentSystem.getUserHand(game.user.id);
        return name ? (hands.find(h => h.name === name) || null) : null;
    },

    selectHandSmart(hands, userName, gmPrefix) {
        return this.selectHandByFlags(hands)
            || this.selectHandByName(hands, userName, gmPrefix)
            || (hands.length > 1
                ? game.user.isGM
                    ? hands.find(h => !h.name.toLowerCase().includes('player') && !h.name.toLowerCase().includes('игрок'))
                    : hands.find(h => !['gm','гм','master', gmPrefix.toLowerCase()].some(k => h.name.toLowerCase().includes(k)))
                : null);
    },

    async displayCardFancy(card, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) return this.useCardAndChat(card);
        try {
            const { faceDown = false, dramaticReveal = false, share = false } = options;
            const cardData = {
                front: card.faces?.[0]?.img || card.img,
                back:  card.back?.img || null,
                name:  card.name,
                id:    card.id,
            };
            if (!cardData.front) return this.useCardAndChat(card);

            new FancyDisplay({
                imgArray:    [cardData],
                faceDown,
                borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                borderWidth: Utils.getSettingSafe("defaultCardBorderWidth",  "8px"),
                glowColor:   Utils.getSettingSafe("defaultCardGlowColor",   "rgb(210 154 56 / 30%)"),
            }).render(share, dramaticReveal);

            if (SFX?.play) SFX.play(SFX.sounds.use);
        } catch (error) {
            console.error(`[${MODULE_ID}] displayCardFancy:`, error);
            this.useCardAndChat(card);
        }
    },

    async displayCardsFancy(cards, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) return;
        try {
            const { faceDown = false, dramaticReveal = false, share = false } = options;
            const imgArray = cards
                .map(c => ({ front: c.faces?.[0]?.img || c.img, back: c.back?.img || null, name: c.name, id: c.id }))
                .filter(c => c.front);
            if (!imgArray.length) return;

            new FancyDisplay({
                imgArray, faceDown,
                borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                borderWidth: Utils.getSettingSafe("defaultCardBorderWidth",  "8px"),
                glowColor:   Utils.getSettingSafe("defaultCardGlowColor",   "rgb(210 154 56 / 30%)"),
            }).render(share, dramaticReveal);
        } catch (e) { console.error(`[${MODULE_ID}] displayCardsFancy:`, e); }
    },

    async drawCardsFancy(deckName, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) return;
        try {
            const { quantity = 1, share = false, face = null, discardPileName = null } = options;
            const dealer = new CardDealer({ deckName, discardPileName });
            await dealer.draw({ quantity, share, face });
        } catch (e) { console.error(`[${MODULE_ID}] drawCardsFancy:`, e); }
    },

    async viewCardsFancy(cards, deckName, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) return;
        try {
            const { faceDown = false, dramaticReveal = false, share = false, whisper = false } = options;
            const dealer = new CardDealer({ deckName });
            await dealer.view(cards, faceDown, whisper, dramaticReveal, share);
        } catch (e) { console.error(`[${MODULE_ID}] viewCardsFancy:`, e); }
    },

    setupFancyDisplayHooks() {
        Hooks.on('renderChatMessage', (message, html) => { this._setupCardClickHandlers(html); });
        Hooks.on('renderChatLog',     (chatLog, html)  => { this._setupCardClickHandlers(html); });
        if (ui.chat?.element) this._setupCardClickHandlers(ui.chat.element);
        this.setupCardDeckHooks();
    },

    _setupCardClickHandlers(html) {
        if (!Utils.getSettingSafe("enableCardIconClick", true)) return;
        $(html).find('img.card-face').each((_, img) => {
            if ($(img).data('click-handler-attached')) return;
            $(img).css('cursor', 'pointer').data('click-handler-attached', true);
            $(img).on('click', (evt) => {
                evt.preventDefault();
                const cardId = $(img).closest('[data-card]').data('card');
                if (!cardId) return;

                let card = pokerHandGlobalState.hand?.cards.find(c => c.id === cardId);
                if (!card) {
                    for (const deck of game.cards) {
                        card = deck.cards.get(cardId);
                        if (card) break;
                    }
                }
                if (!card) card = game.cards.get(cardId);
                if (card) this.displayCardFancy(card, { faceDown: false, dramaticReveal: false, share: false });
            });
        });
    },

    setupCardDeckHooks() {
        Hooks.on('renderCardsConfig', (app, html, data) => {
            if (!Utils.getSettingSafe("enableCardIconClick", true)) return;
            $(html).find('img.card-face, .cards img.face').each((_, img) => {
                $(img).css('cursor', 'pointer');
                $(img).on('click', (evt) => {
                    evt.preventDefault();
                    const cardId = $(img).closest('li').data('card-id');
                    const deck   = data.cards.find(c => c._id === cardId);
                    if (deck) this.viewCardsFancy([cardId], deck.source.name, { faceDown: deck.face === null });
                });
            });
        });
    },
};

// ─── Queries ──────────────────────────────────────────────────────────────────
Hooks.once('init', () => {

    // Перевернуть закрытую карту (вызывается игроком, выполняется у ГМа)
    CONFIG.queries[`${MODULE_ID}.flipCardUp`] = async (data) => {
        if (!game.user.isGM) return { success: false };
        for (const deck of game.cards.contents) {
            const card = deck.cards.get(data.cardId);
            if (card && card.face === null) {
                await card.update({ face: 0 });
                return { success: true };
            }
        }
        return { success: false };
    };

    // Показать карту на весь экран у ГМа (вызывается игроком при розыгрыше)
    CONFIG.queries[`${MODULE_ID}.showCardFancyToGM`] = async (data) => {
        if (!game.user.isGM) return { success: false };
        try {
            const { cardData } = data;
            new FancyDisplay({
                imgArray:    [cardData],
                faceDown:    false,
                borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                borderWidth: Utils.getSettingSafe("defaultCardBorderWidth",  "8px"),
                glowColor:   Utils.getSettingSafe("defaultCardGlowColor",   "rgb(210 154 56 / 30%)"),
            }).render(false, true); // dramaticReveal = true
            return { success: true };
        } catch (e) {
            console.error(`[${MODULE_ID}] showCardFancyToGM:`, e);
            return { success: false };
        }
    };
});

export { CardSystem };