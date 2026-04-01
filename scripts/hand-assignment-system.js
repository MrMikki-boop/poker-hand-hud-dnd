/* ===== POKER HAND HUD - HAND ASSIGNMENT SYSTEM ===== */
/**
 * @fileoverview Hand assignment system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, userStateManager, pokerHandGlobalState } from './constants.js';
import { Utils } from './utils.js';
import { gmCardDistributor } from './gm-card-distributor.js';
import { StateManager } from './state-manager.js';

const HandAssignmentSystem = {
    /**
     * Инициализирует систему привязки рук
     */
    init() {
        console.log(`[${MODULE_ID}] Initializing hand assignment system`);
        
        // Проверяем доступность jQuery
        if (typeof $ === 'undefined') {
            console.error(`[${MODULE_ID}] jQuery not available, hand assignment system disabled`);
            return;
        }
        
        console.log(`[${MODULE_ID}] Hand assignment system initialized`);
        
        // Регистрируем настройки
        this.registerSettings();
        
        console.log(`[${MODULE_ID}] Hand assignment system setup complete`);
    },
    
    // Метод для переключения HUD как кнопка закладки
    toggleHUDLikeBookmark(container) {
        // Воспроизводим звук
        if (typeof SFX !== 'undefined') {
            SFX.play(SFX.sounds.click);
        }
        
        if (container) {
            const isCollapsed = container.style.display === "none" || container.style.bottom === "-9999px";
            
            // Сохраняем состояние в localStorage
            StateManager.setGlobalCollapsed(!isCollapsed);
            
            if (isCollapsed) {
                // Opening - show container and animate entrance
                container.classList.remove("collapsed");
                container.style.display = "flex";
                container.style.bottom = "20px";
                container.style.pointerEvents = "auto";
                
                // Reset expanded card state when opening HUD
                if (typeof ExpandedCardManager !== 'undefined') {
                    ExpandedCardManager.reset();
                }
                
                // Force reset all card styles to normal state
                const cards = container.querySelectorAll(".poker-card");
                cards.forEach(card => {
                    // Remove expanded class and inline styles
                    card.classList.remove("expanded", "face-down");
                    
                    // Reset inline styles that might be set by expansion
                    card.style.width = "";
                    card.style.height = "";
                    card.style.transform = "";
                    card.style.filter = "";
                    
                    // Reset data attributes that might have been modified
                    delete card.dataset.originalWidth;
                    delete card.dataset.originalHeight;
                });
                
                // Trigger entrance animation when opening
                if (pokerHandGlobalState.hand && pokerHandGlobalState.config && cards.length > 0) {
                    // Re-arrange cards first
                    if (window.PokerHandHUD && window.PokerHandHUD.arrangeCardsInFan) {
                        window.PokerHandHUD.arrangeCardsInFan(Array.from(cards), pokerHandGlobalState.config);
                    }
                    // Then animate entrance
                    if (window.PokerHandHUD && window.PokerHandHUD.animateEntrance) {
                        window.PokerHandHUD.animateEntrance(Array.from(cards), pokerHandGlobalState.config);
                    }
                }
            } else {
                // Closing - animate exit then hide
                if (window.PokerHandHUD && window.PokerHandHUD.animateExit) {
                    window.PokerHandHUD.animateExit(Array.from(container.querySelectorAll(".poker-card")), () => {
                        container.classList.add("collapsed");
                        container.style.display = "none";
                        container.style.bottom = '-9999px';
                        container.style.pointerEvents = 'none';
                        
                        // Reset expanded card state when closing HUD
                        if (typeof ExpandedCardManager !== 'undefined') {
                            ExpandedCardManager.reset();
                        }
                    });
                } else {
                    // Fallback - просто скрываем
                    container.classList.add("collapsed");
                    container.style.display = "none";
                    container.style.bottom = '-9999px';
                    container.style.pointerEvents = 'none';
                    if (typeof ExpandedCardManager !== 'undefined') {
                        ExpandedCardManager.reset();
                    }
                }
            }
        }
    },
    
    /**
     * Открывает окно управления назначениями рук
     */
    openHandAssignmentWindow() {
        if (!game.user.isGM) {
            ui.notifications.warn("Only GMs can manage hand assignments");
            return;
        }
        console.log(`[${MODULE_ID}] Opening hand assignment window...`);
        
        // Создаем окно
        new Dialog({
            title: 'Hand Assignment Management',
            content: this.generateHandAssignmentContent(),
            buttons: {
                save: {
                    icon: '<i class="fas fa-save"></i>',
                    label: 'Save Assignments',
                    callback: async () => await this.saveHandAssignments()
                },
                close: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Close'
                }
            },
            default: 'save',
            render: (html) => {
                this.setupHandAssignmentInteractivity(html);
            }
        }).render(true);
    },
    
    /**
     * Генерирует контент для окна управления
     */
    generateHandAssignmentContent() {
        const users = game.users;
        
        let content = `
            <div class="phh-hand-assignment">
                <p style="margin-bottom: 15px;">
                    <strong>Select a hand for each user:</strong><br>
                    Only manually assigned hands will be used. Users without assignments will not have access to any hand.<br>
                    <em>Note: Only hands owned by each user are shown in their dropdown.</em>
                </p>
                <div class="phh-user-list">
        `;
        
        users.forEach(user => {
            const currentHand = this.getUserAssignedHand(user.id);
            // Получаем руки доступные конкретному пользователю
            const hands = this.getAvailableHands(user.id);
            
            content += `
                <div class="phh-user-row" style="
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                ">
                    <div style="flex: 1; font-weight: bold;">${user.name}</div>
                    <div style="flex: 2;">
                        <select class="phh-hand-select" data-user-id="${user.id}" style="
                            width: 100%;
                            padding: 5px;
                            border: 1px solid #ccc;
                            border-radius: 3px;
                        ">
                            <option value="">No hand assigned</option>
            `;
            
            hands.forEach(hand => {
                const selected = currentHand === hand ? 'selected' : '';
                content += `<option value="${hand}" ${selected}>${hand}</option>`;
            });
            
            content += `
                        </select>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <button class="phh-clear-btn" data-user-id="${user.id}" style="
                            padding: 5px 10px;
                            background: #dc2626;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">Clear</button>
                    </div>
                </div>
            `;
        });
        
        content += `
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
                    <strong>Current Assignments:</strong><br>
                    <div id="phh-current-assignments"></div>
                </div>
            </div>
        `;
        
        return content;
    },
    
    /**
     * Настраивает интерактивность в окне управления
     */
    setupHandAssignmentInteractivity(html) {
        // Обновляем текущие назначения
        this.updateCurrentAssignmentsDisplay(html);
        
        // Обработчики для кнопок Clear
        html.find('.phh-clear-btn').on('click', (e) => {
            const userId = $(e.currentTarget).data('userId');
            html.find(`.phh-hand-select[data-user-id="${userId}"]`).val('');
        });
        
        // Обработчики для изменения выбора
        html.find('.phh-hand-select').on('change', () => {
            this.updateCurrentAssignmentsDisplay(html);
        });
    },
    
    /**
     * Обновляет отображение текущих назначений
     */
    updateCurrentAssignmentsDisplay(html) {
        const assignmentsDiv = html.find('#phh-current-assignments');
        let assignments = '';
        
        game.users.forEach(user => {
            const hand = this.getUserAssignedHand(user.id);
            if (hand) {
                assignments += `<div>${user.name} → ${hand}</div>`;
            }
        });
        
        if (!assignments) {
            assignments = '<div style="color: #666;">No manual assignments</div>';
        }
        
        assignmentsDiv.html(assignments);
    },
    
    /**
     * Сохраняет назначения рук
     */
    async saveHandAssignments() {
        console.log(`[${MODULE_ID}] Saving hand assignments...`);
        
        const assignments = {};
        
        $('.phh-hand-select').each((index, element) => {
            const userId = $(element).data('userId');
            const hand = $(element).val();
            
            if (hand) {
                assignments[userId] = hand;
            }
        });
        
        // Сохраняем в настройки игры
        await game.settings.set(MODULE_ID, 'handAssignments', assignments);
        
        console.log(`[${MODULE_ID}] Hand assignments saved:`, assignments);
        
        ui.notifications.info('Hand assignments saved successfully!');
        
        // Обновляем HUD для всех пользователей, чтобы применить новые назначения
        await this.refreshAllUsersHUD();
    },
    
    /**
     * Обновляет HUD для всех пользователей
     */
    async refreshAllUsersHUD() {
        console.log(`[${MODULE_ID}] Refreshing HUD for all users...`);
        
        // Получаем все назначения напрямую из настроек
        const assignments = game.settings.get(MODULE_ID, 'handAssignments') || {};
        console.log(`[${MODULE_ID}] Current assignments:`, assignments);
        
        // Отправляем событие всем клиентам через query механизм
        const activeUsers = game.users.filter(u => u.active);
        console.log(`[${MODULE_ID}] Active users:`, activeUsers.map(u => u.name));
        
        for (const user of activeUsers) {
            if (user.id !== game.user.id) { // Не отправляем себе
                try {
                    const result = await user.query(`${MODULE_ID}.refreshHand`, {
                        source: 'handAssignment',
                        userId: game.user.id,
                        timestamp: Date.now(),
                        assignments: assignments
                    }, { timeout: 5000 });
                    
                    console.log(`[${MODULE_ID}] Refresh result for ${user.name}:`, result);
                } catch (error) {
                    console.error(`[${MODULE_ID}] Failed to send refresh to ${user.name}:`, error);
                }
            }
        }
        
        console.log(`[${MODULE_ID}] Sent refresh requests to all active users`);
        
        // Также обновляем текущего пользователя немедленно
        const currentUserAssignment = assignments[game.user.id];
        if (currentUserAssignment) {
            console.log(`[${MODULE_ID}] Updating current user assignment: ${currentUserAssignment}`);
            
            // Находим объект руки
            const hand = game.cards.get(currentUserAssignment);
            if (hand) {
                // Обновляем pokerHandGlobalState
                pokerHandGlobalState.hand = hand;
                userStateManager.updateCurrentUserHand(hand);
                console.log(`[${MODULE_ID}] Updated pokerHandGlobalState.hand: ${hand.name}`);
                
                // Обновляем HUD если он существует
                if (window.PokerHandHUD) {
                    const config = Utils.loadUserConfig();
                    window.PokerHandHUD.initializeHUD(hand, config);
                }
            }
        }
        
        // Также обновляем локально для текущего пользователя
        this.refreshLocalHUD();
    },
    
    /**
     * Обновляет локальный HUD
     */
    refreshLocalHUD() {
        console.log(`[${MODULE_ID}] Refreshing local HUD...`);
        
        // Ищем PokerHandHUD и обновляем его
        if (window.PokerHandHUD && window.PokerHandHUD.refreshHand) {
            window.PokerHandHUD.refreshHand();
        }
        
        // Также можно отправить кастомное событие
        window.dispatchEvent(new CustomEvent('pokerHandAssignmentChanged', {
            detail: {
                userId: game.user.id,
                newHand: this.getUserHand(game.user.id)
            }
        }));
    },
    
    /**
     * Настраивает контекстное меню для рук
     */
    setupHandContextMenu() {
        console.log(`[${MODULE_ID}] Setting up hand context menu...`);
        
        // Тестируем работает ли вообще система хуков
        Hooks.on('testHookSystem', () => {
            console.log(`[${MODULE_ID}] 🔥 Test hook system is working!`);
        });
        
        // Проверяем через 1 секунду
        setTimeout(() => {
            console.log(`[${MODULE_ID}] Testing hook system...`);
            Hooks.call('testHookSystem');
            
            // Правильный способ получить хуки в V13
            const allHooks = Hooks.events;
            console.log(`[${MODULE_ID}] Hooks.events:`, allHooks);
            
            // Пробуем разные способы получить ключи из getter'а
            let hookNames = [];
            
            // Способ 1: Object.getOwnPropertyNames на результате getter'а
            try {
                hookNames = Object.getOwnPropertyNames(allHooks);
                console.log(`[${MODULE_ID}] Hook names via getOwnPropertyNames:`, hookNames);
            } catch (e) {
                console.log(`[${MODULE_ID}] getOwnPropertyNames failed:`, e);
            }
            
            // Способ 2: Object.keys на результате getter'а
            if (hookNames.length === 0) {
                try {
                    hookNames = Object.keys(allHooks);
                    console.log(`[${MODULE_ID}] Hook names via Object.keys:`, hookNames);
                } catch (e) {
                    console.log(`[${MODULE_ID}] Object.keys failed:`, e);
                }
            }
            
            // Способ 3: Прямая итерация
            if (hookNames.length === 0) {
                hookNames = [];
                for (const hookName in allHooks) {
                    hookNames.push(hookName);
                }
                console.log(`[${MODULE_ID}] Hook names via for...in:`, hookNames);
            }
            
            // Способ 4: Reflect.ownKeys
            if (hookNames.length === 0) {
                try {
                    hookNames = Reflect.ownKeys(allHooks);
                    console.log(`[${MODULE_ID}] Hook names via Reflect.ownKeys:`, hookNames);
                } catch (e) {
                    console.log(`[${MODULE_ID}] Reflect.ownKeys failed:`, e);
                }
            }
            
            const cardHooks = hookNames.filter(h => 
                h.toLowerCase().includes('card') || 
                h.toLowerCase().includes('context')
            );
            console.log(`[${MODULE_ID}] Card/Context hooks:`, cardHooks);
            
            // Проверим, есть ли хук для карт
            const cardContextHook = hookNames.find(h => h.toLowerCase().includes('card') && h.toLowerCase().includes('context'));
            if (cardContextHook) {
                console.log(`[${MODULE_ID}] Found card context hook: ${cardContextHook}`);
            } else {
                console.log(`[${MODULE_ID}] No card context hook found! Available card hooks:`, hookNames.filter(h => h.toLowerCase().includes('card')));
            }
            
            // Проверяем все хуки с 'context'
            const contextHooks = hookNames.filter(h => h.toLowerCase().includes('context'));
            console.log(`[${MODULE_ID}] All context hooks:`, contextHooks);
            
            // Проверяем все хуки вообще
            console.log(`[${MODULE_ID}] Total hooks found:`, hookNames.length);
            
            // Если есть контекстные хуки, пробуем найти правильный
            if (contextHooks.length > 0) {
                console.log(`[${MODULE_ID}] Context system is working! Available context hooks:`, contextHooks);
            } else {
                console.log(`[${MODULE_ID}] No context hooks found - checking all hooks...`);
                console.log(`[${MODULE_ID}] All available hooks:`, hookNames);
            }
        }, 1000);
        
        // Правильный хук для V13 - для карт согласно документации
        Hooks.on('getCardsContextOptions', (application, menuItems) => {
            console.log(`[${MODULE_ID}] 🔥 getCardsContextOptions FIRED!`);
            console.log(`[${MODULE_ID}] Application:`, application?.constructor?.name);
            console.log(`[${MODULE_ID}] MenuItems before:`, menuItems?.length || 0);
            console.log(`[${MODULE_ID}] MenuItems:`, menuItems);
            
            // Добавляем пункты меню для всех карт
            menuItems.push(
                this.createViewAssignmentMenuItem(),
                this.createAssignHandMenuItem()
            );
            
            console.log(`[${MODULE_ID}] MenuItems after:`, menuItems?.length || 0);
            console.log(`[${MODULE_ID}] ✅ Card menu items added!`);
        });
        
        // Для компендиумов с картами
        Hooks.on('getCompendiumContextOptions', (application, menuItems) => {
            console.log(`[${MODULE_ID}] 🔥 getCompendiumContextOptions FIRED!`);
            console.log(`[${MODULE_ID}] Application:`, application?.constructor?.name);
            console.log(`[${MODULE_ID}] DocumentName:`, application?.documentName);
            console.log(`[${MODULE_ID}] MenuItems before:`, menuItems?.length || 0);
            console.log(`[${MODULE_ID}] MenuItems:`, menuItems);
            
            // Добавляем пункты меню только для карт в компендиумах
            if (application.documentName === 'Card') {
                menuItems.push(
                    this.createViewAssignmentMenuItem(),
                    this.createAssignHandMenuItem()
                );
                console.log(`[${MODULE_ID}] MenuItems after:`, menuItems?.length || 0);
                console.log(`[${MODULE_ID}] ✅ Compendium card menu items added!`);
            }
        });
        
        // Пробуем другие возможные хуки для карт
        const alternativeHooks = [
            'getCardContextOptions',
            'getCardDirectoryEntryContext',
            'getCardsDirectoryEntryContext'
        ];
        
        alternativeHooks.forEach(hookName => {
            Hooks.on(hookName, (application, menuItems) => {
                console.log(`[${MODULE_ID}] 🔥 ${hookName} FIRED!`);
                console.log(`[${MODULE_ID}] Application:`, application?.constructor?.name);
                console.log(`[${MODULE_ID}] MenuItems before:`, menuItems?.length || 0);
                console.log(`[${MODULE_ID}] MenuItems:`, menuItems);
                
                // Добавляем тестовый пункт
                menuItems.push({
                    name: `phh-test-${hookName}`,
                    icon: '<i class="fas fa-test"></i>',
                    condition: (li) => {
                        console.log(`[${MODULE_ID}] Test ${hookName} condition called for:`, li);
                        return true;
                    },
                    callback: () => {
                        console.log(`[${MODULE_ID}] Test ${hookName} menu clicked!`);
                    }
                });
                
                console.log(`[${MODULE_ID}] MenuItems after:`, menuItems?.length || 0);
                console.log(`[${MODULE_ID}] ✅ Test ${hookName} menu item added!`);
            });
            
            console.log(`[${MODULE_ID}] Registered alternative hook: ${hookName}`);
        });
        
        // Тестируем универсальные хуки чтобы проверить работает ли механизм
        Hooks.on('getActorContextOptions', (application, menuItems) => {
            console.log(`[${MODULE_ID}] 🔥 getActorContextOptions FIRED!`);
            console.log(`[${MODULE_ID}] Application:`, application?.constructor?.name);
            console.log(`[${MODULE_ID}] MenuItems before:`, menuItems?.length || 0);
            console.log(`[${MODULE_ID}] MenuItems:`, menuItems);
            
            // Добавляем тестовый пункт чтобы проверить работает ли механизм
            const testItem = {
                name: 'phh-test-actor',
                icon: '<i class="fas fa-test"></i>',
                condition: (li) => {
                    console.log(`[${MODULE_ID}] Test actor condition called for:`, li);
                    return true;
                },
                callback: () => {
                    console.log(`[${MODULE_ID}] Test actor menu clicked!`);
                }
            };
            
            menuItems.push(testItem);
            console.log(`[${MODULE_ID}] MenuItems after:`, menuItems?.length || 0);
            console.log(`[${MODULE_ID}] ✅ Test actor menu item added!`, testItem);
        });
        
        // Также пробуем другие возможные хуки для контекстных меню
        Hooks.on('getDirectoryEntryContext', (html, entryOptions) => {
            console.log(`[${MODULE_ID}] 🔥 getDirectoryEntryContext FIRED!`);
            console.log(`[${MODULE_ID}] HTML:`, html);
            console.log(`[${MODULE_ID}] EntryOptions before:`, entryOptions?.length || 0);
            console.log(`[${MODULE_ID}] EntryOptions:`, entryOptions);
            
            const testItem = {
                name: 'phh-test-directory',
                icon: '<i class="fas fa-test"></i>',
                condition: (li) => {
                    console.log(`[${MODULE_ID}] Test directory condition called for:`, li);
                    return true;
                },
                callback: () => {
                    console.log(`[${MODULE_ID}] Test directory menu clicked!`);
                }
            };
            
            entryOptions.push(testItem);
            console.log(`[${MODULE_ID}] EntryOptions after:`, entryOptions?.length || 0);
            console.log(`[${MODULE_ID}] ✅ Test directory menu item added!`, testItem);
        });
        
        console.log(`[${MODULE_ID}] Registered test hooks`);
        
        console.log(`[${MODULE_ID}] Hand context menu setup complete`);
    },
    
    /**
     * Проверяет доступные хуки
     */
    checkAvailableHooks() {
        const allHooks = Object.keys(Hooks.events);
        console.log(`[${MODULE_ID}] Available hooks:`, allHooks);
        
        const cardHooks = allHooks.filter(h => 
            h.toLowerCase().includes('card') || 
            h.toLowerCase().includes('context')
        );
        console.log(`[${MODULE_ID}] Card/Context hooks:`, cardHooks);
        
        // Проверим, есть ли хук для карт
        const cardContextHook = allHooks.find(h => h.toLowerCase().includes('card') && h.toLowerCase().includes('context'));
        if (cardContextHook) {
            console.log(`[${MODULE_ID}] Found card context hook: ${cardContextHook}`);
        } else {
            console.log(`[${MODULE_ID}] No card context hook found! Available card hooks:`, allHooks.filter(h => h.toLowerCase().includes('card')));
        }
        
        // Проверяем все хуки с 'context'
        const contextHooks = allHooks.filter(h => h.toLowerCase().includes('context'));
        console.log(`[${MODULE_ID}] All context hooks:`, contextHooks);
    },
    
    /**
     * Создает пункт меню "View Assignment"
     * @returns {Object} Пункт контекстного меню
     */
    createViewAssignmentMenuItem() {
        return {
            name: 'phh-view-assignment',
            icon: '<i class="fas fa-info-circle"></i>',
            condition: (li) => {
                // Для директории карт - используем entryId для V13
                let cardId = li.dataset.entryId || li.dataset.documentId;
                let card = game.cards.get(cardId);
                
                // Для компендиумов
                if (!card && li.dataset.pack && li.dataset.id) {
                    const pack = game.packs.get(li.dataset.pack);
                    if (pack) {
                        const entry = pack.index.get(li.dataset.id);
                        if (entry && entry.type === 'Card') {
                            return true; // Показываем для всех карт в компендиумах
                        }
                    }
                }
                
                return card && card.type === 'hand'; // Показываем только для рук
            },
            callback: async (li) => {
                // Для директории карт - используем entryId для V13
                let cardId = li.dataset.entryId || li.dataset.documentId;
                let card = game.cards.get(cardId);
                
                // Для компендиумов
                if (!card && li.dataset.pack && li.dataset.id) {
                    const pack = game.packs.get(li.dataset.pack);
                    if (pack) {
                        card = await pack.getDocument(li.dataset.id);
                    }
                }
                
                if (card) {
                    console.log(`[${MODULE_ID}] View Assignment clicked for: ${card.name}`);
                    this.viewAssignment(card);
                }
            }
        };
    },
    
    /**
     * Создает пункт меню "Assign Hand to User"
     * @returns {Object} Пункт контекстного меню
     */
    createAssignHandMenuItem() {
        return {
            name: 'phh-assign-hand',
            icon: '<i class="fas fa-user-tag"></i>',
            condition: (li) => {
                if (!game.user?.isGM) return false; // Только для ГМ
                
                // Для директории карт - используем entryId для V13
                let cardId = li.dataset.entryId || li.dataset.documentId;
                let card = game.cards.get(cardId);
                
                // Для компендиумов
                if (!card && li.dataset.pack && li.dataset.id) {
                    const pack = game.packs.get(li.dataset.pack);
                    if (pack) {
                        const entry = pack.index.get(li.dataset.id);
                        if (entry && entry.type === 'Card') {
                            return true; // Показываем для всех карт в компендиумах
                        }
                    }
                }
                
                return card && card.type === 'hand'; // Показываем только для рук
            },
            callback: async (li) => {
                // Для директории карт - используем entryId для V13
                let cardId = li.dataset.entryId || li.dataset.documentId;
                let card = game.cards.get(cardId);
                
                // Для компендиумов
                if (!card && li.dataset.pack && li.dataset.id) {
                    const pack = game.packs.get(li.dataset.pack);
                    if (pack) {
                        card = await pack.getDocument(li.dataset.id);
                    }
                }
                
                if (card) {
                    console.log(`[${MODULE_ID}] Assign Hand clicked for: ${card.name}`);
                    this.showAssignmentDialog(card);
                }
            }
        };
    },
    
    /**
     * Показывает диалог привязки руки к пользователю
     * @param {CardsDocument} hand - Рука для привязки
     */
    async showAssignmentDialog(hand) {
        const currentAssignment = await this.getHandAssignment(hand.id);
        const users = game.users.filter(u => u.active);
        
        const dialogContent = `
            <div class="phh-assignment-dialog">
                <h3>Assign Hand: ${hand.name}</h3>
                <p>Select a user to assign this hand to. Only one hand can be assigned per user.</p>
                
                <div class="current-assignment" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;">
                    <strong>Current Assignment:</strong> 
                    <span id="current-assignment">${currentAssignment ? currentAssignment.name : 'None'}</span>
                </div>
                
                <div class="user-selection">
                    <label for="user-select">Assign to user:</label>
                    <select id="user-select" style="width: 100%; margin: 5px 0;">
                        <option value="">None (unassign)</option>
                        ${users.map(user => `
                            <option value="${user.id}" ${currentAssignment?.id === user.id ? 'selected' : ''}>
                                ${user.name} ${user.isGM ? '(GM)' : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="warning" style="margin-top: 10px; padding: 8px; background: rgba(255,193,7,0.2); border-left: 3px solid #ffc107; border-radius: 2px;">
                    <small><strong>Note:</strong> If this user already has an assigned hand, it will be unassigned first.</small>
                </div>
            </div>
        `;
        
        new Dialog({
            title: 'Hand Assignment',
            content: dialogContent,
            buttons: {
                assign: {
                    icon: '<i class="fas fa-user-tag"></i>',
                    label: 'Assign Hand',
                    callback: async (html) => {
                        const selectElement = html.find('#user-select')[0];
                        const selectedUserId = selectElement.value;
                        
                        if (selectedUserId) {
                            await this.assignHandToUser(hand.id, selectedUserId);
                            ui.notifications.info(`Hand "${hand.name}" assigned to ${game.users.get(selectedUserId).name}`);
                        } else {
                            await this.unassignHand(hand.id);
                            ui.notifications.info(`Hand "${hand.name}" unassigned`);
                        }
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel'
                }
            },
            default: 'assign'
        }).render(true);
    },
    
    /**
     * Показывает информацию о текущей привязке
     * @param {CardsDocument} hand - Рука для просмотра
     */
    async viewAssignment(hand) {
        const assignment = await this.getHandAssignment(hand.id);
        
        const content = `
            <div class="phh-assignment-info">
                <h3>Hand Assignment Info</h3>
                <p><strong>Hand:</strong> ${hand.name}</p>
                <p><strong>Hand ID:</strong> ${hand.id}</p>
                <p><strong>Assigned to:</strong> ${assignment ? assignment.name : 'None'}</p>
                ${assignment ? `<p><strong>User ID:</strong> ${assignment.id}</p>` : ''}
            </div>
        `;
        
        new Dialog({
            title: 'Hand Assignment',
            content: content,
            buttons: {
                close: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Close'
                }
            }
        }).render(true);
    },
    
    /**
     * Привязывает руку к пользователю
     * @param {string} handId - ID руки
     * @param {string} userId - ID пользователя
     */
    async assignHandToUser(handId, userId) {
        // Сначала убираем существующую привязку этого пользователя
        await this.unassignUserHands(userId);
        
        // Убираем существующую привязку этой руки
        await this.unassignHand(handId);
        
        // Создаём новую привязку
        try {
            await game.settings.set(MODULE_ID, `hand_assignment_${handId}`, userId);
            await game.settings.set(MODULE_ID, `user_hand_${userId}`, handId);
            console.log(`[${MODULE_ID}] Hand ${handId} assigned to user ${userId}`);
        } catch (e) {
            console.error(`[${MODULE_ID}] Failed to assign hand ${handId} to user ${userId}:`, e);
            throw e;
        }
    },
    
    /**
     * Убирает привязку руки
     * @param {string} handId - ID руки
     */
    async unassignHand(handId) {
        try {
            const userId = await game.settings.get(MODULE_ID, `hand_assignment_${handId}`);
            if (userId) {
                await game.settings.set(MODULE_ID, `hand_assignment_${handId}`, null);
                await game.settings.set(MODULE_ID, `user_hand_${userId}`, null);
                console.log(`[${MODULE_ID}] Hand ${handId} unassigned from user ${userId}`);
            }
        } catch (e) {
            console.log(`[${MODULE_ID}] Failed to unassign hand ${handId}: ${e.message}`);
        }
    },
    
    /**
     * Убирает все привязки пользователя
     * @param {string} userId - ID пользователя
     */
    async unassignUserHands(userId) {
        try {
            const handId = await game.settings.get(MODULE_ID, `user_hand_${userId}`);
            if (handId) {
                await game.settings.set(MODULE_ID, `user_hand_${userId}`, null);
                await game.settings.set(MODULE_ID, `hand_assignment_${handId}`, null);
                console.log(`[${MODULE_ID}] User ${userId} unassigned from hand ${handId}`);
            }
        } catch (e) {
            console.log(`[${MODULE_ID}] Failed to unassign user ${userId}: ${e.message}`);
        }
    },
    
    /**
     * Получает привязку руки
     * @param {string} handId - ID руки
     * @returns {Object|null} Информация о пользователе
     */
    async getHandAssignment(handId) {
        try {
            const userId = await game.settings.get(MODULE_ID, `hand_assignment_${handId}`);
            if (userId) {
                const user = game.users.get(userId);
                return user ? { id: user.id, name: user.name, active: user.active } : null;
            }
        } catch (e) {
            console.log(`[${MODULE_ID}] Failed to get assignment for hand ${handId}: ${e.message}`);
        }
        return null;
    },
    
    /**
     * Получает привязанную руку пользователя
     * @param {string} userId - ID пользователя
     * @returns {string|null} ID руки
     */
    async getUserHandAssignment(userId) {
        try {
            return await game.settings.get(MODULE_ID, `user_hand_${userId}`);
        } catch (e) {
            console.log(`[${MODULE_ID}] Setting not found for user ${userId}: ${e.message}`);
            return null;
        }
    },
    
    /**
     * Получает руку для текущего пользователя с учётом привязок
     * @returns {CardsDocument|null} Рука пользователя
     */
    async getAssignedHandForCurrentUser() {
        const userId = game.user.id;
        const assignedHandId = await this.getUserHandAssignment(userId);
        
        if (assignedHandId) {
            const hand = game.cards.get(assignedHandId);
            if (hand && hand.type === 'hand' && hand.isOwner) {
                console.log(`[${MODULE_ID}] Found assigned hand for user ${userId}: ${hand.name}`);
                return hand;
            }
        }
        
        return null;
    },
    
    /**
     * Получает все привязки
     * @returns {Array} Массив привязок
     */
    async getAllAssignments() {
        const assignments = [];
        
        // Проходим по всем настройкам привязок
        for (const [key, value] of Object.entries(game.settings.settings.get(MODULE_ID) || {})) {
            if (key.startsWith('hand_assignment_') && value) {
                const handId = key.replace('hand_assignment_', '');
                const user = game.users.get(value);
                if (user) {
                    assignments.push({
                        handId,
                        userId: value,
                        userName: user.name,
                        userActive: user.active
                    });
                }
            }
        }
        
        return assignments;
    },
    
    /**
     * Получает доступные руки для конкретного пользователя
     * @param {string} userId - ID пользователя
     * @returns {Array} Массив названий доступных рук
     */
    getAvailableHands(userId) {
        // Получаем пользователя
        const user = game.users.get(userId);
        if (!user) {
            console.warn(`[${MODULE_ID}] User ${userId} not found`);
            return [];
        }
        
        // Получаем все карты типа 'hand', которыми владеет пользователь
        const handCards = game.cards.filter(card => 
            card.type === 'hand' && 
            card.testUserPermission(user, 'LIMITED')
        );
        
        console.log(`[${MODULE_ID}] Available hands for ${user.name}:`, handCards.map(c => c.name));
        
        return handCards.map(card => card.name);
    },
    
    /**
     * Получает назначенную руку для пользователя
     */
    getUserAssignedHand(userId) {
        const assignments = game.settings.get(MODULE_ID, 'handAssignments') || {};
        return assignments[userId] || '';
    },
    
    /**
     * Получает руку для пользователя (только ручные назначения)
     */
    getUserHand(userId) {
        // Только ручные назначения
        const assignedHand = this.getUserAssignedHand(userId);
        return assignedHand || '';
    },
    
    /**
     * Регистрирует настройки модуля
     */
    registerSettings() {
        game.settings.register(MODULE_ID, 'handAssignments', {
            name: 'Hand Assignments',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });
    },
};

// Регистрируем шорткат в хуке init
Hooks.once('init', () => {
    console.log(`[${MODULE_ID}] Registering keybindings in init hook...`);
    
    // Регистрируем шорткат
    game.keybindings.register(MODULE_ID, 'openHandAssignment', {
        name: 'PHH: Open Hand Assignment Window',
        hint: 'Opens the hand assignment management window',
        editable: [
            {
                key: 'KeyH',
                modifiers: ['Control']
            }
        ],
        onDown: () => {
            if (!game.user.isGM) {
                ui.notifications.warn("Only GMs can manage hand assignments");
                return;
            }
            HandAssignmentSystem.openHandAssignmentWindow();
        },
        onUp: () => {},
        repeat: false
    });
    
    // Регистрируем шорткат для раздачи карт
    game.keybindings.register(MODULE_ID, 'openCardDistribution', {
        name: 'PHH: Open Card Distribution Window',
        hint: 'Opens the card distribution window for dealing cards to players',
        editable: [
            {
                key: 'KeyD',
                modifiers: ['Control']
            }
        ],
        onDown: () => {
            // Проверяем что пользователь ГМ
            if (!game.user.isGM) {
                ui.notifications.warn("Only GMs can distribute cards");
                return;
            }
            
            // Открываем окно раздачи карт
            gmCardDistributor.showDistributionDialog();
        },
        onUp: () => {},
        repeat: false
    });
    
    // Добавляем кнопку в интерфейс
    Hooks.on('renderPlayerList', (app, html, data) => {
        if (!game.user.isGM) return;
        const button = $(`
            <button class="phh-hand-assignment-btn" style="
                margin: 5px;
                padding: 5px 10px;
                background: #7c3aed;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">
                <i class="fas fa-hand-paper"></i> Assign Hands
            </button>
        `);
        
        button.on('click', () => {
            HandAssignmentSystem.openHandAssignmentWindow();
        });
        
        html.find('#players').append(button);
    });
    
    // Регистрируем шорткат для переключения HUD
    game.keybindings.register(MODULE_ID, 'toggleHUD', {
        name: 'PHH: Toggle Hand HUD',
        hint: 'Toggles the hand HUD visibility (show/hide)',
        editable: [
            {
                key: 'KeyT',
                modifiers: ['Control']
            }
        ],
        onDown: () => {
            console.log(`[${MODULE_ID}] Toggle HUD hotkey triggered!`);
            
            // Используем тот же механизм что и кнопка закладки
            const container = document.getElementById("poker-hand-container");
            if (!container) {
                console.log(`[${MODULE_ID}] HUD not found, attempting to create...`);
                
                // Проверяем есть ли у пользователя назначенная рука
                const userAssignment = HandAssignmentSystem.getUserAssignedHand(game.user.id);
                if (userAssignment) {
                    console.log(`[${MODULE_ID}] Found assigned hand: ${userAssignment}`);
                    
                    // Находим объект руки
                    const hand = game.cards.get(userAssignment);
                    if (hand) {
                        console.log(`[${MODULE_ID}] Found hand object, creating HUD...`);
                        // Создаем HUD
                        if (window.PokerHandHUD) {
                            const config = Utils.loadUserConfig();
                            window.PokerHandHUD.initializeHUD(hand, config);
                            
                            // Ждем создания HUD и переключаем состояние
                            setTimeout(() => {
                                const newContainer = document.getElementById("poker-hand-container");
                                if (newContainer) {
                                    HandAssignmentSystem.toggleHUDLikeBookmark(newContainer);
                                }
                            }, 100);
                        }
                    } else {
                        console.warn(`[${MODULE_ID}] Hand object not found for assignment: ${userAssignment}`);
                    }
                } else {
                    console.warn(`[${MODULE_ID}] No hand assigned to user ${game.user.name}`);
                    ui.notifications.warn("No hand assigned. Use Hand Assignment window first.");
                    return;
                }
            } else {
                // HUD существует - переключаем как кнопка закладки
                HandAssignmentSystem.toggleHUDLikeBookmark(container);
            }
        },
        onUp: () => {},
        repeat: false
    });
    
    console.log(`[${MODULE_ID}] Keybindings registered successfully`);
});

export { HandAssignmentSystem };
