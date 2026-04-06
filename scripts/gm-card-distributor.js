/* ===== GM CARD DISTRIBUTOR v2.9 — ИСПРАВЛЕННАЯ ===== */
/**
 * @fileoverview GM Card Distributor system for Poker Hand HUD (ПОЛНАЯ ПЕРЕРАБОТКА)
 * @version 2.9.0
 *
 * ИСПРАВЛЕНИЯ v2.9:
 *  - ✓ getAvailableCards теперь корректно берёт только карты ИЗ колоды
 *  - ✓ selectRandomCards работает только с реально доступными картами
 *  - ✓ Ручной выбор карты полностью переработан и работает
 *  - ✓ distributeSpecificCard ищет карту правильно
 *  - ✓ Диалог выбора карты возвращает результат через Promise
 *  - ✓ Добавлена защита от повторной раздачи одной карты
 */

import {MODULE_ID} from './constants.js';
import {Utils} from './utils.js';
import {SFX} from './sound-effects.js';
import {HandAssignmentSystem} from './hand-assignment-system.js';

class GMCardDistributor {
    constructor() {
        this.selectedPlayers = new Set();
        this.selectedDeck = null;
        this.availableDecks = [];
    }

    async getAvailableDecks() {
        try {
            const allCards = game.cards?.contents || [];
            if (!allCards.length) {
                ui.notifications.warn('Карты не найдены. Создайте колоды в разделе Cards.');
                return [];
            }
            const decks = allCards
                .filter(c => c.type === 'deck')
                .map(deck => ({
                    id: deck.id,
                    name: deck.name,
                    cards: (deck.cards?.contents || []),
                    allCards: (deck.cards?.contents || [])
                }))
                .filter(d => d.cards.length > 0);

            if (!decks.length) ui.notifications.warn('Не найдено колод с картами.');
            return decks;
        } catch (err) {
            console.error(`[${MODULE_ID}] getAvailableDecks:`, err);
            ui.notifications.error('Не удалось получить список колод: ' + err.message);
            return [];
        }
    }

    /**
     * ИСПРАВЛЕННАЯ ФУНКЦИЯ: Получает карты, которые РЕАЛЬНО находятся в колоде
     *
     * В Foundry VTT `deck.cards.contents` содержит ВСЕ карты, которые когда-либо
     * принадлежали колоде, включая розданные. Розданные карты имеют parent !== deck.
     *
     * Дополнительно проверяем через все руки и пайлы для надёжности.
     */
    getAvailableCards(deckId) {
        try {
            const deck = game.cards.get(deckId);
            if (!deck || deck.type !== 'deck') return [];

            // Собираем ID всех карт, которые сейчас лежат в руках или пайлах
            const dealtCardIds = new Set();
            const allCollections = game.cards?.contents || [];

            for (const collection of allCollections) {
                if (collection.type === 'hand' || collection.type === 'pile') {
                    for (const card of (collection.cards?.contents || [])) {
                        dealtCardIds.add(card.id);
                    }
                }
            }

            // Берём все карты колоды и фильтруем
            const allCardsInDeck = deck.cards?.contents || [];

            const available = allCardsInDeck.filter(card => {
                // Карта не должна быть в руке или пайле
                if (dealtCardIds.has(card.id)) return false;

                // Дополнительная проверка: parent должен быть этой колодой
                // (на случай если карта перемещена в другую колоду)
                if (card.parent && card.parent.id !== deckId) return false;

                return true;
            });

            console.log(`[${MODULE_ID}] getAvailableCards: deck="${deck.name}" total=${allCardsInDeck.length} available=${available.length} dealt=${dealtCardIds.size}`);
            return available;
        } catch (err) {
            console.error(`[${MODULE_ID}] getAvailableCards:`, err);
            return [];
        }
    }

    /**
     * Получить ВСЕ карты колоды (включая розданные) для отображения статуса
     */
    getAllCardsWithStatus(deckId) {
        try {
            const deck = game.cards.get(deckId);
            if (!deck || deck.type !== 'deck') return [];

            // Собираем маппинг: cardId → где она лежит
            const cardLocationMap = new Map();
            const allCollections = game.cards?.contents || [];

            for (const collection of allCollections) {
                if (collection.type === 'hand') {
                    for (const card of (collection.cards?.contents || [])) {
                        cardLocationMap.set(card.id, {type: 'hand', name: collection.name});
                    }
                } else if (collection.type === 'pile') {
                    for (const card of (collection.cards?.contents || [])) {
                        cardLocationMap.set(card.id, {type: 'pile', name: collection.name});
                    }
                }
            }

            const allCards = deck.cards?.contents || [];

            return allCards.map(card => {
                const location = cardLocationMap.get(card.id);
                const isAvailable = !location;

                return {
                    id: card.id,
                    name: card.name,
                    description: card.description || '',
                    front: GMCardDistributor.getCardFront(card),
                    back: GMCardDistributor.getCardBack(card),
                    available: isAvailable,
                    location: location ? location.type : 'deck',
                    locationName: location ? location.name : deck.name
                };
            });
        } catch (err) {
            console.error(`[${MODULE_ID}] getAllCardsWithStatus:`, err);
            return [];
        }
    }

    /**
     * ИСПРАВЛЕНО: Выбирает случайные карты ТОЛЬКО из реально доступных
     */
    selectRandomCards(deckId, count = 3) {
        const available = this.getAvailableCards(deckId);
        if (!available.length) {
            console.warn(`[${MODULE_ID}] selectRandomCards: нет доступных карт в колоде ${deckId}`);
            return [];
        }
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(count, available.length));
        console.log(`[${MODULE_ID}] selectRandomCards: выбрано ${selected.length} из ${available.length} доступных`);
        return selected;
    }

    static getCardBack(card, cardBackStyle = 'dark') {
        if (card.back?.img) return card.back.img;
        if (typeof card.back === 'string' && card.back) return card.back;
        if (card.faces?.back?.src) return card.faces.back.src;
        if (card.system?.back) return card.system.back;
        if (card.parent?.type === 'deck' && card.parent?.img) return card.parent.img;
        const file = cardBackStyle === 'dark' ? 'dark-gold.webp' : 'light-soft.webp';
        return `modules/poker-hand-hud-dnd/backs/${file}`;
    }

    static getCardFront(card) {
        return card.faces?.[0]?.img || card.img || null;
    }

    async passCardToPlayer(card, player, keepFaceDown = true) {
        try {
            const assignedHandName = HandAssignmentSystem.getUserAssignedHand(player.id);
            if (!assignedHandName) {
                ui.notifications.error(`Нет назначенной руки для игрока ${player.name}`);
                return false;
            }

            const playerHand = (game.cards?.contents || []).find(c =>
                c.type === 'hand' && c.name.toLowerCase() === assignedHandName.toLowerCase()
            );
            if (!playerHand) {
                ui.notifications.error(`Рука "${assignedHandName}" не найдена для ${player.name}`);
                return false;
            }

            if (playerHand.ownership?.[player.id] !== 3) {
                await playerHand.update({ownership: {...(playerHand.ownership || {}), [player.id]: 3}});
            }

            await card.pass(playerHand, {chat: false, display: false, render: false});

            if (keepFaceDown) {
                const cardInHand = playerHand.cards.get(card.id);
                if (cardInHand) await cardInHand.update({face: null});
            }

            return true;
        } catch (err) {
            console.error(`[${MODULE_ID}] passCardToPlayer:`, err);
            ui.notifications.error(`Не удалось передать карту ${player.name}: ${err.message}`);
            return false;
        }
    }

    // ─── ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ диалог выбора конкретной карты ──────────────
    async showCardSelectionDialog(deckId) {
        const deck = game.cards.get(deckId);
        if (!deck || deck.type !== 'deck') {
            ui.notifications.error('Колода не найдена');
            return null;
        }

        const cardsWithStatus = this.getAllCardsWithStatus(deckId);
        if (!cardsWithStatus.length) {
            ui.notifications.error('В колоде нет карт');
            return null;
        }

        const availableCount = cardsWithStatus.filter(c => c.available).length;
        if (!availableCount) {
            ui.notifications.error('Все карты уже розданы');
            return null;
        }

        return new Promise((resolveMain) => {
            let selectedCardId = null;

            const cardsGrid = cardsWithStatus.map((card) => {
                const statusIcon = card.available
                    ? '✓'
                    : card.location === 'hand' ? '👤' : '📚';
                const statusColor = card.available
                    ? '#4caf50'
                    : card.location === 'hand' ? '#ff9800' : '#757575';
                const statusText = card.available
                    ? 'В колоде'
                    : card.location === 'hand'
                        ? `В руке: ${card.locationName || '?'}`
                        : 'В пайле';
                const isDisabled = !card.available;

                return `
    <div class="card-grid-item ${isDisabled ? 'card-disabled' : 'card-available'}" 
         data-card-id="${card.id}"
         data-available="${card.available}"
         style="
             padding: 14px;
             background: ${isDisabled ? 'rgba(100,100,100,0.2)' : 'rgba(0,0,0,0.3)'};
             border: 2px solid ${isDisabled ? 'rgba(150,150,150,0.3)' : 'rgba(255,215,0,0.2)'};
             border-radius: 8px;
             cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
             transition: all 0.25s ease;
             text-align: center;
             opacity: ${isDisabled ? 0.5 : 1};
         ">
        
        ${card.front ? `
        <img src="${card.front}" style="
            width: 100%;
            height: 140px;
            object-fit: contain;
            border-radius: 6px;
            margin-bottom: 8px;
            border: 1px solid rgba(255,215,0,0.3);
            filter: ${isDisabled ? 'grayscale(100%)' : 'grayscale(0)'};
            opacity: ${isDisabled ? 0.5 : 1};
            pointer-events: none;
        ">
        ` : `
        <div style="
            width: 100%;
            height: 140px;
            background: linear-gradient(135deg,#1a1a2e,#16213e);
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffd700;
            font-size: 11px;
            border: 1px solid rgba(255,215,0,0.3);
            filter: ${isDisabled ? 'grayscale(100%)' : 'grayscale(0)'};
        ">[Нет обложки]</div>
        `}

        <div style="color: ${isDisabled ? '#999' : '#f0e6d2'}; font-size: 12px; font-weight: bold; margin-bottom: 6px; pointer-events: none;">
            ${card.name || 'Без названия'}
        </div>

        ${card.description ? `
        <div style="color: ${isDisabled ? '#666' : 'rgba(200,170,100,0.7)'}; font-size: 10px; line-height: 1.3; margin-bottom: 8px; pointer-events: none;">
            ${card.description.substring(0, 60)}${card.description.length > 60 ? '...' : ''}
        </div>
        ` : ''}

        <div style="
            font-size: 10px;
            color: ${statusColor};
            background: ${isDisabled ? 'rgba(100,100,100,0.15)' : 'rgba(200,160,80,0.15)'};
            padding: 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: bold;
            pointer-events: none;
        ">
            ${statusIcon} ${statusText}
        </div>
    </div>`;
            }).join('');

            const dialogContent = `
    <div class="card-selection-wrapper" style="
        font-family: 'Cinzel', serif;
        background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
        border-radius: 12px;
        padding: 20px;
        max-width: 100%;
    ">
        <div style="
            margin-bottom: 20px;
            padding: 12px;
            background: rgba(255,215,0,0.08);
            border: 1px solid rgba(255,215,0,0.3);
            border-radius: 8px;
            color: #f0e6d2;
            font-size: 13px;
            text-align: center;
        ">
            🎴 Доступно карт: <strong style="color: #ffd700;">${availableCount}</strong> из <strong>${cardsWithStatus.length}</strong>
            <div style="color: #8a7a65; font-size: 11px; margin-top: 6px;">
                ✓ = в колоде  |  👤 = в руке  |  📚 = в пайле
            </div>
        </div>

        <div style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            max-height: 500px;
            overflow-y: auto;
            padding: 12px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            border: 1px solid rgba(255,215,0,0.15);
        " id="cards-selection-grid">
            ${cardsGrid}
        </div>

        <div id="card-action-buttons" style="
            display: flex;
            gap: 12px;
            margin-top: 20px;
            justify-content: center;
            flex-wrap: wrap;
        ">
            <button id="card-confirm-btn" style="
                background: linear-gradient(135deg,#4caf50,#388e3c);
                border: 1px solid #2e7d32;
                color: #fff;
                padding: 10px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Cinzel',serif;
                font-size: 13px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: filter 0.2s;
                opacity: 0.5;
                pointer-events: none;
            ">✓ Выбрать карту</button>
            <button id="card-cancel-btn" style="
                background: linear-gradient(135deg,#e53935,#c62828);
                border: 1px solid #b71c1c;
                color: #fff;
                padding: 10px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Cinzel',serif;
                font-size: 13px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: filter 0.2s;
            ">✖ Отмена</button>
        </div>
    </div>`;

            const dialog = new Dialog({
                title: `Выбрать карту из "${deck.name}"`,
                content: dialogContent,
                buttons: {},
                render: (html) => {
                    // Стиль окна
                    const $wrapper = html.closest('.dialog');
                    $wrapper.css({
                        background: 'transparent',
                        boxShadow: 'none',
                        border: 'none',
                        maxWidth: '750px'
                    });
                    $wrapper.find('.window-header').css({
                        background: '#1a1a1a',
                        borderBottom: '1px solid rgba(255,215,0,0.2)',
                        color: '#ffd700',
                    });
                    $wrapper.find('.window-title').css({
                        fontFamily: 'Cinzel,serif',
                        fontWeight: 'bold',
                        color: '#ffd700',
                    });
                    // Прячем стандартные кнопки Dialog
                    $wrapper.find('.dialog-buttons').hide();

                    const $confirmBtn = html.find('#card-confirm-btn');
                    const $cancelBtn = html.find('#card-cancel-btn');

                    // ── КЛИКИ ПО ДОСТУПНЫМ КАРТАМ ──
                    html.find('.card-grid-item.card-available').on('click', function () {
                        const cardId = $(this).data('card-id');

                        // Снимаем выделение со всех
                        html.find('.card-grid-item').each(function () {
                            const isAvail = $(this).data('available');
                            $(this).css({
                                borderColor: isAvail ? 'rgba(255,215,0,0.2)' : 'rgba(150,150,150,0.3)',
                                background: isAvail ? 'rgba(0,0,0,0.3)' : 'rgba(100,100,100,0.2)',
                                boxShadow: 'none'
                            });
                        });

                        // Выделяем выбранную
                        $(this).css({
                            borderColor: '#ffd700',
                            background: 'rgba(255,215,0,0.25)',
                            boxShadow: '0 0 25px rgba(255,215,0,0.5)'
                        });

                        selectedCardId = String(cardId);

                        // Активируем кнопку подтверждения
                        $confirmBtn.css({opacity: 1, pointerEvents: 'auto'});

                        if (SFX?.play) SFX.play(SFX.sounds?.click || SFX.sounds?.select);
                    });

                    // Hover эффекты для доступных карт
                    html.find('.card-grid-item.card-available')
                        .on('mouseenter', function () {
                            if (String($(this).data('card-id')) !== selectedCardId) {
                                $(this).css({
                                    borderColor: 'rgba(255,215,0,0.6)',
                                    background: 'rgba(255,215,0,0.08)',
                                    transform: 'translateY(-3px)'
                                });
                            }
                        })
                        .on('mouseleave', function () {
                            if (String($(this).data('card-id')) !== selectedCardId) {
                                $(this).css({
                                    borderColor: 'rgba(255,215,0,0.2)',
                                    background: 'rgba(0,0,0,0.3)',
                                    transform: ''
                                });
                            }
                        });

                    // ── КНОПКА ПОДТВЕРЖДЕНИЯ ──
                    $confirmBtn.on('click', () => {
                        if (!selectedCardId) {
                            ui.notifications.warn('Выберите карту из списка');
                            return;
                        }
                        const selectedCard = cardsWithStatus.find(c => c.id === selectedCardId);
                        if (!selectedCard) {
                            ui.notifications.error('Карта не найдена');
                            return;
                        }
                        if (!selectedCard.available) {
                            ui.notifications.error('Эта карта уже роздана');
                            return;
                        }
                        dialog.close();
                        resolveMain(selectedCard);
                    }).on('mouseenter', function () {
                        if (selectedCardId) $(this).css('filter', 'brightness(1.15)');
                    }).on('mouseleave', function () {
                        $(this).css('filter', '');
                    });

                    // ── КНОПКА ОТМЕНЫ ──
                    $cancelBtn.on('click', () => {
                        dialog.close();
                        resolveMain(null);
                    }).on('mouseenter', function () {
                        $(this).css('filter', 'brightness(1.15)');
                    }).on('mouseleave', function () {
                        $(this).css('filter', '');
                    });
                },
                close: () => {
                    // Если диалог закрыт крестиком — тоже резолвим null
                    resolveMain(null);
                }
            });

            dialog.render(true);
        });
    }

    // ─── Диалог ГМа ───────────────────────────────────────────────────────────
    async showDistributionDialog() {
        if (!game.user.isGM) {
            ui.notifications.error('Только для ГМа');
            return;
        }

        const players = game.users.filter(u => u.role === CONST.USER_ROLES.PLAYER && u.active);
        this.availableDecks = await this.getAvailableDecks();

        const lastDeckId = this.lastSelectedDeckId || this.availableDecks[0]?.id || '';
        const globalFaceDown = Utils.getSettingSafe('dealCardsFaceDown', false);

        const dialogContent = `
<div class="gm-card-distributor" style="
    font-family:'Cinzel',serif;
    background:linear-gradient(135deg,#1a1a1a,#2d2d2d);
    border-radius:12px;
">

    <div style="padding:20px 22px 0; border-radius:12px 12px 0 0;">

        <!-- Игроки -->
        <div style="margin-bottom:18px;">
            <h4 style="margin:0 0 9px;color:#ffd700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">👥 Игроки</h4>
            <div style="
                display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr));
                gap:6px; max-height:150px; overflow-y:auto;
                padding:10px; border-radius:7px;
                background:rgba(0,0,0,0.35); border:1px solid rgba(255,215,0,0.2);
            ">
                ${players.map(p => `
                    <label style="
                        display:flex; align-items:center; gap:8px;
                        cursor:pointer; padding:7px 9px; border-radius:6px;
                        background:rgba(255,255,255,0.04); border:1px solid transparent;
                        transition:all 0.2s;
                    "
                        onmouseover="this.style.background='rgba(255,215,0,0.08)';this.style.borderColor='rgba(255,215,0,0.35)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.borderColor='transparent'">
                        <input type="checkbox" name="player" value="${p.id}"
                            style="margin:0;width:14px;height:14px;accent-color:#ffd700;flex-shrink:0;">
                        <span style="color:#f0e6d2;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</span>
                        <span style="margin-left:auto;width:6px;height:6px;background:#4caf50;border-radius:50%;flex-shrink:0;"></span>
                    </label>
                `).join('')}
            </div>
        </div>

        <!-- Колода -->
        <div style="margin-bottom:18px;">
            <h4 style="margin:0 0 9px;color:#ffd700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">🃏 Колода</h4>
            <select name="deck" style="
                width:100%; height:38px; box-sizing:border-box; padding:0 10px;
                border:1px solid rgba(255,215,0,0.25); border-radius:7px;
                background:rgba(0,0,0,0.55); color:#f0e6d2;
                font-family:'Cinzel',serif; font-size:14px; cursor:pointer; outline:none;
            ">
                ${!lastDeckId ? '<option value="" style="background:#1a1a1a;">— выберите...</option>' : ''}
                ${this.availableDecks.map(d => {
            const availCount = this.getAvailableCards(d.id).length;
            const totalCount = d.cards.length;
            return `<option value="${d.id}" ${d.id === lastDeckId ? 'selected' : ''} style="background:#1a1a1a;">
                        🎴 ${d.name} (${availCount}/${totalCount})
                    </option>`;
        }).join('')}
            </select>
        </div>

        <!-- Режим раздачи -->
        <div style="margin-bottom:18px;">
            <h4 style="margin:0 0 9px;color:#ffd700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">🎯 Режим раздачи</h4>
            <div style="
                display:flex; gap:10px;
                padding:10px; background:rgba(0,0,0,0.3);
                border-radius:7px; border:1px solid rgba(255,215,0,0.2);
            ">
                <label style="flex:1;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);">
                    <input type="radio" name="distributeMode" value="random" checked
                        style="margin:0;width:14px;height:14px;accent-color:#ffd700;cursor:pointer;">
                    <span style="color:#f0e6d2;font-size:12px;flex:1;">🎲 Случайные карты</span>
                </label>
                <label style="flex:1;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;background:rgba(100,150,200,0.1);border:1px solid rgba(100,150,200,0.3);">
                    <input type="radio" name="distributeMode" value="manual"
                        style="margin:0;width:14px;height:14px;accent-color:#50a8c8;cursor:pointer;">
                    <span style="color:#f0e6d2;font-size:12px;flex:1;">👁 Выбрать вручную</span>
                </label>
            </div>
        </div>

        <!-- Настройки -->
        <div style="margin-bottom:20px;">
            <h4 style="margin:0 0 9px;color:#ffd700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">⚙️ Настройки</h4>
            <div style="
                display:flex; flex-direction:column; gap:10px;
                padding:12px; background:rgba(0,0,0,0.35);
                border-radius:7px; border:1px solid rgba(255,215,0,0.2);
            ">
                <!-- Кол-во карт (только для режима случайных) -->
                <label style="display:flex;align-items:center;gap:10px;color:#f0e6d2;font-size:13px;">
                    <span>🎯 Карт для выбора:</span>
                    <input type="number" name="cardCount" value="3" min="1" max="10" style="
                        width:56px; padding:5px 8px;
                        border:1px solid rgba(255,215,0,0.25); border-radius:5px;
                        background:rgba(0,0,0,0.5); color:#ffd700;
                        font-family:'Cinzel',serif; font-size:13px; text-align:center;
                        margin-left:auto;
                    ">
                </label>

                <!-- Face-down -->
                <label style="
                    display:flex; align-items:flex-start; gap:11px; cursor:pointer;
                    padding:10px; border-radius:6px;
                    background:rgba(0,0,0,0.2); border:1px solid rgba(255,215,0,0.18);
                    transition:all 0.2s;
                "
                    onmouseover="this.style.background='rgba(255,215,0,0.06)';this.style.borderColor='rgba(255,215,0,0.35)'"
                    onmouseout="this.style.background='rgba(0,0,0,0.2)';this.style.borderColor='rgba(255,215,0,0.18)'">
                    <input type="checkbox" name="faceDown" ${globalFaceDown ? 'checked' : ''}
                        style="margin-top:2px;width:15px;height:15px;accent-color:#ffd700;flex-shrink:0;cursor:pointer;">
                    <div>
                        <div style="color:#ffd700;font-weight:600;font-size:13px;margin-bottom:3px;">🙈 Раздать рубашкой вверх</div>
                        <div style="color:#8a7a65;font-size:11px;line-height:1.5;">
                            Игрок выбирает вслепую. Карта лежит закрытой в руке<br>
                            и раскрывается только при розыгрыше.
                        </div>
                    </div>
                </label>
            </div>
        </div>
    </div>

    <!-- Футер -->
    <div style="
        padding:13px 22px;
        border-top:1px solid rgba(255,215,0,0.2);
        border-radius:0 0 12px 12px;
        display:flex; justify-content:center; gap:12px;
    ">
        <button id="distribute-btn" style="
            background:linear-gradient(135deg,#4caf50,#388e3c);
            border:1px solid #2e7d32; color:#fff;
            font-weight:bold; padding:9px 22px;
            border-radius:6px; font-size:12px;
            text-transform:uppercase; letter-spacing:1px;
            cursor:pointer; font-family:'Cinzel',serif;
            transition:filter 0.2s;
        "
            onmouseover="this.style.filter='brightness(1.15)'"
            onmouseout="this.style.filter=''">
            🎴 Раздать
        </button>
        <button id="cancel-btn" style="
            background:linear-gradient(135deg,#e53935,#c62828);
            border:1px solid #b71c1c; color:#fff;
            font-weight:bold; padding:9px 22px;
            border-radius:6px; font-size:12px;
            text-transform:uppercase; letter-spacing:1px;
            cursor:pointer; font-family:'Cinzel',serif;
            transition:filter 0.2s;
        "
            onmouseover="this.style.filter='brightness(1.15)'"
            onmouseout="this.style.filter=''">
            ✖ Отмена
        </button>
    </div>
</div>`;

        const dialog = new Dialog({title: '🎴 Раздача карт', content: dialogContent, buttons: {}, width: 420});
        dialog.render(true);

        setTimeout(() => {
            const $d = $(dialog.element);
            $d.find('.window-header').css({background: '#1a1a1a', borderBottom: '1px solid rgba(255,215,0,0.2)'});
            $d.find('.window-title').css({color: '#ffd700', fontWeight: 'bold', fontFamily: 'Cinzel,serif'});
            $d.find('.dialog-buttons').hide();

            $d.find('#distribute-btn').on('click', async () => {
                const mode = $d.find('input[name="distributeMode"]:checked').val();

                if (mode === 'manual') {
                    const deckId = $d.find('select[name="deck"]').val();
                    if (!deckId) {
                        ui.notifications.warn('Выберите колоду');
                        return;
                    }

                    const selectedCard = await this.showCardSelectionDialog(deckId);
                    if (!selectedCard) return;

                    const ok = await this.distributeSpecificCard(selectedCard, deckId, $d.find('.gm-card-distributor'));
                    if (ok) dialog.close();
                } else {
                    const ok = await this.distributeCards($d.find('.gm-card-distributor'));
                    if (ok) dialog.close();
                }
            });
            $d.find('#cancel-btn').on('click', () => dialog.close());
        }, 100);
    }

    async distributeCards(html) {
        const playerIds = html.find('input[name="player"]:checked').map((_, el) => el.value).get();
        if (!playerIds.length) {
            ui.notifications.warn('Выберите хотя бы одного игрока');
            return false;
        }

        const deckId = html.find('select[name="deck"]').val();
        if (!deckId) {
            ui.notifications.warn('Выберите колоду');
            return false;
        }

        this.lastSelectedDeckId = deckId;

        const count = parseInt(html.find('input[name="cardCount"]').val()) || 3;
        const faceDown = html.find('input[name="faceDown"]').is(':checked');
        const deck = game.cards.get(deckId);

        if (!deck || deck.type !== 'deck') {
            ui.notifications.warn('Колода не найдена');
            return false;
        }

        // Получаем РЕАЛЬНО доступные карты
        const availableCards = this.getAvailableCards(deckId);
        if (!availableCards.length) {
            ui.notifications.error('В колоде нет доступных карт (все розданы)');
            return false;
        }

        const cards = this.selectRandomCards(deckId, count);
        if (!cards.length) {
            ui.notifications.error('Нет доступных карт для раздачи');
            return false;
        }
        if (cards.length < count) {
            ui.notifications.warn(`Доступно только ${cards.length} карт вместо ${count}`);
        }

        for (const playerId of playerIds) {
            const player = game.users.get(playerId);
            if (player) await this.sendCardChoiceToPlayer(player, cards, deck, faceDown);
        }

        const remainingCount = availableCards.length - cards.length;
        ui.notifications.info(`✓ Карты отправлены ${playerIds.length} игрокам. Осталось в колоде: ${Math.max(0, remainingCount)}`);
        return true;
    }

    /**
     * ИСПРАВЛЕННАЯ раздача конкретной карты (режим ручного выбора)
     */
    async distributeSpecificCard(cardData, deckId, html) {
        const playerIds = html.find('input[name="player"]:checked').map((_, el) => el.value).get();
        if (!playerIds.length) {
            ui.notifications.warn('Выберите хотя бы одного игрока');
            return false;
        }

        const deck = game.cards.get(deckId);
        const faceDown = html.find('input[name="faceDown"]').is(':checked');

        if (!deck || deck.type !== 'deck') {
            ui.notifications.error('Колода не найдена');
            return false;
        }

        // ИСПРАВЛЕНО: Ищем карту несколькими способами
        let actualCard = null;

        // Способ 1: Прямо в колоде
        actualCard = deck.cards.get(cardData.id);

        // Способ 2: Поиск по всем cards collections
        if (!actualCard) {
            for (const collection of (game.cards?.contents || [])) {
                const found = collection.cards?.get(cardData.id);
                if (found) {
                    actualCard = found;
                    break;
                }
            }
        }

        // Способ 3: Глобальный поиск по имени в колоде
        if (!actualCard && cardData.name) {
            const deckCards = deck.cards?.contents || [];
            actualCard = deckCards.find(c => c.name === cardData.name);
        }

        if (!actualCard) {
            ui.notifications.error(`Карта "${cardData.name}" не найдена в колоде. Возможно, она уже была роздана.`);
            return false;
        }

        // Проверяем, что карта действительно доступна
        const availableCards = this.getAvailableCards(deckId);
        const isStillAvailable = availableCards.some(c => c.id === actualCard.id);

        if (!isStillAvailable) {
            ui.notifications.error(`Карта "${cardData.name}" уже роздана и недоступна`);
            return false;
        }

        for (const playerId of playerIds) {
            const player = game.users.get(playerId);
            if (player) {
                await this.sendCardChoiceToPlayer(player, [actualCard], deck, faceDown);
            }
        }

        // Пересчитываем оставшиеся карты ПОСЛЕ раздачи
        // (небольшая задержка, чтобы Foundry обновил состояние)
        setTimeout(() => {
            const remaining = this.getAvailableCards(deckId).length;
            console.log(`[${MODULE_ID}] После раздачи "${cardData.name}": осталось ${remaining} карт`);
        }, 500);

        ui.notifications.info(`✓ Карта "${cardData.name}" отправлена ${playerIds.length} игроку(ам)`);
        return true;
    }

    async sendCardChoiceToPlayer(player, cards, deck, faceDown = false) {
        try {
            const cardBackStyle = Utils.getSettingSafe('cardBackStyle', 'dark');
            const serializedCards = cards.map(card => ({
                id: card.id,
                name: card.name,
                description: card.description || '',
                front: GMCardDistributor.getCardFront(card),
                back: GMCardDistributor.getCardBack(card, cardBackStyle),
            }));

            await player.query(
                `${MODULE_ID}.showCardDialog`,
                {cards: serializedCards, deck: {id: deck.id, name: deck.name}, faceDown},
                {timeout: 60000}
            );
        } catch (err) {
            console.error(`[${MODULE_ID}] sendCardChoiceToPlayer:`, err);
            ui.notifications.error(`Не удалось отправить диалог ${player.name}: ${err.message}`);
        }
    }
}

const gmCardDistributor = new GMCardDistributor();

Hooks.on('init', () => {

// ── showCardDialog (выполняется на клиенте ИГРОКА) ─────────────────────────
    CONFIG.queries[`${MODULE_ID}.showCardDialog`] = async (queryData) => {
        const {cards, deck} = queryData;

        const faceDown = typeof queryData.faceDown === 'boolean'
            ? queryData.faceDown
            : (game.settings.get(MODULE_ID, 'dealCardsFaceDown') || false);
        const cardBackStyle = game.settings.get(MODULE_ID, 'cardBackStyle') || 'dark';
        const closeDelay = Utils.getSettingSafe('cardSelectionCloseDelay', 1) * 100;
        const sc = Utils.getSettingSafe('cardSelectionScale', 1.35);

        const CARD_W = 160;
        const CARD_H = 240;

        const cardSlots = cards.map((card, i) => {
            const backSrc = card.back || GMCardDistributor.getCardBack(card, cardBackStyle);

            return `
<div class="card-slot"
     data-card-id="${card.id}"
     data-front="${card.front || ''}"
     data-back="${backSrc}"
     data-name="${card.name || ''}"
     data-desc="${card.description || ''}"
     style="
         position:relative;
         width:${CARD_W}px; height:${CARD_H}px;
         cursor:pointer; flex-shrink:0;
         perspective: 800px;
         transition: transform 0.25s ease, filter 0.25s ease;
     "
     onmouseover="if(!this.dataset.selected && !this.closest('.card-container').dataset.chosen){this.style.transform='translateY(-8px) scale(1.04)';this.style.filter='brightness(1.12)';}"
     onmouseout="if(!this.dataset.selected && !this.closest('.card-container').dataset.chosen){this.style.transform='';this.style.filter='';}">

    <div class="card-flipper" data-index="${i}" style="
        width:100%; height:100%;
        position:relative;
        transform-style: preserve-3d;
        transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    ">
        <div class="card-face-back" style="
            position:absolute; inset:0;
            backface-visibility:hidden;
            -webkit-backface-visibility:hidden;
            border-radius:9px; overflow:hidden;
        ">
            <img src="${backSrc}"
                style="
                    display:block; width:100%; height:100%;
                    object-fit:contain; border-radius:9px;
                    opacity:0; transform:translateY(60px);
                    transition:opacity 0.65s ease ${i * 0.16}s, transform 0.65s ease ${i * 0.16}s;
                    pointer-events:none;
                " class="reveal-on-load">
        </div>

        <div class="card-face-front" style="
            position:absolute; inset:0;
            backface-visibility:hidden;
            -webkit-backface-visibility:hidden;
            transform: rotateY(180deg);
            border-radius:9px; overflow:hidden;
        ">
            ${card.front ? `
            <img src="${card.front}"
                style="
                    display:block; width:100%; height:100%;
                    object-fit:contain; border-radius:9px;
                    pointer-events:none;
                ">
            ` : `
            <div style="
                width:100%;height:100%;
                background:linear-gradient(135deg,#1a1a2e,#16213e);
                border-radius:9px;
                display:flex;align-items:center;justify-content:center;
                color:#ffd700;font-size:13px;font-family:'Cinzel',serif;
                text-align:center;padding:10px;box-sizing:border-box;
            ">${card.name || 'Карта'}</div>
            `}
        </div>
    </div>

    <div class="card-badge" style="
        display:none;
        position:absolute; bottom:-34px; left:50%; transform:translateX(-50%);
        background:rgba(10,8,4,0.88); border:1px solid #ffd700; border-radius:6px;
        padding:4px 14px; color:#ffd700; font-size:11px;
        font-family:'Cinzel',serif; white-space:nowrap;
    ">${faceDown ? '☠ Судьба решила...' : '✓ ' + (card.name || 'Карта')}</div>

</div>`;
        }).join('');

        const dialogHTML = `
<div style="
    display:flex; flex-direction:column; align-items:center;
    gap:16px; padding:16px 20px 52px;
    font-family:'Cinzel',serif;
">
    <div style="
        padding:5px 18px; border-radius:16px;
        background:rgba(0,0,0,0.6); border:1px solid rgba(255,215,0,0.3);
        color:#ffd700; font-size:12px; letter-spacing:0.3px; text-align:center;
    ">🙈 Выберите карту — судьба сама выберет за вас</div>

    <div class="card-container" style="
        display:flex; flex-direction:row; flex-wrap:nowrap;
        justify-content:center; align-items:flex-end;
        gap:18px; margin-bottom:36px;
    ">
        ${cardSlots}
    </div>
</div>`;

        const dialog = new Dialog({
            title: '',
            content: dialogHTML,
            buttons: {},
            render: (html) => {

                const $overlay = $('<div>').css({
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 9999, opacity: 0, transition: 'opacity 0.3s ease',
                });
                $('body').append($overlay);
                setTimeout(() => $overlay.css('opacity', 1), 40);

                const totalW = Math.min(cards.length * (CARD_W + 18) + 80, window.innerWidth - 40);
                const $wrapper = html.closest('.dialog');
                $wrapper.css({
                    width: `${totalW}px`,
                    background: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    zIndex: 10000,
                });
                $wrapper.find('.window-header').css('display', 'none');
                html.closest('.window-content').css({
                    background: 'transparent',
                    overflow: 'visible',
                    padding: 0,
                });

                setTimeout(() => {
                    dialog.setPosition({
                        left: Math.max(20, (window.innerWidth - $wrapper.outerWidth()) / 2),
                        top: Math.max(20, (window.innerHeight - $wrapper.outerHeight()) / 2),
                    });
                }, 20);

                const origClose = dialog.close.bind(dialog);
                dialog.close = (...args) => {
                    if (dialog._closeTimeout) {
                        clearTimeout(dialog._closeTimeout);
                        dialog._closeTimeout = null;
                    }
                    $overlay.css('opacity', 0);
                    setTimeout(() => $overlay.remove(), 280);
                    return origClose(...args);
                };

                setTimeout(() => {
                    html.find('.reveal-on-load').css({opacity: 1, transform: 'translateY(0)'});
                }, 50);

                function flipCard($slot, delayMs = 0) {
                    const $flipper = $slot.find('.card-flipper');
                    setTimeout(() => {
                        $flipper.css('transform', 'rotateY(180deg)');
                    }, delayMs);
                }

                html.find('.card-slot').on('click', async function () {
                    const $slot = $(this);
                    const $container = $slot.closest('.card-container');

                    if ($container.data('chosen')) return;
                    $container.attr('data-chosen', 'true');
                    html.find('.card-slot').css('pointer-events', 'none');

                    $slot.attr('data-selected', 'true');

                    const cardId = $slot.data('card-id');
                    const cardData = cards.find(c => c.id === cardId);
                    if (!cardData) return;

                    if (SFX?.play) SFX.play(SFX.sounds.click);

                    $slot.css({
                        transform: `translateY(-16px) scale(${sc})`,
                        filter: 'drop-shadow(0 0 18px rgba(255,215,0,0.9)) brightness(1.15)',
                        zIndex: 100,
                        transition: 'transform 0.35s ease, filter 0.35s ease',
                    });

                    if (!faceDown) {
                        flipCard($slot, 0);
                    }

                    html.find('.card-slot').not($slot).each(function (idx) {
                        const $other = $(this);

                        if (!faceDown) {
                            flipCard($other, 400 + idx * 180);
                        }

                        setTimeout(() => {
                            $other.css({
                                opacity: 0.55,
                                filter: 'grayscale(40%) brightness(0.7)',
                                transition: 'opacity 0.35s ease, filter 0.35s ease',
                            });
                        }, (faceDown ? 0 : 400 + idx * 180) + 300);
                    });

                    setTimeout(() => {
                        $slot.find('.card-badge').fadeIn(300);
                    }, 400);

                    const revealTime = 400 + (cards.length - 1) * 180 + 300;
                    const enjoyTime = 2000;
                    const totalDelay = Math.max(closeDelay, revealTime + enjoyTime);

                    dialog._closeTimeout = setTimeout(() => {
                        if (dialog?.rendered && !dialog._closing) {
                            dialog._closing = true;
                            $(dialog.element).animate({opacity: 0}, 200, () => dialog.close());
                        }
                    }, totalDelay);

                    ChatMessage.create({
                        content: `
<div style="
    text-align:center; padding:12px 14px;
    background:linear-gradient(135deg,#2c3e50,#34495e);
    border:2px solid #543; border-radius:10px; color:#f0e6d2;
    font-family:'Signika',sans-serif;
">
    <h3 style="color:#ffd700;margin:0 0 6px;font-family:'Cinzel',serif;font-size:14px;">🎴 Карта выбрана</h3>
    <p style="margin:0;font-size:12px;">
        <strong>${game.user.name}</strong> взял карту из колоды <strong>${deck.name}</strong>
        ${faceDown ? '<br><em style="color:#8a7a65;font-size:11px;">(карта закрыта — раскроется при розыгрыше)</em>' : ''}
    </p>
    ${!faceDown && cardData.front ? `
        <img src="${cardData.front}" style="max-width:120px;border:2px solid #543;border-radius:6px;margin:8px 0 4px;">
        <div style="color:#ffd700;font-weight:bold;font-family:'Cinzel',serif;font-size:13px;">${cardData.name}</div>
        ${cardData.description ? `<div style="font-style:italic;color:#c0b090;font-size:11px;margin-top:2px;">${cardData.description}</div>` : ''}
    ` : ''}
</div>`,
                        speaker: ChatMessage.getSpeaker({alias: 'Мастер Игр'}),
                    }).catch(() => {
                    });

                    try {
                        const gmUser = game.users.find(u => u.isGM && u.active);
                        if (gmUser) {
                            const result = await gmUser.query(
                                `${MODULE_ID}.passCardToPlayer`,
                                {
                                    cardId: cardData.id,
                                    cardName: cardData.name,
                                    cardFront: cardData.front,
                                    cardBack: cardData.back,
                                    cardDesc: cardData.description,
                                    deckId: deck.id,
                                    deckName: deck.name,
                                    playerId: game.user.id,
                                    playerName: game.user.name,
                                    faceDown,
                                },
                                {timeout: 10000}
                            );

                            if (result?.success) {
                                ui.notifications.info(
                                    faceDown
                                        ? 'Закрытая карта добавлена в руку. Раскроется при розыгрыше.'
                                        : `Карта "${cardData.name}" добавлена в вашу руку!`
                                );
                            } else {
                                ui.notifications.error(`Ошибка: ${result?.error || '?'}`);
                            }
                        }
                    } catch (passErr) {
                        console.error(`[${MODULE_ID}] passCard query:`, passErr);
                        ui.notifications.error('Ошибка при передаче карты: ' + passErr.message);
                    }
                });
            },
        });

        dialog.render(true);
        return {success: true};
    };

    // ── passCardToPlayer (выполняется на клиенте ГМа) ──────────────────────────
    CONFIG.queries[`${MODULE_ID}.passCardToPlayer`] = async (queryData) => {
        if (!game.user.isGM) return {success: false, error: 'Только ГМ'};

        const {cardId, cardName, cardFront, cardDesc, deckId, deckName, playerId, playerName, faceDown} = queryData;

        try {
            let card = null;

            // Способ 1: Ищем карту прямо в колоде по ID
            if (cardId && deckId) {
                const deckDoc = game.cards.get(deckId);
                if (deckDoc?.cards) {
                    card = deckDoc.cards.get(cardId);
                }
            }

            // Способ 2: Ищем во ВСЕХ коллекциях по ID
            if (!card && cardId) {
                for (const collection of (game.cards?.contents || [])) {
                    const found = collection.cards?.get(cardId);
                    if (found) {
                        card = found;
                        console.log(`[${MODULE_ID}] Карта найдена в коллекции "${collection.name}" (${collection.type})`);
                        break;
                    }
                }
            }

            // Способ 3: По имени в колоде
            if (!card && cardName && deckId) {
                const deckDoc = game.cards.get(deckId);
                if (deckDoc?.cards) {
                    card = [...deckDoc.cards.values()].find(c => c.name === cardName);
                }
            }

            // Способ 4: Глобальный поиск по имени
            if (!card && cardName) {
                for (const collection of (game.cards?.contents || [])) {
                    if (collection.type !== 'deck') continue;
                    const found = [...(collection.cards?.values() || [])].find(c => c.name === cardName);
                    if (found) {
                        card = found;
                        break;
                    }
                }
            }

            if (!card) {
                console.error(`[${MODULE_ID}] passCardToPlayer: карта не найдена. id=${cardId}, name=${cardName}, deckId=${deckId}`);
                return {success: false, error: `Карта "${cardName || cardId}" не найдена`};
            }

            const player = game.users.get(playerId);
            if (!player) return {success: false, error: 'Игрок не найден'};

            console.log(`[${MODULE_ID}] Передаём карту "${card.name}" (${card.id}) игроку ${player.name}. Карта сейчас в: ${card.parent?.name} (${card.parent?.type})`);

            const success = await gmCardDistributor.passCardToPlayer(card, player, faceDown);
            if (!success) return {success: false, error: 'Не удалось передать карту'};

            ChatMessage.create({
                content: `
<div style="
    padding:10px 12px;
    background:rgba(15,10,5,0.95); border:1px solid rgba(255,215,0,0.4);
    border-radius:8px; color:#f0e6d2; font-family:'Signika',sans-serif;
">
    <div style="color:#ffd700;font-weight:bold;margin-bottom:6px;font-size:11px;">📋 Инфо для ГМа</div>
    <p style="margin:0 0 7px;font-size:12px;">
        <strong>${playerName}</strong> взял карту из <strong>${deckName}</strong>:
    </p>
    <div style="display:flex;align-items:center;gap:9px;">
        ${cardFront ? `<img src="${cardFront}" style="width:44px;height:66px;object-fit:contain;border:1px solid #543;border-radius:4px;flex-shrink:0;">` : ''}
        <div>
            <div style="color:#ffd700;font-weight:bold;font-size:12px;">${cardName}</div>
            ${cardDesc ? `<div style="color:#8a7a65;font-size:11px;margin-top:2px;">${cardDesc}</div>` : ''}
            <div style="
                margin-top:5px; padding:2px 7px; border-radius:4px;
                font-size:10px; display:inline-block;
                background:${faceDown ? 'rgba(255,200,0,0.1)' : 'rgba(76,175,80,0.1)'};
                color:${faceDown ? '#f0d060' : '#90c890'};
            ">${faceDown ? '🙈 Карта закрыта в руке' : '👁 Карта открыта в руке'}</div>
        </div>
    </div>
</div>`,
                whisper: [game.user.id],
                speaker: ChatMessage.getSpeaker({alias: 'Система'}),
            }).catch(() => {
            });

            return {success: true};
        } catch (err) {
            console.error(`[${MODULE_ID}] passCardToPlayer query handler:`, err);
            return {success: false, error: err.message};
        }
    };

});

Hooks.on('renderNavigation', () => {
    if (!game.user.isGM || $('#gm-card-distributor-floating').length) return;
    try {
        const $btn = $(`
<div id="gm-card-distributor-floating" style="
    position:fixed; top:50%; right:20px; transform:translateY(-50%);
    z-index:1000; background:linear-gradient(135deg,#2c3e50,#34495e);
    border:2px solid #543; border-radius:10px; padding:13px;
    box-shadow:0 4px 15px rgba(0,0,0,0.5);
    cursor:pointer; transition:all 0.25s; font-family:'Signika',sans-serif;
">
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;color:#f0e6d2;">
        <i class="fas fa-layer-group" style="font-size:20px;color:#ffd700;"></i>
        <span style="font-size:10px;font-weight:bold;text-align:center;">Раздать<br>карты</span>
    </div>
</div>`);
        $btn.on('click', () => gmCardDistributor.showDistributionDialog());
        $btn.on('mouseenter', function () {
            $(this).css({transform: 'translateY(-50%) scale(1.1)', borderColor: '#ffd700'});
        });
        $btn.on('mouseleave', function () {
            $(this).css({transform: 'translateY(-50%) scale(1)', borderColor: '#543'});
        });
        $('body').append($btn);
    } catch (err) {
        console.warn(`[${MODULE_ID}] floating button:`, err);
    }
});

export {GMCardDistributor, gmCardDistributor};
