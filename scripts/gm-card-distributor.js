/* ===== POKER HAND HUD/* ===== GM CARD DISTRIBUTOR ===== */
/**
 * @fileoverview GM Card Distribution System
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

console.log(`GM Card Distributor file loaded`);

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';

console.log(`[${MODULE_ID}] GM Card Distributor initialized`);
console.log(`[${MODULE_ID}] MODULE_ID value:`, MODULE_ID);

/**
 * Система раздачи карт для ГМа с интеграцией Foundry Cards
 * @class GMCardDistributor
 */
class GMCardDistributor {
    constructor() {
        this.selectedPlayers = new Set();
        this.selectedDeck = null;
        this.availableDecks = [];
    }

    /**
     * Получает рубашку карты с правильным приоритетом
     * @param {CardDocument} card - Карта
     * @param {string} cardBackStyle - Стиль рубашки ('dark' или 'light')
     * @returns {string|null} URL рубашки карты
     */
    static getCardBack(card, cardBackStyle = 'dark') {
        console.log(`[${MODULE_ID}] Getting card back for "${card.name}":`, {
            card: card,
            cardType: card.type,
            cardId: card.id,
            back: card.back,
            faces: card.faces,
            facesBack: card.faces?.back,
            facesBackSrc: card.faces?.back?.src,
            system: card.system,
            systemBack: card.system?.back,
            texture: card.texture,
            textureBack: card.texture?.back,
            document: card.document,
            documentFaces: card.document?.faces,
            documentFacesBack: card.document?.faces?.back,
            toObject: card.toObject,
            toObjectResult: card.toObject ? card.toObject() : null,
            parent: card.parent,
            parentImg: card.parent?.img,
            parentType: card.parent?.type,
            // Проверяем другие возможные свойства
            img: card.img,
            src: card.src,
            data: card.data,
            _source: card._source,
            flags: card.flags,
            // Все ключи объекта
            allKeys: Object.keys(card),
            // Проверяем вложенные объекты
            prototype: Object.getPrototypeOf(card)
        });
        
        // 1. Собственная рубашка карты
        if (card.back && typeof card.back === 'object') {
            console.log(`[${MODULE_ID}] Using card.back object:`, card.back);
            // Если back это объект, пробуем получить img из него
            if (card.back.img) {
                console.log(`[${MODULE_ID}] Using card.back.img:`, card.back.img);
                return card.back.img;
            }
            // Пробуем другие свойства объекта back
            if (card.back.src) {
                console.log(`[${MODULE_ID}] Using card.back.src:`, card.back.src);
                return card.back.src;
            }
            if (card.back.text && card.back.text.includes('drama-cards')) {
                console.log(`[${MODULE_ID}] Using card.back.text path:`, card.back.text);
                return card.back.text;
            }
        } else if (card.back && typeof card.back === 'string') {
            console.log(`[${MODULE_ID}] Using card.back string:`, card.back);
            return card.back;
        }
        
        // 2. Рубашка в faces
        if (card.faces && card.faces.back && card.faces.back.src) {
            console.log(`[${MODULE_ID}] Using card.faces.back.src:`, card.faces.back.src);
            return card.faces.back.src;
        }
        
        // 3. Рубашка в system
        if (card.system && card.system.back) {
            console.log(`[${MODULE_ID}] Using card.system.back:`, card.system.back);
            return card.system.back;
        }
        
        // 4. Рубашка в texture
        if (card.texture && card.texture.back) {
            console.log(`[${MODULE_ID}] Using card.texture.back:`, card.texture.back);
            return card.texture.back;
        }
        
        // 5. Рубашка в document.faces
        if (card.document && card.document.faces && card.document.faces.back) {
            const back = card.document.faces.back.src || card.document.faces.back;
            console.log(`[${MODULE_ID}] Using card.document.faces.back:`, back);
            return back;
        }
        
        // 6. Рубашка в toObject().faces
        if (card.toObject && card.toObject().faces && card.toObject().faces.back) {
            const cardObj = card.toObject();
            const back = cardObj.faces.back.src || cardObj.faces.back;
            console.log(`[${MODULE_ID}] Using toObject().faces.back:`, back);
            return back;
        }
        
        // 7. Проверяем data._source или другие возможные места
        if (card.data && card.data._source && card.data._source.back) {
            console.log(`[${MODULE_ID}] Using card.data._source.back:`, card.data._source.back);
            return card.data._source.back;
        }
        
        // 8. Проверяем _source.back
        if (card._source && card._source.back) {
            console.log(`[${MODULE_ID}] Using card._source.back:`, card._source.back);
            return card._source.back;
        }
        
        // 9. Проверяем флаги модуля drama-cards
        if (card.flags && card.flags['drama-cards-ru'] && card.flags['drama-cards-ru'].back) {
            console.log(`[${MODULE_ID}] Using drama-cards-ru flag back:`, card.flags['drama-cards-ru'].back);
            return card.flags['drama-cards-ru'].back;
        }
        
        // 10. Проверяем metadata изображения
        if (card.img && typeof card.img === 'string') {
            // Если путь к изображению содержит /back.webp, используем его
            if (card.img.includes('/back.webp')) {
                console.log(`[${MODULE_ID}] Found back in img path:`, card.img);
                return card.img;
            }
            
            // Пробуем извлечь рубашку из пути изображения
            const imgPath = card.img.substring(0, card.img.lastIndexOf('/'));
            const possibleBack = `${imgPath}/back.webp`;
            console.log(`[${MODULE_ID}] Trying possible back from img path:`, possibleBack);
            
            // Проверяем существует ли такой путь (простая проверка)
            if (possibleBack.includes('drama-cards-ru')) {
                console.log(`[${MODULE_ID}] Using drama-cards back from path:`, possibleBack);
                return possibleBack;
            }
        }
        
        // 11. Рубашка родительской колоды
        if (card.parent && card.parent.type === 'deck' && card.parent.img) {
            console.log(`[${MODULE_ID}] Using parent deck back:`, card.parent.img);
            return card.parent.img;
        }
        
        // 12. Рубашка по умолчанию из модуля
        const backFileName = cardBackStyle === 'dark' ? 'dark-gold.webp' : 'light-soft.webp';
        const modulePath = `modules/poker-hand-hud-dnd`;
        const defaultBack = `${modulePath}/backs/${backFileName}`;
        console.log(`[${MODULE_ID}] Using default module back:`, defaultBack);
        return defaultBack;
    }

    /**
     * Получает список доступных колод (Cards)
     * @returns {Promise<{id: string, name: string, cards: CardDocument[]}[]>}
     */
    async getAvailableDecks() {
        try {
            console.log(`[${MODULE_ID}] Starting deck search...`);
            
            // Метод 1: game.cards.contents
            let allCards = game.cards?.contents || [];
            console.log(`[${MODULE_ID}] Method 1 - Found ${allCards.length} total cards in game.cards.contents`);
            
            // Метод 2: game.collections.get('cards')
            if (!allCards.length && game.collections?.get('cards')) {
                allCards = Array.from(game.collections.get('cards').values());
                console.log(`[${MODULE_ID}] Method 2 - Found ${allCards.length} cards from collections`);
            }
            
            // Метод 3: UI.tabs
            if (!allCards.length && ui.tabs && ui.tabs.cards) {
                allCards = ui.tabs.cards.contents || [];
                console.log(`[${MODULE_ID}] Method 3 - Found ${allCards.length} cards from ui.tabs`);
            }
            
            // Метод 4: Прямой поиск всех документов типа 'card'
            if (!allCards.length) {
                allCards = game.actors?.flatMap(actor => 
                    actor.items?.filter(item => item.type === 'card') || []
                ) || [];
                console.log(`[${MODULE_ID}] Method 4 - Found ${allCards.length} cards from actors`);
            }
            
            console.log(`[${MODULE_ID}] Total cards found: ${allCards.length}`);
            
            if (!allCards.length) {
                console.warn(`[${MODULE_ID}] No cards found with any method`);
                ui.notifications.warn('Карты не найдены. Убедитесь что:\n1. В мире есть колоды карт\n2. Колоды содержат карты\n3. У вас есть права на просмотр карт');
                return [];
            }

            // Выводим детальную информацию о картах
            allCards.forEach((card, index) => {
                console.log(`[${MODULE_ID}] Card ${index + 1}:`, {
                    name: card.name,
                    type: card.type,
                    id: card.id,
                    parent: card.parent,
                    parentName: card.parent?.name,
                    parentType: card.parent?.documentName,
                    hasParent: !!card.parent
                });
            });

            // Фильтруем только настоящие колоды (type: 'deck')
            const allDecks = allCards.filter(card => card.type === 'deck');
            console.log(`[${MODULE_ID}] Found ${allDecks.length} actual decks out of ${allCards.length} total cards`);
            
            if (!allDecks.length) {
                console.warn(`[${MODULE_ID}] No decks found with type 'deck'`);
                ui.notifications.warn('Колоды не найдены. Убедитесь что:\n1. В мире есть колоды карт (type: deck)\n2. Колоды содержат карты\n3. У вас есть права на просмотр карт');
                return [];
            }

            // Группируем карты по родительским колодам
            const decksMap = new Map();
            
            // Добавляем настоящие колоды
            allDecks.forEach(deck => {
                console.log(`[${MODULE_ID}] Processing deck: ${deck.name} (${deck.id})`);
                console.log(`[${MODULE_ID}] Deck cards count: ${deck.cards?.size || 0}`);
                
                // Извлекаем полноценные CardDocument объекты
                const deckCards = [];
                if (deck.cards) {
                    for (const [cardId, card] of deck.cards.entries()) {
                        // Ищем полноценный CardDocument по ID
                        const fullCard = game.cards.get(cardId);
                        if (fullCard) {
                            deckCards.push(fullCard);
                            console.log(`[${MODULE_ID}] Found full card document for "${card.name}":`, fullCard.name);
                        } else {
                            // Пробуем найти по имени
                            const cardByName = game.cards?.contents?.find(c => c.name === card.name);
                            if (cardByName) {
                                deckCards.push(cardByName);
                                console.log(`[${MODULE_ID}] Using card found by name:`, cardByName.name);
                            } else {
                                // Если не нашли, используем упрощенный объект
                                deckCards.push(card);
                                console.log(`[${MODULE_ID}] Using simplified card object for "${card.name}"`);
                            }
                        }
                    }
                }
                
                decksMap.set(deck.id, {
                    id: deck.id,
                    name: deck.name,
                    cards: deckCards
                });
                
                console.log(`[${MODULE_ID}] Added deck "${deck.name}" with ${deckCards.length} full card documents`);
            });

            const decks = Array.from(decksMap.values());
            console.log(`[${MODULE_ID}] Final decks found:`, decks.map(d => `${d.name} (${d.cards.length} карт)`));
            
            // Фильтруем только колоды с картами
            const validDecks = decks.filter(deck => deck.cards.length > 0);
            console.log(`[${MODULE_ID}] Valid decks after filtering:`, validDecks.map(d => `${d.name} (${d.cards.length} карт)`));
            
            if (!validDecks.length) {
                console.warn(`[${MODULE_ID}] No valid decks found after filtering`);
                ui.notifications.warn('Не найдено колод с картами. Проверьте что в колодах есть карты.');
                return [];
            }
            
            return validDecks;
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to get available decks:`, error);
            ui.notifications.error('Не удалось получить список колод: ' + error.message);
            return [];
        }
    }

    /**
     * Передает карту игроку
     * @param {CardDocument} card - Карта для передачи
     * @param {User} player - Игрок-получатель
     * @param {string} deckId - ID оригинальной колоды (опционально)
     * @returns {Promise<boolean>}
     */
    async passCardToPlayer(card, player, deckId = null) {
        try {
            console.log(`[${MODULE_ID}] Passing card "${card.name}" to player "${player.name}"`);
            console.log(`[${MODULE_ID}] Player ID: ${player.id}, Player name: "${player.name}"`);
            
            // Ищем или создаем руку игрока
            let playerHand = null;
            
            // Используем систему назначения рук для получения руки игрока
            const assignedHandName = HandAssignmentSystem.getUserAssignedHand(player.id);
            if (assignedHandName) {
                console.log(`[${MODULE_ID}] Found assigned hand for player ${player.name}: "${assignedHandName}"`);
                
                // Ищем руку по назначенному имени
                const allCards = game.cards?.contents || [];
                playerHand = allCards.find(c => 
                    c.type === 'hand' && 
                    c.name.toLowerCase() === assignedHandName.toLowerCase()
                );
                
                if (playerHand) {
                    console.log(`[${MODULE_ID}] Found assigned hand: "${playerHand.name}" (ID: ${playerHand.id})`);
                } else {
                    console.log(`[${MODULE_ID}] Assigned hand "${assignedHandName}" not found, creating new one...`);
                }
            } else {
                console.log(`[${MODULE_ID}] No hand assigned to player ${player.name}`);
            }
            
            if (playerHand) {
                console.log(`[${MODULE_ID}] Found existing hand for player ${player.name}: "${playerHand.name}" (ID: ${playerHand.id}, type: ${playerHand.type})`);
                
                // Проверяем и обновляем права доступа если нужно
                if (playerHand.ownership[player.id] !== 3) {
                    console.log(`[${MODULE_ID}] Updating ownership for player ${player.name} on hand "${playerHand.name}"`);
                    await playerHand.update({
                        ownership: {
                            ...playerHand.ownership,
                            [player.id]: 3
                        }
                    });
                }
            } else {
                console.log(`[${MODULE_ID}] No hand found for player ${player.name}, creating one...`);
                
                // Метод 2: Создаем новую руку для игрока
                const handData = {
                    name: `Рука ${player.name}`,
                    type: 'hand',
                    img: 'icons/svg/hand.svg',
                    description: `Карточная рука игрока ${player.name}`,
                    ownership: {
                        default: 0,
                        [player.id]: 3 // Даем игроку полный доступ
                    }
                };
                
                playerHand = await Cards.create(handData);
                console.log(`[${MODULE_ID}] Created hand "${playerHand.name}" (ID: ${playerHand.id}) for player ${player.name}`);
            }
            
            // Передаем карту в руку игрока
            console.log(`[${MODULE_ID}] Passing card "${card.name}" to hand "${playerHand.name}"`);
            
            // Сохраняем ID оригинальной колоды в данных карты перед передачей
            if (deckId) {
                console.log(`[${MODULE_ID}] Attempting to save originalDeckId "${deckId}" for card "${card.name}"`);
                console.log(`[${MODULE_ID}] Card structure:`, {
                    id: card.id,
                    name: card.name,
                    type: card.type,
                    hasSystem: !!card.system,
                    systemKeys: card.system ? Object.keys(card.system) : null,
                    hasFlags: !!card.flags,
                    canUpdate: card.canUserModify(game.user, "update")
                });
                
                try {
                    // Пробуем сохранить в системных данных
                    const updateData = {};
                    if (card.system) {
                        updateData["system.originalDeckId"] = deckId;
                    } else {
                        // Если нет системных данных, создаем их
                        updateData["system"] = { originalDeckId: deckId };
                    }
                    
                    await card.update(updateData);
                    console.log(`[${MODULE_ID}] Successfully set originalDeckId "${deckId}" in system data of card "${card.name}"`);
                } catch (systemError) {
                    console.warn(`[${MODULE_ID}] Failed to set originalDeckId in system data:`, systemError);
                    
                    // Пробуем флаги как fallback
                    try {
                        await card.setFlag(MODULE_ID, 'originalDeckId', deckId);
                        console.log(`[${MODULE_ID}] Set originalDeckId flag "${deckId}" on card "${card.name}"`);
                    } catch (flagError) {
                        console.warn(`[${MODULE_ID}] Failed to set originalDeckId flag on card "${card.name}":`, flagError);
                        
                        // Последний вариант - сохраняем в _source
                        try {
                            card._source.originalDeckId = deckId;
                            console.log(`[${MODULE_ID}] Set originalDeckId "${deckId}" in _source of card "${card.name}"`);
                        } catch (sourceError) {
                            console.warn(`[${MODULE_ID}] Failed to set originalDeckId in _source:`, sourceError);
                        }
                    }
                }
            }
            
            await card.pass(playerHand);
            console.log(`[${MODULE_ID}] Card "${card.name}" successfully passed to player "${player.name}"`);
            
            // Обновляем HUD игрока
            try {
                // Находим руку игрока для обновления HUD
                const allCards = game.cards?.contents || [];
                const playerHand = allCards.find(c => 
                    c.name.toLowerCase().includes(player.name.toLowerCase())
                );
                
                if (playerHand) {
                    console.log(`[${MODULE_ID}] Card passed to player ${player.name}, their HUD should update automatically via hooks`);
                    // Не вызываем renderCards здесь - пусть хуки обновят HUD на стороне игрока
                } else {
                    console.warn(`[${MODULE_ID}] Player hand not found for ${player.name}`);
                }
            } catch (hudError) {
                console.warn(`[${MODULE_ID}] Failed to handle player HUD update:`, hudError);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to pass card to player:`, error);
            ui.notifications.error(`Не удалось передать карту игроку ${player.name}: ${error.message}`);
            return false;
        }
    }

    /**
     * Выбирает случайные карты из колоды
     * @param {CardDocument[]} cards - Массив карт или колода
     * @param {number} count - Количество карт для выбора
     * @returns {CardDocument[]}
     */
    selectRandomCards(cards, count = 3) {
        console.log(`[${MODULE_ID}] selectRandomCards called with:`, {
            cardsCount: cards.length,
            requestedCount: count,
            firstCard: cards[0],
            cardTypes: cards.map(c => ({name: c.name, type: c.type, hasParent: !!c.parent}))
        });

        // Проверяем, что переданы именно карты, а не колоды
        if (!cards || cards.length === 0) {
            console.warn(`[${MODULE_ID}] No cards provided to selectRandomCards`);
            return [];
        }

        // Если передана одна колода (type: "deck"), извлекаем её карты
        if (cards.length === 1 && cards[0].type === 'deck' && cards[0].cards) {
            console.log(`[${MODULE_ID}] Deck object provided. Extracting cards from deck "${cards[0].name}"`);
            console.log(`[${MODULE_ID}] Deck contains ${cards[0].cards.size} cards`);
            
            // Извлекаем полноценные CardDocument объекты
            const deckCards = [];
            console.log(`[${MODULE_ID}] All cards in game.cards:`, game.cards?.contents?.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type
            })));
            
            for (const [cardId, card] of cards[0].cards.entries()) {
                console.log(`[${MODULE_ID}] Looking for card with ID: ${cardId}`);
                console.log(`[${MODULE_ID}] Simplified card data:`, {
                    id: card.id,
                    name: card.name,
                    img: card.img
                });
                
                // Ищем полноценный CardDocument по ID
                const fullCard = game.cards.get(cardId);
                console.log(`[${MODULE_ID}] Found full card:`, !!fullCard);
                if (fullCard) {
                    console.log(`[${MODULE_ID}] Full card details:`, {
                        id: fullCard.id,
                        name: fullCard.name,
                        type: fullCard.type,
                        back: fullCard.back,
                        faces: fullCard.faces,
                        system: fullCard.system
                    });
                    deckCards.push(fullCard);
                } else {
                    // Пробуем найти по имени
                    const cardByName = game.cards?.contents?.find(c => c.name === card.name);
                    console.log(`[${MODULE_ID}] Found card by name:`, !!cardByName);
                    if (cardByName) {
                        deckCards.push(cardByName);
                        console.log(`[${MODULE_ID}] Using card found by name:`, cardByName.name);
                    } else {
                        // Если не нашли, используем упрощенный объект но с дополнительными данными
                        deckCards.push(card);
                        console.log(`[${MODULE_ID}] Using simplified card object for "${card.name}"`);
                    }
                }
            }
            cards = deckCards;
            
            console.log(`[${MODULE_ID}] Extracted ${cards.length} full card documents from deck`);
        }

        // Если передана одна карта без типа, ищем настоящие карты
        else if (cards.length === 1 && cards[0].name && !cards[0].type) {
            console.log(`[${MODULE_ID}] Looks like a deck was passed instead of cards. Searching for actual cards...`);
            
            // Ищем все карты в мире
            const allCards = game.cards?.contents || [];
            const actualCards = allCards.filter(card => 
                card.parent && card.parent.id === cards[0].id
            );
            
            console.log(`[${MODULE_ID}] Found ${actualCards.length} actual cards in deck "${cards[0].name}"`);
            
            if (actualCards.length > 0) {
                cards = actualCards;
            }
        }

        // Перемешиваем карты и выбираем нужное количество
        // Фильтруем только невыданные карты
        const availableCards = cards.filter(card => {
            // Проверяем что карта не выдана (не находится в руке или discard pile)
            const isDrawn = card.drawn !== undefined ? card.drawn : false;
            const isInHand = card.parent?.type === 'hand';
            const isInDiscard = card.parent?.type === 'pile';
            
            console.log(`[${MODULE_ID}] Card "${card.name}" availability:`, {
                isDrawn,
                isInHand,
                isInDiscard,
                parentType: card.parent?.type,
                available: !isDrawn && !isInHand && !isInDiscard
            });
            
            return !isDrawn && !isInHand && !isInDiscard;
        });
        
        console.log(`[${MODULE_ID}] Available cards for selection: ${availableCards.length} out of ${cards.length}`);
        
        if (availableCards.length === 0) {
            console.warn(`[${MODULE_ID}] No available cards to select from`);
            return [];
        }
        
        const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(count, availableCards.length));
        
        console.log(`[${MODULE_ID}] Selected ${selected.length} cards:`, selected.map(c => c.name));
        
        return selected;
    }

    /**
     * Создает диалог выбора игроков и колоды
     */
    async showDistributionDialog() {
        if (!game.user.isGM) {
            ui.notifications.error('Эта функция доступна только ГМу');
            return;
        }

        // Получаем доступных игроков
        const players = game.users.filter(u => u.role === CONST.USER_ROLES.PLAYER && u.active);
        
        // Получаем доступные колоды
        this.availableDecks = await this.getAvailableDecks();
        
        // Получаем последнюю использованную колоду или выбираем первую
        const lastDeckId = this.lastSelectedDeckId || (this.availableDecks.length > 0 ? this.availableDecks[0].id : '');
        const selectedDeck = this.availableDecks.find(deck => deck.id === lastDeckId);

        const dialogContent = `
            <div class="gm-card-distributor" style="
                padding: 0;
                min-width: 380px;
                font-family: 'Cinzel', serif;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            ">
                <!-- Контент -->
                <div style="padding: 25px;">
                    <!-- Игроки -->
                    <div class="section" style="margin-bottom: 25px;">
                        <h4 style="
                            margin: 0 0 15px 0;
                            color: #ffd700;
                            font-size: 16px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            <span style="color: #ff6b6b;">👥</span>
                            Выберите игроков:
                        </h4>
                        <div class="players-list" style="
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                            gap: 10px;
                            max-height: 200px;
                            overflow-y: auto;
                            padding: 15px;
                            border-radius: 10px;
                            background: rgba(0,0,0,0.4);
                            border: 2px solid rgba(255,215,0,0.3);
                        ">
                            ${players.map(player => `
                                <label class="player-checkbox" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 12px;
                                    cursor: pointer;
                                    padding: 12px;
                                    border-radius: 8px;
                                    background: rgba(255,255,255,0.05);
                                    border: 2px solid transparent;
                                    transition: all 0.3s ease;
                                    position: relative;
                                " onmouseover="this.style.background='rgba(255,215,0,0.1)'; this.style.borderColor='rgba(255,215,0,0.5)'" 
                                   onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='transparent'">
                                    <input type="checkbox" name="player" value="${player.id}" style="
                                        margin: 0;
                                        width: 18px;
                                        height: 18px;
                                        accent-color: #ffd700;
                                    ">
                                    <span style="
                                        color: #f0e6d2;
                                        font-weight: 500;
                                        font-size: 14px;
                                    ">${player.name}</span>
                                    <span style="
                                        position: absolute;
                                        top: 5px;
                                        right: 5px;
                                        width: 8px;
                                        height: 8px;
                                        background: #4caf50;
                                        border-radius: 50%;
                                        box-shadow: 0 0 10px rgba(76,175,80,0.8);
                                    " title="Игрок в сети"></span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Колода -->
                    <div class="section" style="margin-bottom: 25px;">
                        <h4 style="
                            margin: 0 0 15px 0;
                            color: #ffd700;
                            font-size: 16px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            <span style="color: #ff6b6b;">🃏</span>
                            Выберите колоду:
                        </h4>
                        <select name="deck" style="
                            width: 100%;
                            border: 2px solid rgba(255,215,0,0.3);
                            border-radius: 8px;
                            background: rgba(0,0,0,0.6);
                            color: #f0e6d2;
                            font-family: 'Cinzel', serif;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='rgba(255,215,0,0.6)'" 
                           onmouseout="this.style.borderColor='rgba(255,215,0,0.3)'">
                            ${selectedDeck ? `
                                <option value="${selectedDeck.id}" selected style="background: #1a1a1a;">
                                    � ${selectedDeck.name} (${selectedDeck.cards.length} карт)
                                </option>
                            ` : '<option value="" selected style="background: #1a1a1a;">� Выберите колоду...</option>'}
                            ${this.availableDecks.filter(deck => deck.id !== (selectedDeck?.id || '')).map(deck => `
                                <option value="${deck.id}" style="background: #1a1a1a;">
                                    🎴 ${deck.name} (${deck.cards.length} карт)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <!-- Настройки -->
                    <div class="section" style="margin-bottom: 25px;">
                        <h4 style="
                            margin: 0 0 15px 0;
                            color: #ffd700;
                            font-size: 16px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            <span style="color: #ff6b6b;">⚙️</span>
                            Настройки:
                        </h4>
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 15px;
                            padding: 15px;
                            background: rgba(0,0,0,0.4);
                            border-radius: 10px;
                            border: 2px solid rgba(255,215,0,0.3);
                        ">
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                color: #f0e6d2;
                                font-size: 14px;
                            ">
                                <span>🎯</span>
                                <span>Количество карт:</span>
                                <input type="number" name="cardCount" value="3" min="1" max="10" style="
                                    width: 70px;
                                    padding: 8px 12px;
                                    border: 2px solid rgba(255,215,0,0.3);
                                    border-radius: 6px;
                                    background: rgba(0,0,0,0.6);
                                    color: #ffd700;
                                    font-family: 'Cinzel', serif;
                                    font-size: 14px;
                                    text-align: center;
                                    transition: all 0.3s ease;
                                " onmouseover="this.style.borderColor='rgba(255,215,0,0.6)'" 
                                   onmouseout="this.style.borderColor='rgba(255,215,0,0.3)'">
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Футер с кнопками -->
                <div style="
                    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
                    padding: 20px;
                    border-top: 2px solid rgba(255,215,0,0.3);
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                ">
                    <button id="distribute-btn" style="
                        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                        border: 2px solid #2e7d32;
                        color: white;
                        font-weight: bold;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        box-shadow: 0 4px 15px rgba(76,175,80,0.4);
                        transition: all 0.3s ease;
                        cursor: pointer;
                    " onmouseover="this.style.background='linear-gradient(135deg, #45a049 0%, #4caf50 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(76,175,80,0.6)'" 
                       onmouseout="this.style.background='linear-gradient(135deg, #4caf50 0%, #45a049 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(76,175,80,0.4)'">
                        🎴 РАЗДАТЬ
                    </button>
                    <button id="cancel-btn" style="
                        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
                        border: 2px solid #c62828;
                        color: white;
                        font-weight: bold;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        box-shadow: 0 4px 15px rgba(244,67,54,0.4);
                        transition: all 0.3s ease;
                        cursor: pointer;
                    " onmouseover="this.style.background='linear-gradient(135deg, #d32f2f 0%, #f44336 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(244,67,54,0.6)'" 
                       onmouseout="this.style.background='linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(244,67,54,0.4)'">
                        ✖ ОТМЕНА
                    </button>
                </div>
            </div>
        `;

        const dialog = new Dialog({
            title: "🎴 Раздача карт",
            content: dialogContent,
            buttons: {},
            default: null,
            width: 380,
            height: 600
        });

        dialog.render(true);
        
        // Применяем кастомные стили и обработчики
        setTimeout(() => {
            const dialogElement = $(dialog.element);
            
            // Стили для заголовка окна
            dialogElement.find('.window-header').css({
                'background': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                'border-bottom': '2px solid rgba(255,215,0,0.3)',
                'border-radius': '15px 15px 0 0'
            });
            
            dialogElement.find('.window-title').css({
                'color': '#ffd700',
                'font-weight': 'bold',
                'text-shadow': '2px 2px 4px rgba(0,0,0,0.8)'
            });
            
            // Скрываем стандартные кнопки
            dialogElement.find('.dialog-buttons').hide();
            
            // Добавляем обработчики для кастомных кнопок
            dialogElement.find('#distribute-btn').on('click', () => {
                const html = dialogElement.find('.gm-card-distributor');
                this.distributeCards(html);
                dialog.close();
            });
            
            dialogElement.find('#cancel-btn').on('click', () => {
                dialog.close();
            });
        }, 100);
    }

    /**
     * Раздает карты выбранным игрокам
     * @param {jQuery} html - HTML элемент диалога
     */
    async distributeCards(html) {
        const selectedPlayerIds = html.find('input[name="player"]:checked').map((i, el) => el.value).get();
        
        if (selectedPlayerIds.length === 0) {
            ui.notifications.warn('Выберите хотя бы одного игрока');
            return;
        }

        const selectedDeckId = html.find('select[name="deck"]').val();
        if (!selectedDeckId) {
            ui.notifications.warn('Выберите колоду');
            return;
        }

        // Сохраняем выбранную колоду для следующего раза
        this.lastSelectedDeckId = selectedDeckId;

        const cardCount = parseInt(html.find('input[name="cardCount"]').val()) || 3;

        const selectedDeck = this.availableDecks.find(deck => deck.id === selectedDeckId);
        if (!selectedDeck || selectedDeck.cards.length === 0) {
            ui.notifications.warn('В выбранной колоде нет карт');
            return;
        }

        // Выбираем случайные карты из колоды
        const selectedCards = this.selectRandomCards(selectedDeck.cards, cardCount);
        
        console.log(`[${MODULE_ID}] Selected ${selectedCards.length} cards for distribution:`, selectedCards.map(c => c.name));

        for (const playerId of selectedPlayerIds) {
            const player = game.users.get(playerId);
            if (player) {
                await this.sendCardChoiceToPlayer(player, selectedCards, selectedDeck);
            }
        }

        ui.notifications.info(`Карты отправлены ${selectedPlayerIds.length} игрокам из колоды "${selectedDeck.name}"`);
    }

    /**
     * Отправляет диалог выбора карты игроку
     * @param {User} player - Игрок
     * @param {CardDocument[]} cards - Массив карт
     * @param {Object} deck - Информация о колоде
     */
    async sendCardChoiceToPlayer(player, cards, deck) {
        try {
            // Сериализуем данные карт для передачи
            const serializedCards = cards.map(card => ({
                id: card.id,
                name: card.name,
                description: card.description,
                img: card.img,
                // Включаем все свойства рубашки
                back: card.back,
                faces: card.faces,
                system: card.system,
                texture: card.texture,
                document: card.document,
                _source: card._source,
                flags: card.flags
            }));
            
            // Отправляем query игроку
            const queryData = { 
                cards: serializedCards, 
                deck: {
                    id: deck.id,
                    name: deck.name
                }
            };
            
            const result = await player.query(`${MODULE_ID}.showCardDialog`, queryData, { timeout: 30000 });
            
            console.log(`[${MODULE_ID}] Dialog sent to ${player.name}:`, result);
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to send dialog to player ${player.name}:`, error);
            ui.notifications.error(`Не удалось отправить диалог игроку ${player.name}: ${error.message}`);
        }
    }

    /**
     * Обрабатывает выбор карты игроком
     * @param {HTMLElement} slot - Элемент выбранной карты
     * @param {User} player - Игрок
     * @param {CardDocument} card - Выбранная карта
     * @param {Object} deck - Информация о колоде
     */
    async handleCardSelection(slot, player, card, deck) {
        // Воспроизводим звук
        SFX.play(SFX.sounds.click);

        // Убираем остальные карты с анимацией
        const container = slot.closest('.card-container');
        container.querySelectorAll('.card-slot').forEach(otherSlot => {
            if (otherSlot !== slot) {
                $(otherSlot).animate({
                    opacity: 0.3,
                    transform: 'scale(0.8)'
                }, 300);
            }
        });

        // Подсвечиваем выбранную карту
        $(slot).css({
            'border-color': '#ffd700',
            'box-shadow': '0 0 20px rgba(255, 215, 0, 0.6)',
            'transform': 'scale(1.1)'
        });

        // Проверяем доступность Orcnog Card Viewer
        const hasCardViewer = game.modules.get("orcnog-card-viewer")?.active;
        
        if (hasCardViewer && typeof OrcnogFancyDisplay === "function") {
            // Показываем карту через Orcnog Card Viewer
            const borderColor = '#543';
            const borderWidth = '5px';
            
            // Получаем рубашку карты через нашу функцию
            const cardBack = GMCardDistributor.getCardBack(card, game.settings.get(MODULE_ID, "cardBackStyle") || "dark");
            
            OrcnogFancyDisplay({
                front: card.img || 'icons/svg/card.svg',
                back: cardBack,
                border: borderColor,
                borderWidth
            }).render(true);
        }

        // Создаем карту в инвентаре игрока
        const cardCopy = await this.createCardForPlayer(player, card, deck);

        // Отправляем сообщение о выборе в общий чат
        const announcementContent = `
            <div style="
                text-align: center;
                padding: 15px;
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border: 2px solid #543;
                border-radius: 10px;
                color: #f0e6d2;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #ffd700; margin-bottom: 10px; font-family: 'Cinzel', serif; font-size: 1.5em;">
                    🎴 Карта выбрана! 🎴
                </h3>
                <p style="margin-bottom: 10px;">
                    <strong>${player.name}</strong> выбрал карту из колоды <strong>${deck.name}</strong>
                </p>
                ${card.img ? `
                    <div style="margin: 15px 0;">
                        <img src="${card.img}" style="
                            max-width: 250px;
                            max-height: 350px;
                            border: 3px solid #543;
                            border-radius: 8px;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                        "/>
                    </div>
                ` : ''}
                <div style="margin: 10px 0;">
                    <h4 style="color: #ffd700; margin: 8px 0; font-family: 'Cinzel', serif;">
                        ${card.name}
                    </h4>
                    ${card.description ? `
                        <p style="font-style: italic; color: #d4c5a0; margin: 5px 0; line-height: 1.4;">
                            ${card.description}
                        </p>
                    ` : ''}
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 10px;">
                    ${cardCopy ? 'Карта добавлена в инвентарь игрока' : 'Карта создана'}
                </p>
            </div>
        `;

        await ChatMessage.create({
            content: announcementContent,
            speaker: ChatMessage.getSpeaker({ alias: "Мастер Игр" })
        });

        // Закрываем диалог через небольшую задержку
        setTimeout(() => {
            const dialog = slot.closest('.dialog');
            if (dialog) {
                $(dialog).animate({
                    opacity: 0,
                    transform: 'scale(0.8)'
                }, 300, () => {
                    dialog.close();
                });
            }
        }, 1000);
    }
}

// Создаем экземпляр системы
const gmCardDistributor = new GMCardDistributor();

// Проверяем настройки в ready хуке
Hooks.on('ready', () => {
    console.log(`[${MODULE_ID}] Checking dealCardsFaceDown setting...`);
    try {
        const setting = game.settings.get(MODULE_ID, "dealCardsFaceDown");
        console.log(`[${MODULE_ID}] dealCardsFaceDown setting value:`, setting);
        console.log(`[${MODULE_ID}] dealCardsFaceDown setting type:`, typeof setting);
        
        // Проверяем что query зарегистрирован
        console.log(`[${MODULE_ID}] Available queries:`, Object.keys(CONFIG.queries));
        console.log(`[${MODULE_ID}] showCardDialog query exists:`, !!CONFIG.queries[`${MODULE_ID}.showCardDialog`]);
    } catch (error) {
        console.error(`[${MODULE_ID}] Error checking dealCardsFaceDown setting:`, error);
    }
});

// Регистрируем query при инициализации модуля
Hooks.on('init', () => {
    console.log(`[${MODULE_ID}] Registering showCardDialog query...`);
    
    // Регистрируем query для отправки диалогов игрокам
    CONFIG.queries[`${MODULE_ID}.showCardDialog`] = async (queryData, { timeout }) => {
        console.log(`[${MODULE_ID}] showCardDialog query received!`);
        console.log(`[${MODULE_ID}] Game ready:`, !!game.ready);
        console.log(`[${MODULE_ID}] Settings available:`, !!game.settings);
        
        const { cards, deck } = queryData;
        
        // Отладочная информация
        console.log(`[${MODULE_ID}] Received cards:`, cards);
        console.log(`[${MODULE_ID}] Number of cards:`, cards.length);
        
        // Проверяем настройку "выдавать карты рубашкой вверх"
        const dealCardsFaceDown = game.settings.get(MODULE_ID, "dealCardsFaceDown") || false;
        const cardBackStyle = game.settings.get(MODULE_ID, "cardBackStyle") || "dark";
        console.log(`[${MODULE_ID}] Deal cards face down:`, dealCardsFaceDown);
        console.log(`[${MODULE_ID}] Card back style:`, cardBackStyle);
        
        // Логируем информацию о рубашках карт
        cards.forEach((card, index) => {
            const cardBack = GMCardDistributor.getCardBack(card, cardBackStyle);
            console.log(`[${MODULE_ID}] Card ${index + 1} "${card.name}" back:`, cardBack);
        });
        
        // Создаем HTML для диалога как в примере
        const dialogHTML = `
            <div class="card-wrapper" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 15px;
                padding: 10px;
                position: relative;
                z-index: 10001;
            ">
                <div class="card-container" style="
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    align-items: center;
                    min-height: 400px;
                    transition: all 0.3s ease;
                ">
                    ${cards.map((card, index) => {
                        // Получаем рубашку через статическую функцию
                        const cardBack = GMCardDistributor.getCardBack(card, cardBackStyle);
                        
                        return `
                        <div class="card-slot" data-card-id="${card.id}" style="
                            width: 180px;
                            height: 270px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 8px;
                            position: relative;
                            transition: all 0.3s ease;
                            overflow: hidden;
                        " onmouseover="if (!this.dataset.selected) this.style.transform='scale(1.05)'" onmouseout="if (!this.dataset.selected) this.style.transform='scale(1)'">
                            <img src="${dealCardsFaceDown ? (cardBack || card.img || 'icons/svg/card-back.svg') : (card.img || 'icons/svg/card-back.svg')}" class="card-img" style="
                                width: 100%;
                                height: 100%;
                                object-fit: contain;
                                opacity: 0;
                                transform: translateY(80px);
                                transition: all 0.8s ease ${index * 0.2}s;
                                border: 1px solid var(--color-border-dark);
                                border-radius: 8px;
                            ">
                        </div>
                    `}).join('')}
                </div>
                <p style="
                    text-align: center;
                    font-size: 2em;
                    font-family: 'Cinzel', serif;
                    color: #ffd700;
                    text-shadow: 0 0 10px #000, 0 0 5px #ffd700;
                    letter-spacing: 1px;
                    margin-top: 10px;
                ">
                    ${dealCardsFaceDown ? 'Выберите карту' : 'Выберите карту'}
                </p>
            </div>
        `;

        // Создаем диалог
        const dialog = new Dialog({
            title: "", // убираем заголовок
            content: dialogHTML,
            buttons: {},
            render: (html) => {
                // Добавляем затемнение фона
                const overlay = $('<div class="card-dialog-overlay"></div>').css({
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.8)',
                    zIndex: '9999',
                    opacity: '0',
                    transition: 'opacity 0.3s ease-in-out'
                });
                
                $('body').append(overlay);
                
                // Плавно появляем затемнение
                setTimeout(() => {
                    overlay.css('opacity', '1');
                }, 50);
                
                // Настраиваем стиль диалога как в примере
                const wrapper = html.closest(".dialog");
                wrapper.css({
                    width: "650px",
                    height: "auto",
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    zIndex: "10000"
                });

                // скрываем заголовок и крестик
                wrapper.find(".window-header").css("display", "none");
                html.closest(".window-content").css({
                    background: "transparent",
                    overflow: "visible"
                });

                // Убираем border у всех изображений в диалогах
                $('<style>')
                    .prop('type', 'text/css')
                    .html(`
                        body.game .app .card-img {
                            border: none !important;
                            box-shadow: none !important;
                        }
                    `)
                    .appendTo('head');

                // Удаляем затемнение при закрытии диалога
                const originalClose = dialog.close;
                dialog.close = function(...args) {
                    // Отменяем автоматическое закрытие если оно было
                    if (dialog._closeTimeout) {
                        clearTimeout(dialog._closeTimeout);
                        dialog._closeTimeout = null;
                    }
                    
                    overlay.css('opacity', '0');
                    setTimeout(() => {
                        overlay.remove();
                    }, 300);
                    return originalClose.apply(this, args);
                };

                // анимация появления как в макросе
                setTimeout(() => {
                    html.find(".card-img").css({ 
                        transform: "translateY(0)", 
                        opacity: "1" 
                    });
                }, 50);

                // выбор карт
                html.find(".card-slot").on("click", async (ev) => {
                    const slot = $(ev.currentTarget);
                    const cardId = slot.data('card-id');
                    
                    const card = cards.find(c => c.id === cardId);
                    
                    if (card) {
                        // Воспроизводим звук
                        if (typeof SFX !== 'undefined' && SFX.play) {
                            SFX.play(SFX.sounds.click);
                        }
                        
                        // Убираем остальные карты с улучшенной анимацией
                        const container = slot.closest('.card-container');
                        container.find('.card-slot').each(function() {
                            const otherSlot = $(this);
                            if (otherSlot[0] !== slot[0]) {
                                // Помечаем как не выбранные и убираем hover эффект
                                otherSlot.attr('data-selected', 'false');
                                otherSlot.css('cursor', 'default');
                                
                                // Показываем остальные карты через 1.5 секунды без увеличения
                                setTimeout(() => {
                                    const otherImg = otherSlot.find('.card-img');
                                    if (otherImg.length > 0) {
                                        // Анимация переворота для остальных карт
                                        otherImg.css({
                                            'transform': 'rotateY(90deg)',
                                            'transition': 'transform 0.3s ease-in'
                                        });
                                        
                                        setTimeout(() => {
                                            const otherCard = cards.find(c => c.id === otherSlot.data('card-id'));
                                            if (otherCard && otherCard.img) {
                                                otherImg[0].src = otherCard.img;
                                            }
                                            otherImg.css({
                                                'transform': 'rotateY(0deg)',
                                                'transition': 'transform 0.3s ease-out'
                                            });
                                        }, 300);
                                    }
                                }, 1500);
                                
                                // НЕ добавляем исчезновение - карты остаются до закрытия окна
                            }
                        });

                        // Помечаем выбранную карту и блокируем выбор
                        slot.attr('data-selected', 'true');
                        slot.css('cursor', 'default');
                        
                        // Блокируем выбор для всех карт
                        container.find('.card-slot').css('pointer-events', 'none');

                        // Подсвечиваем выбранную карту с пульсацией (используем механизм из HUD)
                        const img = slot.find('.card-img');
                        const sc = Utils.getSettingSafe("cardSelectionScale", 1.35); // Масштаб из настроек
                        
                        // Сохраняем оригинальные размеры
                        const originalWidth = slot.css('width') || "180px";
                        const originalHeight = slot.css('height') || "270px";
                        slot.attr('data-original-width', originalWidth);
                        slot.attr('data-original-height', originalHeight);
                        
                        // Вычисляем новые размеры как в HUD
                        const baseWidth = 180;
                        const baseHeight = 270;
                        const newWidth = Math.round(baseWidth * sc);
                        const newHeight = Math.round(baseHeight * sc);
                        
                        // Применяем плавный переход и новые размеры
                        slot.css({
                            'transition': 'width 0.3s ease, height 0.3s ease, filter 0.2s ease, transform 0.3s ease',
                            'width': `${newWidth}px`,
                            'height': `${newHeight}px`
                        });
                        
                        // Применяем трансформацию как в HUD без дополнительного смещения
                        slot.css({
                            'transform': `perspective(1200px)`,
                            'z-index': '1000',
                            'filter': 'drop-shadow(0 15px 25px rgba(0,0,0,0.7)) brightness(1.08) contrast(1.1)'
                        });
                        
                        // Убираем пульсацию - просто оставляем тень

                        // Показываем лицевую сторону с анимацией переворота
                        const imgElement = slot.find('.card-img')[0];
                        if (imgElement && card.img) {
                            // Анимация переворота карты
                            $(imgElement).css({
                                'transform': 'rotateY(90deg)',
                                'transition': 'transform 0.3s ease-in'
                            });
                            
                            setTimeout(() => {
                                imgElement.src = card.img;
                                $(imgElement).css({
                                    'transform': 'rotateY(0deg)',
                                    'transition': 'transform 0.3s ease-out'
                                });
                            }, 300);
                        }

                        // Отправляем сообщение о выборе
                        const messageContent = `
                            <div style="
                                text-align: center;
                                padding: 15px;
                                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                                border: 2px solid #543;
                                border-radius: 10px;
                                color: #f0e6d2;
                            ">
                                <h3 style="color: #ffd700; margin-bottom: 10px; font-family: 'Cinzel', serif;">
                                    🎴 Карта выбрана! 🎴
                                </h3>
                                <p><strong>${game.user.name}</strong> выбрал карту из колоды <strong>${deck.name}</strong></p>
                                ${card.img ? `<img src="${card.img}" style="max-width: 250px; border: 3px solid #543; border-radius: 8px;"/>` : ''}
                                <h4 style="color: #ffd700; margin: 8px 0; font-family: 'Cinzel', serif;">${card.name}</h4>
                                ${card.description ? `<p style="font-style: italic; color: #d4c5a0;">${card.description}</p>` : ''}
                            </div>
                        `;

                        ChatMessage.create({
                            content: messageContent,
                            speaker: ChatMessage.getSpeaker({ alias: "Мастер Игр" })
                        });

                        // Отправляем запрос ГМу для передачи карты
                        try {
                            const gmUser = game.users.find(u => u.isGM && u.active);
                            if (gmUser) {
                                const result = await gmUser.query(`${MODULE_ID}.passCardToPlayer`, {
                                    cardId: card.id,
                                    cardName: card.name,
                                    deckId: deck.id,
                                    playerId: game.user.id
                                });
                                
                                if (result.success) {
                                    ui.notifications.info(`Карта "${card.name}" добавлена в вашу руку!`);
                                    
                                    // Обновляем HUD игрока
                                    try {
                                        // Находим свою руку для обновления HUD
                                        const allCards = game.cards?.contents || [];
                                        const playerHand = allCards.find(c => 
                                            c.name.toLowerCase().includes(game.user.name.toLowerCase())
                                        );
                                        
                                        if (playerHand) {
                                            console.log(`[${MODULE_ID}] Card requested by ${game.user.name}, their HUD should update automatically via hooks`);
                                            // Не вызываем renderCards здесь - пусть хуки обновят HUD на стороне игрока
                                        } else {
                                            console.warn(`[${MODULE_ID}] PokerHandHUD or player hand not available for local update`);
                                        }
                                    } catch (hudError) {
                                        console.warn(`[${MODULE_ID}] Failed to update local HUD:`, hudError);
                                    }
                                } else {
                                    ui.notifications.error(`Не удалось передать карту: ${result.error}`);
                                }
                            } else {
                                console.warn(`[${MODULE_ID}] No active GM found to pass card`);
                                ui.notifications.error(`ГМ не найден для передачи карты`);
                            }
                        } catch (passError) {
                            console.error(`[${MODULE_ID}] Failed to request card pass:`, passError);
                            ui.notifications.error(`Не удалось передать карту в руку: ${passError.message}`);
                        }

                        // Закрываем диалог с улучшенной анимацией через заданное время
                        const closeDelay = Utils.getSettingSafe("cardSelectionCloseDelay", 8) * 1000; // Конвертируем в миллисекунды
                        
                        // Сохраняем ссылку на диалог для проверки
                        const closeTimeout = setTimeout(() => {
                            // Проверяем что диалог еще не закрыт
                            if (dialog && dialog.rendered && !dialog._closing) {
                                const dialogElement = dialog.element;
                                if (dialogElement) {
                                    $(dialogElement).animate({
                                        opacity: 0,
                                        transform: 'scale(0.8) rotateZ(-5deg)',
                                        filter: 'blur(3px)'
                                    }, 400, 'swing', () => {
                                        if (dialog && !dialog._closing) {
                                            dialog._closing = true;
                                            dialog.close();
                                        }
                                    });
                                } else {
                                    if (dialog && !dialog._closing) {
                                        dialog._closing = true;
                                        dialog.close();
                                    }
                                }
                            }
                        }, closeDelay);
                        
                        // Сохраняем timeout для возможной отмены
                        dialog._closeTimeout = closeTimeout;
                    }
                });
            }
        });

        // Открываем диалог
        dialog.render(true);
        
        return { success: true };
    };
    
    // Регистрируем query для передачи карты игроку (только для ГМа)
    CONFIG.queries[`${MODULE_ID}.passCardToPlayer`] = async (queryData, { timeout }) => {
        // Проверяем что это ГМ
        if (!game.user.isGM) {
            return { success: false, error: 'Только ГМ может передавать карты' };
        }
        
        const { cardId, playerId, cardName, deckId } = queryData;
        
        try {
            console.log(`[${MODULE_ID}] GM received card pass request:`, { cardId, playerId, cardName, deckId });
            
            let card = null;
            
            // Метод 1: Пробуем найти по ID
            if (cardId) {
                card = game.cards.get(cardId);
                console.log(`[${MODULE_ID}] Card lookup by ID ${cardId}:`, card ? 'Found' : 'Not found');
            }
            
            // Метод 2: Ищем по имени в колоде
            if (!card && cardName && deckId) {
                const deck = game.cards.get(deckId);
                if (deck && deck.cards) {
                    card = Array.from(deck.cards.values()).find(c => c.name === cardName);
                    console.log(`[${MODULE_ID}] Card lookup by name "${cardName}" in deck "${deck.name}":`, card ? 'Found' : 'Not found');
                }
            }
            
            // Метод 3: Ищем по имени во всех картах
            if (!card && cardName) {
                const allCards = game.cards?.contents || [];
                card = allCards.find(c => c.name === cardName);
                console.log(`[${MODULE_ID}] Card lookup by name "${cardName}" in all cards:`, card ? 'Found' : 'Not found');
            }
            
            if (!card) {
                return { success: false, error: `Карта "${cardName}" не найдена` };
            }
            
            // Находим игрока
            const player = game.users.get(playerId);
            if (!player) {
                return { success: false, error: 'Игрок не найден' };
            }
            
            // Передаем карту
            const success = await gmCardDistributor.passCardToPlayer(card, player, deckId);
            
            if (success) {
                return { success: true };
            } else {
                return { success: false, error: 'Не удалось передать карту' };
            }
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Error in passCardToPlayer query:`, error);
            return { success: false, error: error.message };
        }
    };
    
    console.log(`[${MODULE_ID}] Registered queries: ${MODULE_ID}.showCardDialog, ${MODULE_ID}.passCardToPlayer`);
});

// Отключаем проблемный renderSceneControls и используем только надежные методы
// Hooks.on('renderSceneControls', (controls, html) => {
//     if (!game.user.isGM) return;
//     console.warn(`[${MODULE_ID}] Scene controls hook disabled due to compatibility issues`);
// });

// Добавляем кнопку в навигационную панель для большей видимости
Hooks.on('renderNavigation', (nav, html) => {
    if (!game.user.isGM) return;

    try {
        // Создаем плавающую кнопку для ГМа
        const floatingButton = $(`
            <div id="gm-card-distributor-floating" style="
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                z-index: 1000;
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border: 2px solid #543;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: 'Signika', sans-serif;
            ">
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    color: #f0e6d2;
                ">
                    <i class="fas fa-layer-group" style="font-size: 24px; color: #ffd700;"></i>
                    <span style="font-size: 12px; font-weight: bold; text-align: center;">
                        Раздать<br>карты
                    </span>
                </div>
            </div>
        `);

        floatingButton.on('click', () => {
            gmCardDistributor.showDistributionDialog();
        });

        floatingButton.on('mouseenter', function() {
            $(this).css({
                'transform': 'translateY(-50%) scale(1.1)',
                'box-shadow': '0 6px 20px rgba(0,0,0,0.7)',
                'border-color': '#ffd700'
            });
        });

        floatingButton.on('mouseleave', function() {
            $(this).css({
                'transform': 'translateY(-50%) scale(1)',
                'box-shadow': '0 4px 15px rgba(0,0,0,0.5)',
                'border-color': '#543'
            });
        });

        // Добавляем кнопку на страницу
        $('body').append(floatingButton);
    } catch (error) {
        console.warn(`[${MODULE_ID}] Failed to add floating button:`, error);
    }
});

// Резерв: оставляем кнопку в PlayerList как запасной вариант - УДАЛЕНО
// Hooks.on('renderPlayerList', (app, html, data) => {
//     if (!game.user.isGM) return;
// 
//     try {
//         // Проверяем, нет ли уже других кнопок
//         if ($('#gm-card-distributor-floating').length || $('#gm-card-distributor-game-controls').length) {
//             return; // Кнопка уже добавлена в другом месте
//         }
// 
//         const gmButton = $(`
//             <button id="gm-card-distributor-btn" style="
//                 margin: 5px;
//                 padding: 8px 12px;
//                 background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
//                 border: 1px solid #543;
//                 border-radius: 5px;
//                 color: #f0e6d2;
//                 cursor: pointer;
//                 font-family: 'Signika', sans-serif;
//                 font-size: 12px;
//                 transition: all 0.3s ease;
//             " title="Раздать карты игрокам">
//                 🎴 Раздать карты
//             </button>
//         `);
// 
//         gmButton.on('click', () => {
//             gmCardDistributor.showDistributionDialog();
//         });
// 
//         gmButton.on('mouseenter', function() {
//             $(this).css({
//                 'background': 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
//                 'transform': 'translateY(-1px)',
//                 'box-shadow': '0 2px 5px rgba(0,0,0,0.3)'
//             });
//         });
// 
//         gmButton.on('mouseleave', function() {
//             $(this).css({
//                 'background': 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
//                 'transform': 'translateY(0)',
//                 'box-shadow': 'none'
//             });
//         });
// 
//         html.find('.directory-header').append(gmButton);
//     } catch (error) {
//         console.warn(`[${MODULE_ID}] Failed to add button to player list:`, error);
//     }
// });

export { GMCardDistributor, gmCardDistributor };
