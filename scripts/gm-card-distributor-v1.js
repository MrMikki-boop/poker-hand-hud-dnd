/* ===== POKER HAND HUD - GM CARD DISTRIBUTOR ===== */
/**
 * @fileoverview GM card distribution system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';

/**
 * Система раздачи карт для ГМа
 * @class GMCardDistributor
 */
class GMCardDistributor {
    constructor() {
        this.selectedPlayers = new Set();
        this.selectedDeck = null;
        this.availableDecks = [];
        this.faceFolder = "Новые карты/Лицо";
        this.backFolder = "Новые карты/Рубашка";
        this.borderColor = '#543';
        this.borderWidth = '5px';
    }

    /**
     * Проверяет доступность модуля Orcnog Card Viewer
     * @returns {boolean}
     */
    checkCardViewerModule() {
        if (!game.modules.get("orcnog-card-viewer")?.active) {
            ui.notifications.warn('Модуль "Orcnog Card Viewer" не найден. Некоторые функции могут быть недоступны.');
            return false;
        }
        return true;
    }

    /**
     * Получает список доступных колод
     * @returns {Promise<string[]>}
     */
    async getAvailableDecks() {
        try {
            // Получаем все папки в директории карт
            const result = await foundry.applications.apps.FilePicker.implementation.browse("data", "Новые карты");
            if (!result?.dirs?.length) {
                ui.notifications.warn('Не найдено папок с колодами в директории "Новые карты"');
                return [];
            }
            
            // Фильтруем только папки, которые могут быть колодами
            return result.dirs.filter(dir => 
                !dir.includes("Лицо") && 
                !dir.includes("Рубашка") && 
                !dir.includes("Back") && 
                !dir.includes("Face")
            );
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to get available decks:`, error);
            ui.notifications.error('Не удалось получить список колод');
            return [];
        }
    }

    /**
     * Получает файлы карт из указанной колоды
     * @param {string} deckName - Название колоды
     * @returns {Promise<{front: string[], back: string[]}>}
     */
    async getDeckFiles(deckName) {
        try {
            const faceFolder = `${this.faceFolder}/${deckName}`;
            const backFolder = `${this.backFolder}`;

            const faceFiles = await foundry.applications.apps.FilePicker.implementation.browse("data", faceFolder);
            const backFiles = await foundry.applications.apps.FilePicker.implementation.browse("data", backFolder);

            if (!faceFiles?.files?.length) {
                ui.notifications.warn(`Нет файлов в папке: ${faceFolder}`);
                return { front: [], back: [] };
            }

            if (!backFiles?.files?.length) {
                ui.notifications.warn(`Нет файлов в папке: ${backFolder}`);
                return { front: [], back: [] };
            }

            return {
                front: faceFiles.files,
                back: backFiles.files
            };
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to get deck files:`, error);
            ui.notifications.error('Не удалось загрузить файлы колоды');
            return { front: [], back: [] };
        }
    }

    /**
     * Сортирует файлы карт по номеру и имени
     * @param {string[]} files - Массив файлов
     * @returns {string[]}
     */
    sortFiles(files) {
        return files.sort((a, b) => {
            let aname = decodeURIComponent(a.split("/").pop());
            let bname = decodeURIComponent(b.split("/").pop());
            let anum = parseInt(aname.match(/\d+/)?.[0] ?? 0);
            let bnum = parseInt(bname.match(/\d+/)?.[0] ?? 0);
            if (anum !== bnum) return anum - bnum;
            return aname.localeCompare(bname, "ru");
        });
    }

    /**
     * Выбирает случайные карты из колоды
     * @param {string[]} cards - Массив карт
     * @param {number} count - Количество карт для выбора
     * @returns {string[]}
     */
    selectRandomCards(cards, count = 3) {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
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

        const dialogContent = `
            <div class="gm-card-distributor" style="
                padding: 20px;
                min-width: 400px;
                font-family: 'Signika', sans-serif;
            ">
                <h3 style="margin-bottom: 15px; text-align: center; color: #c0a060;">
                    🎴 Раздача карт игрокам
                </h3>
                
                <div class="section" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #d4c5a0;">Выберите игроков:</h4>
                    <div class="players-list" style="
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        max-height: 150px;
                        overflow-y: auto;
                        border: 1px solid #543;
                        padding: 10px;
                        border-radius: 5px;
                        background: rgba(0,0,0,0.3);
                    ">
                        ${players.map(player => `
                            <label class="player-checkbox" style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                cursor: pointer;
                                padding: 5px;
                                border-radius: 3px;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(192,160,96,0.2)'" onmouseout="this.style.background='transparent'">
                                <input type="checkbox" name="player" value="${player.id}" style="margin: 0;">
                                <span>${player.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="section" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #d4c5a0;">Выберите колоду:</h4>
                    <select name="deck" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #543;
                        border-radius: 5px;
                        background: rgba(0,0,0,0.5);
                        color: #f0e6d2;
                        font-family: inherit;
                    ">
                        <option value="">Выберите колоду...</option>
                        ${this.availableDecks.map(deck => `
                            <option value="${deck}">${deck}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="section" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #d4c5a0;">Настройки:</h4>
                    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span>Количество карт:</span>
                        <input type="number" name="cardCount" value="3" min="1" max="10" style="
                            width: 60px;
                            padding: 4px;
                            border: 1px solid #543;
                            border-radius: 3px;
                            background: rgba(0,0,0,0.5);
                            color: #f0e6d2;
                        ">
                    </label>
                </div>
            </div>
        `;

        const dialog = new Dialog({
            title: "Раздача карт",
            content: dialogContent,
            buttons: {
                distribute: {
                    label: "🎴 Раздать карты",
                    callback: (html) => this.distributeCards(html)
                },
                cancel: {
                    label: "Отмена",
                    callback: () => {}
                }
            },
            default: "distribute",
            render: (html) => {
                // Применяем стили к диалогу
                const dialogElement = html.closest('.dialog');
                dialogElement.css({
                    'background': 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                    'border': `2px solid ${this.borderColor}`,
                    'color': '#f0e6d2'
                });

                // Стили для заголовка
                dialogElement.find('.window-header').css({
                    'background': 'rgba(0,0,0,0.3)',
                    'border-bottom': `1px solid ${this.borderColor}`
                });
            }
        });

        dialog.render(true);
    }

    /**
     * Раздает карты выбранным игрокам
     * @param {jQuery} html - HTML элемент диалога
     */
    async distributeCards(html) {
        // Получаем выбранных игроков
        const selectedPlayerIds = html.find('input[name="player"]:checked').map((i, el) => el.value).get();
        
        if (selectedPlayerIds.length === 0) {
            ui.notifications.warn('Выберите хотя бы одного игрока');
            return;
        }

        // Получаем выбранную колоду
        const selectedDeck = html.find('select[name="deck"]').val();
        if (!selectedDeck) {
            ui.notifications.warn('Выберите колоду');
            return;
        }

        // Получаем количество карт
        const cardCount = parseInt(html.find('input[name="cardCount"]').val()) || 3;

        // Получаем файлы колоды
        const deckFiles = await this.getDeckFiles(selectedDeck);
        if (deckFiles.front.length === 0) {
            return;
        }

        // Сортируем и выбираем случайные карты
        const sortedCards = this.sortFiles(deckFiles.front);
        const selectedCards = this.selectRandomCards(sortedCards, cardCount);
        const randomBack = deckFiles.back[Math.floor(Math.random() * deckFiles.back.length)];

        // Отправляем карты каждому игроку
        for (const playerId of selectedPlayerIds) {
            const player = game.users.get(playerId);
            if (player) {
                await this.sendCardChoiceToPlayer(player, selectedCards, randomBack, selectedDeck);
            }
        }

        ui.notifications.info(`Карты отправлены ${selectedPlayerIds.length} игрокам`);
    }

    /**
     * Отправляет диалог выбора карты игроку
     * @param {User} player - Игрок
     * @param {string[]} cards - Массив карт
     * @param {string} backImg - Изображение рубашки
     * @param {string} deckName - Название колоды
     */
    async sendCardChoiceToPlayer(player, cards, backImg, deckName) {
        const cardChoiceContent = `
            <div class="card-choice-dialog" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 15px;
                padding: 10px;
            ">
                <h3 style="
                    text-align: center;
                    font-size: 1.5em;
                    font-family: 'Cinzel', serif;
                    color: #ffd700;
                    text-shadow: 0 0 10px #000, 0 0 5px #ffd700;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                ">
                    🎴 Выберите одну карту 🎴
                </h3>
                <p style="text-align: center; color: #d4c5a0;">
                    ГМ раздал вам карты из колоды: <strong>${deckName}</strong>
                </p>
                <div class="card-container" style="
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                ">
                    ${cards.map((card, index) => `
                        <div class="card-slot" data-front="${card}" data-back="${backImg}" data-player="${player.id}" style="
                            width: 150px;
                            aspect-ratio: 2 / 3;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 8px;
                            overflow: hidden;
                            border: 2px solid #543;
                            transition: all 0.3s ease;
                            position: relative;
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="${backImg}" class="card-img" style="
                                width: 100%;
                                height: 100%;
                                object-fit: contain;
                                opacity: 0;
                                transform: translateY(40px);
                                transition: all 0.6s ease ${index * 0.2}s;
                            ">
                            <div class="card-number" style="
                                position: absolute;
                                top: 5px;
                                left: 5px;
                                background: rgba(0,0,0,0.7);
                                color: #ffd700;
                                padding: 2px 6px;
                                border-radius: 3px;
                                font-size: 12px;
                                font-weight: bold;
                            ">
                                ${index + 1}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Создаем сообщение в чате для игрока
        const messageData = {
            content: cardChoiceContent,
            whisper: [player.id],
            speaker: ChatMessage.getSpeaker({ alias: "Мастер Игр" })
        };

        const message = await ChatMessage.create(messageData);

        // Добавляем обработчики кликов на карты
        setTimeout(() => {
            // Анимация появления карт
            const messageElement = document.querySelector(`.chat-message[data-message-id="${message.id}"]`);
            if (messageElement) {
                messageElement.querySelectorAll('.card-img').forEach((img, index) => {
                    setTimeout(() => {
                        img.style.transform = 'translateY(0)';
                        img.style.opacity = '1';
                    }, 50 + index * 200);
                });

                // Обработчики выбора карты
                messageElement.querySelectorAll('.card-slot').forEach(slot => {
                    slot.addEventListener('click', async (e) => {
                        await this.handleCardSelection(slot, player, deckName);
                    });
                });
            }
        }, 100);
    }

    /**
     * Обрабатывает выбор карты игроком
     * @param {HTMLElement} slot - Элемент выбранной карты
     * @param {User} player - Игрок
     * @param {string} deckName - Название колоды
     */
    async handleCardSelection(slot, player, deckName) {
        const frontImg = slot.dataset.front;
        const backImg = slot.dataset.back;

        // Показываем выбранную карту
        slot.querySelector('.card-img').src = frontImg;
        
        // Убираем остальные карты
        const container = slot.closest('.card-container');
        container.querySelectorAll('.card-slot').forEach(otherSlot => {
            if (otherSlot !== slot) {
                otherSlot.style.opacity = '0.3';
                otherSlot.style.pointerEvents = 'none';
            }
        });

        // Воспроизводим звук
        SFX.play(SFX.sounds.click);

        // Показываем карту через Orcnog Card Viewer если доступно
        if (this.checkCardViewerModule() && typeof OrcnogFancyDisplay === "function") {
            OrcnogFancyDisplay({
                front: frontImg,
                back: backImg,
                border: this.borderColor,
                borderWidth: this.borderWidth
            }).render(true);
        }

        // Отправляем сообщение о выборе в общий чат
        const cardName = decodeURIComponent(frontImg.split("/").pop());
        const announcementContent = `
            <div style="
                text-align: center;
                padding: 10px;
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border: 2px solid #543;
                border-radius: 8px;
                color: #f0e6d2;
            ">
                <h3 style="color: #ffd700; margin-bottom: 10px;">🎴 Карта выбрана! 🎴</h3>
                <p><strong>${player.name}</strong> выбрал карту из колоды <strong>${deckName}</strong></p>
                <div style="margin: 10px 0;">
                    <img src="${frontImg}" style="
                        max-width: 200px;
                        max-height: 280px;
                        border: 2px solid #543;
                        border-radius: 5px;
                    "/>
                </div>
                <p style="font-style: italic; color: #d4c5a0;">Карта: ${cardName}</p>
            </div>
        `;

        await ChatMessage.create({
            content: announcementContent,
            speaker: ChatMessage.getSpeaker({ alias: "Мастер Игр" })
        });
    }
}

// Создаем экземпляр системы
const gmCardDistributor = new GMCardDistributor();

// Добавляем кнопку в интерфейс ГМа
Hooks.on('renderPlayerList', (app, html, data) => {
    if (!game.user.isGM) return;

    const gmButton = $(`
        <button id="gm-card-distributor-btn" style="
            margin: 5px;
            padding: 8px 12px;
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            border: 1px solid #543;
            border-radius: 5px;
            color: #f0e6d2;
            cursor: pointer;
            font-family: 'Signika', sans-serif;
            font-size: 12px;
            transition: all 0.3s ease;
        " title="Раздать карты игрокам">
            🎴 Раздать карты
        </button>
    `);

    gmButton.on('click', () => {
        gmCardDistributor.showDistributionDialog();
    });

    gmButton.on('mouseenter', function() {
        $(this).css({
            'background': 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
            'transform': 'translateY(-1px)',
            'box-shadow': '0 2px 5px rgba(0,0,0,0.3)'
        });
    });

    gmButton.on('mouseleave', function() {
        $(this).css({
            'background': 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            'transform': 'translateY(0)',
            'box-shadow': 'none'
        });
    });

    html.find('.directory-header').append(gmButton);
});

export { GMCardDistributor, gmCardDistributor };
