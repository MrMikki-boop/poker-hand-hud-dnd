/* ===== POKER HAND HUD - CARD MANAGEMENT SYSTEM ===== */
/**
 * @fileoverview Card management system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, pokerHandGlobalState, userStateManager } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';
import FancyDisplay from './fancy-display.js';
import CardDealer from './card-dealer.js';

// Forward declaration - will be imported at runtime to avoid circular dependency
let PokerHandHUD = null;

const CardSystem = {
    async useCardAndChat(card, hand = pokerHandGlobalState.hand, evt = null) {
        if (!card) return;
        try {
            const cardName = foundry.utils.escapeHTML(card.name ?? "");
            const cardFront = card.img || "";
            const cardDesc = card.description ? foundry.utils.escapeHTML(card.description) : "";
            
            // Create message in orcnog-card-viewer format
            const messageContent = `<div class="card-draw ${MODULE_ID}-msg flexrow" data-deck="${hand.name}" data-card="${card.id}">
                <img class="card-face" src="${cardFront}" alt="${cardName}" />
                <h4 class="card-name">${cardName}</h4>
            </div>
            <p>${cardDesc}</p>`;

            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker(),
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                content: messageContent,
                flags: { [MODULE_ID]: { cardId: card.id, handId: hand.id } }
            });

            // Show card to all other players with dramatic reveal
            if (Utils.getSettingSafe("enableDisplayOnUse", true)) {
                // Extract card properties for fancy display
                const cardData = {
                    front: card.img || card.faces?.[0]?.img,
                    back: card.back?.img || card.faces?.[0]?.back?.img || null,
                    name: card.name,
                };

                console.log(`[${MODULE_ID}] Sharing card to all players:`, cardData.name);

                // Create fancy display data and share to others only
                const fancyDisplay = new FancyDisplay({
                    imgArray: [cardData],
                    faceDown: true, // Start face-down for dramatic reveal
                    borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                    borderWidth: Utils.getSettingSafe("defaultCardBorderWidth", "8px"),
                    glowColor: Utils.getSettingSafe("defaultCardGlowColor", "rgb(210 154 56 / 30%)")
                });
                
                // Only share to others, don't render locally for initiator
                fancyDisplay._shareToAll();
                console.log(`[${MODULE_ID}] Card shared to other players only`);
            }

            // Remove card after use if setting is enabled
            const removeCardAfterUse = Utils.getSettingSafe("removeCardAfterUse", true);
            const returnToMainDeck = Utils.getSettingSafe("returnToMainDeck", true);
            
            if (removeCardAfterUse || returnToMainDeck) {
                await this.removeCardFromHand(card, hand);
            }
        } catch (e) {
            console.error(`[${MODULE_ID}] useCardAndChat error`, e);
        }
    },

    // Setup real-time card updates
    setupCardUpdates() {
        // Hook for when cards are created in any hand
        Hooks.on("createCard", (card, options, userId) => {
            console.log(`[${MODULE_ID}] Card created by ${userId} in hand ${card.parent?.id}, checking if HUD update needed`);
            
            // Find which hand this card was added to
            const targetHandId = card.parent?.id;
            if (!targetHandId) return;
            
            // Check if this affects current user's hand
            const userState = userStateManager.getCurrentUserState();
            const userHand = userState?.hand;
            
            if (targetHandId === userHand?.id) {
                console.log(`[${MODULE_ID}] Card added to current user's hand, updating HUD`);
                this.updateHandDynamically(userHand);
                return;
            }
            
            // Also check global state for backward compatibility
            if (targetHandId === pokerHandGlobalState.hand?.id) {
                console.log(`[${MODULE_ID}] Card added to global hand, updating HUD`);
                this.updateHandDynamically();
                return;
            }
            
            console.log(`[${MODULE_ID}] Card added to hand ${targetHandId}, but not current user's hand (${userHand?.id})`);
        });

        // Hook for when cards are deleted from any hand
        Hooks.on("deleteCard", (card, options, userId) => {
            console.log(`[${MODULE_ID}] Card deleted by ${userId} from hand ${card.parent?.id}, checking if HUD update needed`);
            
            // Find which hand this card was removed from
            const sourceHandId = card.parent?.id;
            if (!sourceHandId) return;
            
            // Check if this affects current user's hand
            const userState = userStateManager.getCurrentUserState();
            const userHand = userState?.hand;
            
            if (sourceHandId === userHand?.id) {
                console.log(`[${MODULE_ID}] Card removed from current user's hand, updating HUD`);
                this.updateHandDynamically(userHand);
                return;
            }
            
            // Also check global state for backward compatibility
            if (sourceHandId === pokerHandGlobalState.hand?.id) {
                console.log(`[${MODULE_ID}] Card removed from global hand, updating HUD`);
                this.updateHandDynamically();
                return;
            }
            
            console.log(`[${MODULE_ID}] Card removed from hand ${sourceHandId}, but not current user's hand (${userHand?.id})`);
        });

        // Hook for when cards are updated (moved between hands)
        Hooks.on("updateCard", (card, changes, options, userId) => {
            console.log(`[${MODULE_ID}] Card updated by ${userId}, now in hand ${card.parent?.id}, checking if HUD update needed`);
            
            // Find which hand this card is now in
            const targetHandId = card.parent?.id;
            if (!targetHandId) return;
            
            // Check if this affects current user's hand
            const userState = userStateManager.getCurrentUserState();
            const userHand = userState?.hand;
            
            if (targetHandId === userHand?.id) {
                console.log(`[${MODULE_ID}] Card now in current user's hand, updating HUD`);
                this.updateHandDynamically(userHand);
                return;
            }
            
            // Also check global state for backward compatibility
            if (targetHandId === pokerHandGlobalState.hand?.id) {
                console.log(`[${MODULE_ID}] Card now in global hand, updating HUD`);
                this.updateHandDynamically();
                return;
            }
            
            console.log(`[${MODULE_ID}] Card updated in hand ${targetHandId}, but not current user's hand (${userHand?.id})`);
        });
    },
    
    // Helper function to find the current user's hand
    findUserHand() {
        const hands = game.cards?.filter(c => c.type === 'hand' && c.isOwner) || [];
        if (hands.length === 0) return null;
        
        // Use the same logic as selectCardHand but without updating global state
        const userName = game.user?.name || game.user?.id;
        const userHand = hands.find(hand => {
            const handName = hand.name.toLowerCase();
            return handName.includes(userName.toLowerCase());
        });
        
        return userHand || hands[0];
    },

    // Dynamic hand update without full re-render
    async updateHandDynamically(targetHand = null) {
        // Use provided hand or get from user state
        let hand = targetHand;
        if (!hand) {
            // Try user state first, then global state
            const userState = userStateManager.getCurrentUserState();
            hand = userState?.hand || pokerHandGlobalState.hand;
        }
        
        if (!hand) return;
        
        try {
            // Get current cards from hand
            const currentCards = hand.cards.contents;
            console.log(`[${MODULE_ID}] Updating HUD for ${currentCards.length} cards in hand: ${hand.name}`);

            // Get configuration from user state or global state
            let config = null;
            const userState = userStateManager.getCurrentUserState();
            config = userState?.config || pokerHandGlobalState.config;
            
            if (!config) {
                config = globalThis.ConfigSystem?.createDefaultConfig() || {};
                if (globalThis.ConfigSystem?.loadSettings) {
                    config = globalThis.ConfigSystem.loadSettings(config);
                }
            }

            // Check if this is a local update (not the main global hand)
            const isLocalUpdate = targetHand && targetHand.id !== pokerHandGlobalState.hand?.id;
            
            // Update the container with new cards
            await globalThis.PokerHandHUD.renderCards(hand, config, { 
                skipGlobalState: isLocalUpdate 
            });
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to update HUD dynamically:`, error);
        }
    },

    async removeCardFromHand(card, hand) {
        try {
            console.log(`[${MODULE_ID}] Removing card ${card.name} (${card.id}) from hand after use`);
            console.log(`[${MODULE_ID}] Hand cards before removal:`, hand.cards.contents.map(c => ({ name: c.name, id: c.id })));
            
            // Animate card removal
            await this.animateCardRemoval(card);
            
            // Remove card from hand using Foundry VTT's built-in origin tracking
            // Foundry automatically tracks where each card came from via card.origin
            const returnToMainDeck = Utils.getSettingSafe("returnToMainDeck", true);
            
            if (returnToMainDeck) {
                try {
                    console.log(`[${MODULE_ID}] Using card.origin to return card "${card.name}" to its original deck`);
                    console.log(`[${MODULE_ID}] Card origin info:`, {
                        cardId: card.id,
                        cardName: card.name,
                        origin: card.origin,
                        originId: card.origin?.id || card.origin,
                        parentId: card.parent?.id,
                        parentName: card.parent?.name,
                        parentType: card.parent?.type
                    });
                    
                    // Получаем ID оригинальной колоды через card.origin
                    const originId = card.origin?.id || card.origin;
                    const originalDeck = originId ? game.cards.get(originId) : null;
                    
                    if (originalDeck && originalDeck.type === "deck") {
                        console.log(`[${MODULE_ID}] Found original deck "${originalDeck.name}" (${originalDeck.id}) for card "${card.name}"`);
                        
                        // Используем card.pass() для возврата карты
                        // Это работает с правильными правами доступа Foundry
                        await card.pass(originalDeck);
                        console.log(`[${MODULE_ID}] Card "${card.name}" successfully passed to "${originalDeck.name}"`);
                        
                    } else {
                        // Если не нашли оригинальную колоду, используем fallback
                        console.warn(`[${MODULE_ID}] Could not find original deck for card "${card.name}" (originId: ${originId}), using fallback`);
                        await this.fallbackCardReturn(card);
                    }
                    
                } catch (originError) {
                    console.error(`[${MODULE_ID}] Failed to return card "${card.name}" using origin:`, originError);
                    // Fallback: используем старый метод
                    await this.fallbackCardReturn(card);
                }
            } else {
                // Original logic for discard pile - simplified
                await this.fallbackCardReturn(card);
            }
            
            // Re-render the hand to update display (only if dynamic updates failed)
            // Note: Dynamic updates are handled by hooks in setupCardUpdates()
            if (!pokerHandGlobalState.config) {
                await globalThis.PokerHandHUD.renderCards(hand, pokerHandGlobalState.config);
            }
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to remove card from hand:`, error);
            ui.notifications.error("Не удалось изъять карту из руки");
        }
    },

    async animateCardRemoval(card) {
        return new Promise((resolve) => {
            const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
            if (!cardElement) {
                resolve();
                return;
            }

            // Get current position
            const x = Number.parseFloat(cardElement.dataset.xOffset) || 0;
            const y = Number.parseFloat(cardElement.dataset.yOffset) || 0;
            const r = Number.parseFloat(cardElement.dataset.rotation) || 0;

            // Animate card flying away and fading out
            cardElement.style.transition = "transform 0.8s cubic-bezier(.2,.7,.1,1), opacity 0.6s ease";
            cardElement.style.opacity = "0";
            cardElement.style.transform = `translateX(${x}px) translateY(${y - 200}px) rotateZ(${r + 360}deg) scale(0.5)`;
            
            // Add sparkle effect during removal
            this.createRemovalSparkles(cardElement);

            // Resolve after animation completes
            setTimeout(resolve, 800);
        });
    },

    createRemovalSparkles(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const sparkleContainer = document.createElement("div");
        sparkleContainer.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10000;
        `;
        
        for (let i = 0; i < 12; i++) {
            const sparkle = document.createElement("div");
            const angle = (i / 12) * Math.PI * 2;
            const distance = 50 + Math.random() * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            sparkle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: radial-gradient(circle, rgba(255,220,150,0.9), rgba(255,180,100,0.4));
                border-radius: 50%;
                opacity: 0;
                animation: removal-sparkle 0.8s ease-out forwards;
                transform: translate(${x}px, ${y}px);
            `;
            
            sparkleContainer.appendChild(sparkle);
        }

        document.body.appendChild(sparkleContainer);
        
        // Add CSS animation if not exists
        if (!document.querySelector('#removal-sparkle-style')) {
            const style = document.createElement('style');
            style.id = 'removal-sparkle-style';
            style.textContent = `
                @keyframes removal-sparkle {
                    0% { opacity: 0; transform: translate(0, 0) scale(0); }
                    50% { opacity: 1; transform: translate(var(--x, 0), var(--y, 0)) scale(1); }
                    100% { opacity: 0; transform: translate(calc(var(--x, 0) * 1.5), calc(var(--y, 0) * 1.5)) scale(0.5); }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => sparkleContainer.remove(), 800);
    },

    /**
     * Fallback method for returning card when origin tracking fails
     * @param {Card} card - The card to return
     */
    async fallbackCardReturn(card) {
        console.log(`[${MODULE_ID}] Using fallback method to return card "${card.name}"`);
        
        let targetPileDoc = null;
        
        // ПРИОРИТЕТ 1: Ищем колоду по имени (fallback)
        const mainDeckNames = [
            "Deck", "Main Deck", "Draw Deck", "Колода", "Основная колода", 
            "Draw Pile", "Library", "Библиотека"
        ];
        
        if (game.cards && game.cards.contents) {
            for (const cardsDoc of game.cards.contents) {
                if (cardsDoc.type === "deck" && mainDeckNames.includes(cardsDoc.name)) {
                    targetPileDoc = cardsDoc;
                    console.log(`[${MODULE_ID}] Found main deck by name "${cardsDoc.name}" for fallback return`);
                    break;
                }
            }
        }
        
        // ПРИОРИТЕТ 2: Любая колода типа deck (last fallback)
        if (!targetPileDoc && game.cards && game.cards.contents) {
            const anyDeck = game.cards.contents.find(c => c.type === "deck");
            if (anyDeck) {
                targetPileDoc = anyDeck;
                console.log(`[${MODULE_ID}] Using fallback deck "${anyDeck.name}" for direct return`);
            }
        }
        
        if (targetPileDoc) {
            try {
                await card.pass(targetPileDoc);
                console.log(`[${MODULE_ID}] Card "${card.name}" successfully passed to fallback deck "${targetPileDoc.name}"`);
            } catch (passError) {
                console.error(`[${MODULE_ID}] Failed to pass card to fallback deck:`, passError);
                ui.notifications.error(`Не удалось вернуть карту "${card.name}" в колоду`);
            }
        } else {
            console.warn(`[${MODULE_ID}] No suitable deck found for card "${card.name}"`);
            ui.notifications.warn(`Не удалось найти подходящую колоду для карты "${card.name}"`);
        }
    },
    
    async selectCardHand() {
        // Check if user hand assignment is enabled
        const enableAssignment = Utils.getSettingSafe("enableUserHandAssignment", true);
        if (!enableAssignment) {
            // Legacy mode - just return first available hand
            const hands = game.cards?.filter(c => c.type === 'hand' && c.isOwner) || [];
            if (hands.length === 0) {
                ui.notifications.warn("У вас нет доступных рук карт. Создайте руку карт или попросите ГМ дать вам доступ.");
                return null;
            }
            return hands[0];
        }
        
        // Try to get assigned hand first (highest priority)
        const assignedHand = await HandAssignmentSystem.getAssignedHandForCurrentUser();
        if (assignedHand) {
            console.log(`[${MODULE_ID}] Using assigned hand: ${assignedHand.name}`);
            return assignedHand;
        }
        
        // Get assignment mode
        const assignmentMode = Utils.getSettingSafe("handAssignmentMode", "manual");
        const gmPrefix = Utils.getSettingSafe("gmHandPrefix", "GM");
        
        // Get all hands that this user owns
        const hands = game.cards.filter(card => card.type === 'hand' && card.isOwner);
        
        if (hands.length === 0) {
            console.log(`[${MODULE_ID}] No hands available for user ${game.user.id}`);
            return null;
        }
        
        const userName = game.user?.name || game.user?.id;
        let selectedHand = null;
        
        switch (assignmentMode) {
            case "name":
                selectedHand = this.selectHandByName(hands, userName, gmPrefix);
                break;
            case "flags":
                selectedHand = this.selectHandByFlags(hands);
                break;
            case "smart":
                selectedHand = this.selectHandSmart(hands, userName, gmPrefix);
                break;
            case "manual":
            default:
                selectedHand = this.selectHandByManualAssignment(hands);
                break;
            case "first":
                selectedHand = hands[0];
                break;
        }
        
        if (selectedHand) {
            console.log(`[${MODULE_ID}] Selected hand: ${selectedHand.name} using mode: ${assignmentMode}`);
            return selectedHand;
        }
        
        // Fallback to first available hand with warning
        console.warn(`[${MODULE_ID}] Using fallback hand: ${hands[0].name}. Consider creating user-specific hands or assigning hands.`);
        return hands[0];
    },
    
    selectHandByName(hands, userName, gmPrefix) {
        const userHand = hands.find(hand => {
            const handName = hand.name.toLowerCase();
            return handName.includes(userName.toLowerCase());
        });
        
        if (userHand) {
            console.log(`[${MODULE_ID}] Found hand by name: ${userHand.name} for ${userName}`);
            return userHand;
        }
        
        // For GM, prefer GM-specific hands
        if (game.user.isGM) {
            const gmHand = hands.find(hand => {
                const handName = hand.name.toLowerCase();
                return handName.includes(gmPrefix.toLowerCase());
            });
            if (gmHand) {
                console.log(`[${MODULE_ID}] GM using GM-specific hand: ${gmHand.name}`);
                return gmHand;
            }
        }
        
        return null;
    },
    
    selectHandByFlags(hands) {
        const userHand = hands.find(hand => {
            try {
                if (hand.getFlag && hand.getFlag(MODULE_ID, 'assignedUser')) {
                    return hand.getFlag(MODULE_ID, 'assignedUser') === game.user.id;
                }
            } catch (e) {
                // Flag scope not yet active, skip flag checking
                console.log(`[${MODULE_ID}] Flag scope not active, skipping flag check for hand: ${hand.name}`);
            }
            return false;
        });
        
        if (userHand) {
            console.log(`[${MODULE_ID}] Found hand by flags: ${userHand.name} for user ${game.user.id}`);
            return userHand;
        }
        
        return null;
    },
    
    selectHandByManualAssignment(hands) {
        // Import HandAssignmentSystem to get user assignments
        const assignedHandName = HandAssignmentSystem.getUserHand(game.user.id);
        
        if (assignedHandName) {
            const userHand = hands.find(hand => hand.name === assignedHandName);
            if (userHand) {
                console.log(`[${MODULE_ID}] Found manually assigned hand: ${userHand.name} for user ${game.user.id}`);
                return userHand;
            } else {
                console.log(`[${MODULE_ID}] Assigned hand "${assignedHandName}" not found in available hands`);
            }
        } else {
            console.log(`[${MODULE_ID}] No manual assignment found for user ${game.user.id}`);
        }
        
        return null;
    },
    
    selectHandSmart(hands, userName, gmPrefix) {
        // First try flags (most reliable) - with error handling
        let userHand = null;
        try {
            userHand = this.selectHandByFlags(hands);
        } catch (e) {
            console.log(`[${MODULE_ID}] Flag checking failed, falling back to name-based selection`);
        }
        
        if (userHand) return userHand;
        
        // Then try by name
        userHand = this.selectHandByName(hands, userName, gmPrefix);
        if (userHand) return userHand;
        
        // Smart fallback based on user role
        if (hands.length > 1) {
            if (game.user.isGM) {
                // For GM, avoid player hands
                const gmHand = hands.find(hand => {
                    const handName = hand.name.toLowerCase();
                    return !handName.includes('player') && 
                           !handName.includes('игрок') &&
                           !game.users.some(user => 
                               user.id !== game.user.id && 
                               handName.includes(user.name.toLowerCase())
                           );
                });
                if (gmHand) {
                    console.log(`[${MODULE_ID}] GM using smart-selected hand: ${gmHand.name}`);
                    return gmHand;
                }
            } else {
                // For players, avoid GM hands
                const playerHand = hands.find(hand => {
                    const handName = hand.name.toLowerCase();
                    return !handName.includes('gm') && 
                           !handName.includes('гм') &&
                           !handName.includes('master') &&
                           !handName.includes(gmPrefix.toLowerCase());
                });
                if (playerHand) {
                    console.log(`[${MODULE_ID}] Player using smart-selected hand: ${playerHand.name}`);
                    return playerHand;
                }
            }
        }
        
        return null;
    },

    // ===== FANCY DISPLAY METHODS =====
    
    /**
     * Display a single card with fancy effects
     * @param {Object} card - The card object to display
     * @param {Object} options - Display options
     * @param {boolean} options.faceDown - Show card face down
     * @param {boolean} options.dramaticReveal - Use dramatic reveal animation
     * @param {boolean} options.share - Share with all players
     */
    async displayCardFancy(card, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) {
            console.log(`[${MODULE_ID}] Fancy display is disabled, falling back to basic display`);
            return this.useCardAndChat(card);
        }

        try {
            const { faceDown = false, dramaticReveal = false, share = false } = options;
            
            // Extract card properties
            const cardData = {
                front: card.img || card.faces?.[0]?.img,
                back: card.back?.img || card.faces?.[0]?.back?.img || null,
                name: card.name,
                id: card.id
            };

            if (!cardData.front) {
                console.warn(`[${MODULE_ID}] Card has no image to display:`, card);
                return this.useCardAndChat(card);
            }

            // Create fancy display
            new FancyDisplay({
                imgArray: [cardData],
                faceDown: faceDown,
                borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                borderWidth: Utils.getSettingSafe("defaultCardBorderWidth", "8px"),
                glowColor: Utils.getSettingSafe("defaultCardGlowColor", "rgb(210 154 56 / 30%)")
            }).render(share, dramaticReveal);

            // Play sound effect
            if (SFX && SFX.play) {
                SFX.play(SFX.sounds.use); // Use the 'use' sound for card flip
            }

        } catch (error) {
            console.error(`[${MODULE_ID}] Error in fancy display:`, error);
            // Fallback to basic display
            this.useCardAndChat(card);
        }
    },

    /**
     * Display multiple cards with fancy effects
     * @param {Array} cards - Array of card objects
     * @param {Object} options - Display options
     */
    async displayCardsFancy(cards, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) {
            console.log(`[${MODULE_ID}] Fancy display is disabled`);
            return;
        }

        try {
            const { faceDown = false, dramaticReveal = false, share = false } = options;
            
            // Convert cards to fancy display format
            const imgArray = cards.map(card => ({
                front: card.img || card.faces?.[0]?.img,
                back: card.back?.img || null,
                name: card.name,
                id: card.id
            })).filter(card => card.front); // Filter out cards without images

            if (imgArray.length === 0) {
                console.warn(`[${MODULE_ID}] No cards with images found to display`);
                return;
            }

            // Create fancy display
            new FancyDisplay({
                imgArray: imgArray,
                faceDown: faceDown,
                borderColor: Utils.getSettingSafe("defaultCardBorderColor", "#d29a38"),
                borderWidth: Utils.getSettingSafe("defaultCardBorderWidth", "8px"),
                glowColor: Utils.getSettingSafe("defaultCardGlowColor", "rgb(210 154 56 / 30%)")
            }).render(share, dramaticReveal);

            // Play sound effect
            if (SFX && SFX.play) {
                SFX.play("cardDraw");
            }

        } catch (error) {
            console.error(`[${MODULE_ID}] Error in fancy card display:`, error);
        }
    },

    /**
     * Draw cards from a deck with fancy display
     * @param {string} deckName - Name of the deck to draw from
     * @param {Object} options - Draw options
     */
    async drawCardsFancy(deckName, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) {
            console.log(`[${MODULE_ID}] Fancy display is disabled`);
            return;
        }

        try {
            const { quantity = 1, share = false, face = null, discardPileName = null } = options;
            
            const dealer = new CardDealer({
                deckName: deckName,
                discardPileName: discardPileName
            });

            await dealer.draw({
                quantity: quantity,
                share: share,
                face: face
            });

        } catch (error) {
            console.error(`[${MODULE_ID}] Error drawing cards with fancy display:`, error);
        }
    },

    /**
     * View existing cards with fancy display
     * @param {Array|string} cards - Card IDs or card objects
     * @param {string} deckName - Name of the deck containing the cards
     * @param {Object} options - View options
     */
    async viewCardsFancy(cards, deckName, options = {}) {
        if (!Utils.getSettingSafe("enableFancyDisplay", true)) {
            console.log(`[${MODULE_ID}] Fancy display is disabled`);
            return;
        }

        try {
            const { faceDown = false, dramaticReveal = false, share = false, whisper = false } = options;
            
            const dealer = new CardDealer({
                deckName: deckName
            });

            await dealer.view(cards, faceDown, whisper, dramaticReveal, share);

        } catch (error) {
            console.error(`[${MODULE_ID}] Error viewing cards with fancy display:`, error);
        }
    },

    /**
     * Setup hooks for card icon clicks in chat and deck interfaces
     */
    setupFancyDisplayHooks() {
        // Hook for chat messages to enable card icon clicks
        Hooks.on('renderChatMessage', (message, html, data) => {
            this._setupCardClickHandlers(html);
        });

        // Also setup handlers for existing messages when the UI is ready
        Hooks.on('renderChatLog', (chatLog, html, data) => {
            this._setupCardClickHandlers(html);
        });

        // Setup handlers immediately if chat is already rendered
        if (ui.chat && ui.chat.element) {
            this._setupCardClickHandlers(ui.chat.element);
        }
        
        // Setup card deck hooks
        this.setupCardDeckHooks();
    },

    _setupCardClickHandlers(html) {
        if (!Utils.getSettingSafe("enableCardIconClick", true)) return;
        
        // Ensure html is a jQuery object
        const $html = $(html);
        
        // Find card images in chat messages
        $html.find('img.card-face').each((i, img) => {
            // Skip if already has click handler
            if ($(img).data('click-handler-attached')) return;
            
            $(img).css('cursor', 'pointer');
            $(img).data('click-handler-attached', true);
            $(img).on('click', (evt) => {
                    evt.preventDefault();
                    const cardId = $(img).closest('[data-card]').data('card');
                    const deckName = $(img).closest('[data-deck]').data('deck');
                    
                    console.log(`[${MODULE_ID}] Card clicked: cardId=${cardId}, deckName=${deckName}`);
                    console.log(`[${MODULE_ID}] Available cards in game:`, game.cards.map(c => ({id: c.id, name: c.name, type: c.type})));
                    
                    if (cardId) {
                        // Try to find the card in the hand first
                        const hand = pokerHandGlobalState.hand;
                        let card = null;
                        
                        // Check if the card is in the current hand
                        if (hand && hand.cards) {
                            card = hand.cards.find(c => c.id === cardId);
                            console.log(`[${MODULE_ID}] Hand cards:`, hand.cards.map(c => ({id: c.id, name: c.name})));
                            console.log(`[${MODULE_ID}] Card found in hand:`, card ? card.name : 'not found');
                        }
                        
                        // If not found in hand, try all game cards
                        if (!card) {
                            // Search through all card stacks/decks
                            console.log(`[${MODULE_ID}] Searching through ${game.cards.size} card collections...`);
                            for (let deck of game.cards) {
                                const foundCard = deck.cards.get(cardId);
                                if (foundCard) {
                                    card = foundCard;
                                    console.log(`[${MODULE_ID}] Found card in deck "${deck.name}":`, card.name);
                                    break;
                                }
                            }
                        }
                        
                        // If still not found, try direct game.cards.get
                        if (!card) {
                            card = game.cards.get(cardId);
                            console.log(`[${MODULE_ID}] Direct game.cards.get result:`, card ? card.name : 'not found');
                        }
                        
                        if (card) {
                            console.log(`[${MODULE_ID}] Found card: ${card.name}`);
                            this.displayCardFancy(card, {
                                faceDown: false,
                                dramaticReveal: false,
                                share: false
                            });
                        } else {
                            console.warn(`[${MODULE_ID}] Card not found: ${cardId}`);
                        }
                    } else {
                        console.warn(`[${MODULE_ID}] Missing card ID`);
                    }
                });
        });
    },

    // Hook for card deck interfaces
    setupCardDeckHooks() {
        Hooks.on('renderCardsConfig', (app, html, data) => {
            if (!Utils.getSettingSafe("enableCardIconClick", true)) return;
            
            // Ensure html is a jQuery object
            const $html = $(html);
            
            // Find card images in deck interface
            $html.find('img.card-face, .cards img.face').each((i, img) => {
                $(img).css('cursor', 'pointer');
                $(img).on('click', (evt) => {
                    evt.preventDefault();
                    const cardId = $(img).closest('li').data('card-id');
                    const deck = data.cards.find(c => c._id === cardId);
                    
                    if (deck) {
                        this.viewCardsFancy([cardId], deck.source.name, {
                            faceDown: deck.face === null,
                            dramaticReveal: false,
                            share: false
                        });
                    }
                });
            });
        });
    }
};

export { CardSystem };
