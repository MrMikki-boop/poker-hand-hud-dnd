/* ===== POKER HAND HUD - CARD DEALER ===== */
/**
 * @fileoverview Card dealer system for drawing and viewing cards with fancy display
 * @author Poker Hand HUD Team
 * @version 2.0.0
 * Adapted from orcnog-card-viewer module
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import FancyDisplay from './fancy-display.js';

class CardDealer {
    constructor({deckName, discardPileName}) {
        this.deckName = null;
        this.deck = null;
        this.pile = null;

        this.initPromise = new Promise((resolve) => {
            this._initPromiseResolve = resolve;
        });

        this._initialize(deckName, discardPileName)
            .catch((error) => {
                console.error(`[${MODULE_ID}] Error initializing CardDealer:`, error);
            });
    }

    async _initialize(deckName, discardPileName) {
        if (!deckName) {
            console.warn(`[${MODULE_ID}] Deck name not provided.`);
            return;
        }

        this.deckName = deckName;

        // Get the deck by name
        const deck = game.cards.getName(deckName);
        if (!deck) {
            console.warn(`[${MODULE_ID}] No deck by that name was found: ${deckName}`);
            return;
        }

        this.deck = deck;
        if (discardPileName) {
            this.pile = await this._getDiscardPile(discardPileName);
        }

        // Resolve the initialization promise to indicate completion
        this._initPromiseResolve();
    }

    /**
     * Draw one or more random cards and display them
     * @param {Object} options Options for drawing cards
     * @param {number} options.quantity How many cards to draw (default is 1)
     * @param {boolean} options.share Whether to automatically share card to all other players on display
     * @param {string} options.face Force card to display as "up", "down", or "reveal" (for a dramatic reveal)
     */
    async draw({ quantity = 1, share = true, face } = {}) {
        let deckName, deck, pile;
        try {
            await this.initPromise;

            deckName = this.deckName;
            deck = this.deck;

            // At this point, it is mandatory that we have a discard pile.
            if (!this.pile) this.pile = await this._createNewDiscardPile();

            pile = this.pile;
        } catch (error) {
            console.error(`[${MODULE_ID}] Error in CardDealer.draw():`, error);
            return;
        }

        try {
            // Draw 1 or more random cards and grab reference to the drawn card
            await pile.draw(deck, quantity, {
                how: CONST.CARD_DRAW_MODES.RANDOM,
                action: `draw ${MODULE_ID}_nohook`
            });
        } catch(error) {
            // Foundry doesn't like custom action names, but it still draws the card
            if (error && error.message
                && !error.message.toLowerCase().includes('replace')
                && !error.message.toLowerCase().includes('str is undefined'))
            {
                console.error(`[${MODULE_ID}]`, error);
                return null;
            }
        }

        try {
            const drawnCards = pile.cards.contents.slice(-quantity);
            const cardFaceLogic = Utils.getSettingSafe("whatDeterminesCardFaceOnDraw", "source");
            const faceDown =
                  face && face.toLowerCase() === "down" ? true :
                  face && (face.toLowerCase() === "up" || face.toLowerCase() === "reveal") ? false :
                  cardFaceLogic === "alwaysdown" ? true :
                  cardFaceLogic === "alwaysup" ? false :
                  drawnCards[0].face === null; // if no forced `face`, then use the first card's face property

            const dramaticReveal = face && face.toLowerCase() === 'reveal' || 
                                 (!face && Utils.getSettingSafe("enableDramaticRevealOnDraw", false) === true);

            // Prepare an array to hold the card images
            const drawnArray = drawnCards.map(drawnCard => {
                const { id, name, front, back, desc } = this._extractCardProperties(drawnCard);
                return { id, name, front, back, desc };
            });

            if (Utils.getSettingSafe("enableDisplayOnDraw", true)) {
                // Display all cards with a single FancyDisplay instance
                new FancyDisplay({
                    imgArray: drawnArray,
                    faceDown: faceDown,
                }).render(share, dramaticReveal);
            }

            if (Utils.getSettingSafe("enableWhisperCardTextToDM", false)) {
                // Whisper card instructions to the DM
                drawnArray.forEach(({ id, name, front, desc }) => {
                    this._whisperCardInstructions({ deckName, cardId: id, cardName: name, front, desc });
                });
            }
        } catch (error) {
            console.error(`[${MODULE_ID}] Error in CardDealer.draw():`, error);
        }
    }

    /**
     * View a card (but do not draw it)
     * @param {Array|string} cards This can be an array of strings or a single string, which can be card ID or exact name.
     * @param {boolean} faceDown Optional, tells the viewer whether to render the card face-down or not (default is true)
     * @param {boolean} whisper Optional, tells the viewer whether to whisper card details to DM on view (default is false)
     * @param {boolean} dramaticReveal Optional, tells the viewer whether to show the card facedown at first, then automatically flip it over (default is false)
     * @param {boolean} share Optional, tells the viewer whether to share to all players or not (default is false)
     */
    async view(cards, faceDown = true, whisper = false, dramaticReveal = false, share = false) {
        try {
            const deck = this.deck;
            const deckName = this.deckName;
            const showFaceDown = faceDown;
            const doWhisper = whisper;
            const shareToAll = share;

            // Normalize cards input to always be an array
            const cardsArray = Array.isArray(cards) ? cards : [cards];

            if (!cardsArray || cardsArray.length === 0) {
                console.warn(`[${MODULE_ID}] Please provide a card name or ID.`);
                return;
            }

            const cardImgsArray = [];

            for (const card of cardsArray) {
                let cardToView = this._findCardAnywhere(card);

                if (!cardToView) {
                    console.warn(`[${MODULE_ID}] ${card}: No card by that ID or name was found.`);
                    continue;
                }

                // Extract card properties
                const { id, name, front, back, desc } = this._extractCardProperties(cardToView);

                cardImgsArray.push({ front, back });

                if (doWhisper) {
                    // Whisper card instructions to the DM
                    this._whisperCardInstructions({ deckName, cardId: id, cardName: name, front, desc });
                }
            }

            if (cardImgsArray.length > 0) {
                // Display with fancy card viewer module
                new FancyDisplay({
                    imgArray: cardImgsArray,
                    faceDown: showFaceDown,
                }).render(shareToAll, dramaticReveal);
            }

        } catch (error) {
            console.error(`[${MODULE_ID}] Error in CardDealer.view():`, error);
        }
    }

    // Given a card ID string, find and return card no matter what stack it currently lives in
    _findCardAnywhere(cardStr) {
        let card = game.cards.find(stack => stack.cards.get(cardStr))?.cards.get(cardStr);
        card = card || game.cards.find(stack => stack.cards.getName(cardStr))?.cards.getName(cardStr);
        return card;
    }

    // Get the discard pile by name, or smart detect a discard pile's existence and get that, or create a new one.
    async _getDiscardPile(discardPileName) {
        let pile;
        if (!discardPileName) {
            // If no name provided, then lookup piles and try to smart-match by deck name.
            const matchedPileName = this._smartMatchDiscardName(this.deckName);
            pile = game.cards.getName(matchedPileName);
            if (pile) console.log(`[${MODULE_ID}] No discard pile name provided. Found a discard pile named "${matchedPileName}", which will be used.`);
        } else {
            // Try to get an existing discard pile by name provided
            pile = game.cards.getName(discardPileName);
            // If that didn't work, create a new discard pile by name provided.
            if (!pile) {
                console.log(`[${MODULE_ID}] No pile found by name "${discardPileName}". Creating a new discard pile by that name.`);
                pile = await Cards.create({ name: discardPileName, type: "pile" });
            }
        }
        return pile;
    }

    // Create a new discard pile by deck name.
    async _createNewDiscardPile(discardPileName) {
        const newPileName = discardPileName || `${this.deckName} - Discard Pile`;
        const pile = this.pile || await Cards.create({ name: newPileName, type: "pile" });
        return pile;
    }

    _smartMatchDiscardName(name) {
        // Words that can be ignored when attempting to match deck name to a potential discard pile's name
        const stopwords = ["the", "thy", "a", "an", "in", "on", "of", "for", "de", "le", "la", "el", "los", "las", "deck", "cards", "card"];

        // Words that, if matched in a card stack's name, signify that it is potentially a discard pile
        const matchwordsOr = ["discard", "drawn", "played", "used"];

        const namePattern = new RegExp(name.replace(new RegExp(`\\b(?:${stopwords.join("|")})\\b\\s*`, "gi"), ""), "i");
        const discardPattern = new RegExp(`(?:${matchwordsOr.join("|")})`, "i");
        const fallbackPattern = /Discard(?:\s+Pile)?/i;

        for (const [deckId, deck] of game.cards.entries()) {
            if ((namePattern.test(deck.name) && discardPattern.test(deck.name)) || fallbackPattern.test(deck.name)) {
                console.log(`[${MODULE_ID}] Discard Pile found for deck "${name}":`, deck.name);
                return deck.name;
            }
        }

        return null;
    }

    _extractCardProperties(card) {
        const id = card._id;
        const name = card.faces[0].name;
        const front = card.faces[0].img;
        const back = card.back?.img || null;
        const desc = card.faces[0].text || '';

        return { id, name, front, back, desc };
    }

    _whisperCardInstructions({ deckName, cardId, cardName, front, desc }) {
        const dm = game.users.find(u => u.isGM && u.active);
        if (!dm) {
            console.warn(`[${MODULE_ID}] GM user not found.`);
            return;
        }

        const messageContent = `<div class="card-draw ${MODULE_ID}-msg flexrow" data-deck="${deckName}" data-card="${cardId}">
                <img class="card-face" src="${front}" alt="${cardName}" />
                <h4 class="card-name">${cardName}</h4>
            </div>
            <p>${desc}</p>`;

        ChatMessage.create({ content: messageContent, whisper: [dm._id] });
    }
}

export default CardDealer;
