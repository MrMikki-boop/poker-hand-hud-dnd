/* ===== GM CARD DISTRIBUTOR ===== */
/**
 * @fileoverview GM Card Distributor system for Poker Hand HUD
 * @version 2.6.0
 *
 * CHANGES v2.6:
 *  - Убран overflow:hidden с контейнера диалога (обрезал нативный select)
 *  - closeDelay теперь стартует СРАЗУ при клике, а не после query (~10 сек → 3 сек)
 *  - Уменьшен default closeDelay с 8 до 3 секунд
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';

class GMCardDistributor {
    constructor() {
        this.selectedPlayers = new Set();
        this.selectedDeck    = null;
        this.availableDecks  = [];
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
                    id:    deck.id,
                    name:  deck.name,
                    cards: (deck.cards?.contents || []).filter(c => c.type !== 'deck'),
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

    selectRandomCards(cards, count = 3) {
        if (!cards?.length) return [];
        const available = cards.filter(c => c.parent?.type !== 'hand' && c.parent?.type !== 'pile');
        if (!available.length) return [];
        return [...available].sort(() => Math.random() - 0.5).slice(0, Math.min(count, available.length));
    }

    static getCardBack(card, cardBackStyle = 'dark') {
        if (card.back?.img)                                   return card.back.img;
        if (typeof card.back === 'string' && card.back)       return card.back;
        if (card.faces?.back?.src)                            return card.faces.back.src;
        if (card.system?.back)                                return card.system.back;
        if (card.parent?.type === 'deck' && card.parent?.img) return card.parent.img;
        const file = cardBackStyle === 'dark' ? 'dark-gold.webp' : 'light-soft.webp';
        return `modules/poker-hand-hud-dnd/backs/${file}`;
    }

    static getCardFront(card) {
        return card.faces?.[0]?.img || card.img || null;
    }

    async passCardToPlayer(card, player, keepFaceDown = false) {
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
                await playerHand.update({ ownership: { ...(playerHand.ownership || {}), [player.id]: 3 } });
            }

            await card.pass(playerHand, { chat: false, display: false, render: false });

            if (keepFaceDown) {
                const cardInHand = playerHand.cards.get(card.id);
                if (cardInHand) await cardInHand.update({ face: null });
            }

            return true;
        } catch (err) {
            console.error(`[${MODULE_ID}] passCardToPlayer:`, err);
            ui.notifications.error(`Не удалось передать карту ${player.name}: ${err.message}`);
            return false;
        }
    }

    // ─── Диалог ГМа ───────────────────────────────────────────────────────────
    async showDistributionDialog() {
        if (!game.user.isGM) { ui.notifications.error('Только для ГМа'); return; }

        const players = game.users.filter(u => u.role === CONST.USER_ROLES.PLAYER && u.active);
        this.availableDecks = await this.getAvailableDecks();

        const lastDeckId     = this.lastSelectedDeckId || this.availableDecks[0]?.id || '';
        const globalFaceDown = Utils.getSettingSafe('dealCardsFaceDown', false);

        // ВАЖНО: overflow НЕ hidden — иначе нативный select обрезается браузером.
        // Скругления углов делаем через отдельные стили на первом и последнем блоке.
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

        <!-- Колода —— НЕТ overflow:hidden выше, дропдаун select будет виден -->
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
                ${this.availableDecks.map(d =>
            `<option value="${d.id}" ${d.id === lastDeckId ? 'selected' : ''} style="background:#1a1a1a;">
                        🎴 ${d.name} (${d.cards.length})
                    </option>`
        ).join('')}
            </select>
        </div>

        <!-- Настройки -->
        <div style="margin-bottom:20px;">
            <h4 style="margin:0 0 9px;color:#ffd700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">⚙️ Настройки</h4>
            <div style="
                display:flex; flex-direction:column; gap:10px;
                padding:12px; background:rgba(0,0,0,0.35);
                border-radius:7px; border:1px solid rgba(255,215,0,0.2);
            ">
                <!-- Кол-во карт -->
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
                            и раскрывается только при розыгрыше.<br>
                            ГМ получит шёпот — что именно взял игрок.
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

        const dialog = new Dialog({ title: '🎴 Раздача карт', content: dialogContent, buttons: {}, width: 420 });
        dialog.render(true);

        setTimeout(() => {
            const $d = $(dialog.element);
            $d.find('.window-header').css({ background: '#1a1a1a', borderBottom: '1px solid rgba(255,215,0,0.2)' });
            $d.find('.window-title').css({ color: '#ffd700', fontWeight: 'bold', fontFamily: 'Cinzel,serif' });
            $d.find('.dialog-buttons').hide();

            $d.find('#distribute-btn').on('click', async () => {
                const ok = await this.distributeCards($d.find('.gm-card-distributor'));
                if (ok) dialog.close();
            });
            $d.find('#cancel-btn').on('click', () => dialog.close());
        }, 100);
    }

    async distributeCards(html) {
        const playerIds = html.find('input[name="player"]:checked').map((_, el) => el.value).get();
        if (!playerIds.length) { ui.notifications.warn('Выберите хотя бы одного игрока'); return false; }

        const deckId = html.find('select[name="deck"]').val();
        if (!deckId) { ui.notifications.warn('Выберите колоду'); return false; }

        this.lastSelectedDeckId = deckId;

        const count    = parseInt(html.find('input[name="cardCount"]').val()) || 3;
        const faceDown = html.find('input[name="faceDown"]').is(':checked');
        const deck     = this.availableDecks.find(d => d.id === deckId);

        if (!deck?.cards.length)  { ui.notifications.warn('В колоде нет карт'); return false; }

        const cards = this.selectRandomCards(deck.cards, count);
        if (!cards.length)        { ui.notifications.error('Нет доступных карт'); return false; }
        if (cards.length < count) { ui.notifications.error(`Доступно только ${cards.length} карт`); return false; }

        for (const playerId of playerIds) {
            const player = game.users.get(playerId);
            if (player) await this.sendCardChoiceToPlayer(player, cards, deck, faceDown);
        }

        ui.notifications.info(`Карты${faceDown ? ' (рубашкой вверх)' : ''} отправлены ${playerIds.length} игрокам из "${deck.name}"`);
        return true;
    }

    async sendCardChoiceToPlayer(player, cards, deck, faceDown = false) {
        try {
            const cardBackStyle   = Utils.getSettingSafe('cardBackStyle', 'dark');
            const serializedCards = cards.map(card => ({
                id:          card.id,
                name:        card.name,
                description: card.description || '',
                front:       GMCardDistributor.getCardFront(card),
                back:        GMCardDistributor.getCardBack(card, cardBackStyle),
            }));

            await player.query(
                `${MODULE_ID}.showCardDialog`,
                { cards: serializedCards, deck: { id: deck.id, name: deck.name }, faceDown },
                { timeout: 60000 }
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
        const { cards, deck } = queryData;

        const faceDown      = typeof queryData.faceDown === 'boolean'
            ? queryData.faceDown
            : (game.settings.get(MODULE_ID, 'dealCardsFaceDown') || false);
        const cardBackStyle = game.settings.get(MODULE_ID, 'cardBackStyle') || 'dark';

        // ИЗМЕНЕНИЕ v2.6: используем 3 сек как дефолт вместо 8,
        // и таймер стартует СРАЗУ при клике, до завершения query
        const closeDelay = Utils.getSettingSafe('cardSelectionCloseDelay', 1) * 100;
        const sc         = Utils.getSettingSafe('cardSelectionScale', 1.35);

        const CARD_W = 160;
        const CARD_H = 240;

        const cardSlots = cards.map((card, i) => {
            const displaySrc = faceDown
                ? (card.back || GMCardDistributor.getCardBack(card, cardBackStyle))
                : (card.front || card.back || GMCardDistributor.getCardBack(card, cardBackStyle));

            return `
<div class="card-slot"
     data-card-id="${card.id}"
     data-front="${card.front || ''}"
     data-back="${card.back || ''}"
     style="
         position:relative;
         width:${CARD_W}px; height:${CARD_H}px;
         cursor:pointer; flex-shrink:0;
         transition:transform 0.25s ease, filter 0.25s ease;
     "
     onmouseover="if(!this.dataset.selected){this.style.transform='translateY(-8px) scale(1.04)';this.style.filter='brightness(1.12)';}"
     onmouseout="if(!this.dataset.selected){this.style.transform='';this.style.filter='';}">

    <img class="card-img" src="${displaySrc}"
        style="
            display:block; width:100%; height:100%;
            object-fit:contain; border-radius:9px;
            opacity:0; transform:translateY(60px);
            transition:opacity 0.65s ease ${i * 0.16}s, transform 0.65s ease ${i * 0.16}s;
            pointer-events:none;
        ">

    <div class="card-badge" style="
        display:none;
        position:absolute; bottom:-34px; left:50%; transform:translateX(-50%);
        background:rgba(10,8,4,0.88); border:1px solid #ffd700; border-radius:6px;
        padding:4px 14px; color:#ffd700; font-size:11px;
        font-family:'Cinzel',serif; white-space:nowrap;
    ">${faceDown ? '✓ Выбрано' : `✓ ${card.name}`}</div>

</div>`;
        }).join('');

        const hintText = faceDown
            ? '🙈 Выберите карту вслепую — она раскроется при розыгрыше'
            : 'Выберите карту';

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
    ">${hintText}</div>

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

                // Оверлей
                const $overlay = $('<div>').css({
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.82)',
                    zIndex: 9999, opacity: 0, transition: 'opacity 0.3s ease',
                });
                $('body').append($overlay);
                setTimeout(() => $overlay.css('opacity', 1), 40);

                // Стиль окна — ширина под кол-во карт
                const totalW   = Math.min(cards.length * (CARD_W + 18) + 80, window.innerWidth - 40);
                const $wrapper = html.closest('.dialog');
                $wrapper.css({ width: `${totalW}px`, background: 'transparent', boxShadow: 'none', border: 'none', zIndex: 10000 });
                $wrapper.find('.window-header').css('display', 'none');
                html.closest('.window-content').css({ background: 'transparent', overflow: 'visible', padding: 0 });

                // Центрируем
                setTimeout(() => {
                    dialog.setPosition({
                        left: Math.max(20, (window.innerWidth  - $wrapper.outerWidth())  / 2),
                        top:  Math.max(20, (window.innerHeight - $wrapper.outerHeight()) / 2),
                    });
                }, 20);

                // Перехват close — убираем оверлей
                const origClose = dialog.close.bind(dialog);
                dialog.close = (...args) => {
                    if (dialog._closeTimeout) { clearTimeout(dialog._closeTimeout); dialog._closeTimeout = null; }
                    $overlay.css('opacity', 0);
                    setTimeout(() => $overlay.remove(), 280);
                    return origClose(...args);
                };

                // Появление карт
                setTimeout(() => { html.find('.card-img').css({ opacity: 1, transform: 'translateY(0)' }); }, 50);

                // ── Клик по карте ──────────────────────────────────────────────
                html.find('.card-slot').on('click', async function () {
                    const $slot = $(this);
                    if ($slot.data('selected')) return;

                    const cardId   = $slot.data('card-id');
                    const cardData = cards.find(c => c.id === cardId);
                    if (!cardData) return;

                    if (SFX?.play) SFX.play(SFX.sounds.click);

                    html.find('.card-slot').css('pointer-events', 'none');
                    $slot.attr('data-selected', 'true');

                    // Визуальный отклик — выбранная карта поднимается и светится
                    $slot.css({
                        transform:  `translateY(-12px) scale(${sc})`,
                        filter:     'drop-shadow(0 0 14px rgba(255,215,0,0.85)) brightness(1.12)',
                        zIndex:     100,
                        transition: 'transform 0.3s ease, filter 0.3s ease',
                    });
                    $slot.find('.card-badge').fadeIn(300);

                    // Остальные тускнеют
                    html.find('.card-slot').not($slot).css({
                        opacity:    0.18,
                        filter:     'grayscale(80%) brightness(0.4)',
                        transition: 'opacity 0.35s ease, filter 0.35s ease',
                    });

                    // ── ВАЖНО: таймер закрытия стартует СРАЗУ, до async операций ──
                    dialog._closeTimeout = setTimeout(() => {
                        if (dialog?.rendered && !dialog._closing) {
                            dialog._closing = true;
                            $(dialog.element).animate({ opacity: 0 }, 200, () => dialog.close());
                        }
                    }, closeDelay);

                    // Чат — публичное сообщение (не ждём)
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
                        speaker: ChatMessage.getSpeaker({ alias: 'Мастер Игр' }),
                    }).catch(() => {});

                    // Запрос к ГМу — не блокирует таймер закрытия
                    try {
                        const gmUser = game.users.find(u => u.isGM && u.active);
                        if (gmUser) {
                            const result = await gmUser.query(
                                `${MODULE_ID}.passCardToPlayer`,
                                {
                                    cardId:     cardData.id,
                                    cardName:   cardData.name,
                                    cardFront:  cardData.front,
                                    cardBack:   cardData.back,
                                    cardDesc:   cardData.description,
                                    deckId:     deck.id,
                                    deckName:   deck.name,
                                    playerId:   game.user.id,
                                    playerName: game.user.name,
                                    faceDown,
                                },
                                { timeout: 10000 }
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
        return { success: true };
    };

    // ── passCardToPlayer (выполняется на клиенте ГМА) ──────────────────────────
    CONFIG.queries[`${MODULE_ID}.passCardToPlayer`] = async (queryData) => {
        if (!game.user.isGM) return { success: false, error: 'Только ГМ' };

        const { cardId, cardName, cardFront, cardDesc, deckId, deckName, playerId, playerName, faceDown } = queryData;

        try {
            let card = cardId ? game.cards.get(cardId) : null;
            if (!card && cardName && deckId) {
                const deckDoc = game.cards.get(deckId);
                if (deckDoc?.cards) card = [...deckDoc.cards.values()].find(c => c.name === cardName);
            }
            if (!card && cardName) card = (game.cards?.contents || []).find(c => c.name === cardName);
            if (!card) return { success: false, error: `Карта "${cardName}" не найдена` };

            const player = game.users.get(playerId);
            if (!player) return { success: false, error: 'Игрок не найден' };

            const success = await gmCardDistributor.passCardToPlayer(card, player, faceDown);
            if (!success) return { success: false, error: 'Не удалось передать карту' };

            // Шёпот ГМу
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
                speaker: ChatMessage.getSpeaker({ alias: 'Система' }),
            }).catch(() => {});

            return { success: true };
        } catch (err) {
            console.error(`[${MODULE_ID}] passCardToPlayer:`, err);
            return { success: false, error: err.message };
        }
    };

});

// ─── Плавающая кнопка ─────────────────────────────────────────────────────────
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
        $btn.on('mouseenter', function () { $(this).css({ transform: 'translateY(-50%) scale(1.1)', borderColor: '#ffd700' }); });
        $btn.on('mouseleave', function () { $(this).css({ transform: 'translateY(-50%) scale(1)',  borderColor: '#543'    }); });
        $('body').append($btn);
    } catch (err) {
        console.warn(`[${MODULE_ID}] floating button:`, err);
    }
});

export { GMCardDistributor, gmCardDistributor };