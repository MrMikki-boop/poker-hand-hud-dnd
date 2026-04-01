/* ===== POKER HAND HUD - MAIN APPLICATION ===== */
/**
 * @fileoverview Main Poker Hand HUD application
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID, pokerHandGlobalState, userStateManager, ExpandedCardManager } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { CardSystem } from './card-system.js';
import { ConfigSystem } from './config-system.js';
import { HandAssignmentSystem } from './hand-assignment-system.js';
import { StateManager } from './state-manager.js';
import { SparklesSystem } from './sparkles-system.js';
import { UIManager } from './ui-manager.js';
import { attachHoverEvents, expandCard, collapseCard } from './card-interactions.js';

/**
 * Основной класс Poker Hand HUD
 * @namespace PokerHandHUD
 * @description Управляет отображением карт в виде покерной руки с интерактивными эффектами
 */
const PokerHandHUD = {
    /**
     * Инициализирует HUD
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Если не удалось выбрать руку карт или инициализировать компоненты
     */
    async init() {
        try {
            // Проверяем есть ли у пользователя назначенная рука
            const userAssignment = HandAssignmentSystem.getUserAssignedHand(game.user.id);
            
            if (!userAssignment) {
                // Не инициализируем HUD если нет назначения
                return;
            }
            
            // Reset expanded card state
            ExpandedCardManager.reset();
            
            // Initialize UI settings
            UIManager.setupSettingsIntegration();
            
            // Select card hand
            const hand = await CardSystem.selectCardHand();
            if (!hand) {
                const error = new Error("Не удалось выбрать руку карт - нет доступных рук");
                console.error(`[${MODULE_ID}] Initialization failed:`, error);
                ui.notifications.error("Пожалуйста, убедитесь что у вас есть доступ к руке карт.");
                throw error;
            }
            
            console.log(`[${MODULE_ID}] Selected hand: ${hand.name} (${hand.id})`);
            
            // Store in user-specific state instead of global state
            userStateManager.updateCurrentUserHand(hand);
            pokerHandGlobalState.hand = hand; // Keep for backward compatibility

            // Create and load configuration
            let config = ConfigSystem.createDefaultConfig();
            config = ConfigSystem.loadSettings(config);
            
            // Store in user-specific state
            userStateManager.updateCurrentUserConfig(config);
            pokerHandGlobalState.config = config; // Keep for backward compatibility
            
            // Load sound effects
            SFX.load();
            
            // Build HTML
            this.buildHTML(config);

            // Apply initial collapse state first
            StateManager.applyGlobalCollapse();

            // Setup bookmark toggle after global state is applied
            this.setupBookmarkToggle();

            // Render cards
            await this.renderCards(hand, config);

            // Inject CSS
            this.injectCSS(config);
            
            // Setup cleanup function
            this.setupCleanup();
            
            // Setup real-time card updates
            CardSystem.setupCardUpdates();
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to initialize HUD:`, error);
            throw error;
            ui.notifications.error("Не удалось инициализировать Poker Hand HUD. Проверьте консоль для деталей.");
            throw e;
        }
    },
    
    /**
     * Проверяет должен ли HUD быть доступен пользователю
     * @returns {boolean}
     */
    shouldUserHaveHUD() {
        const userAssignment = HandAssignmentSystem.getUserAssignedHand(game.user.id);
        return !!userAssignment;
    },
    
    /**
     * Создает кнопку закладки если у пользователя есть назначенная рука
     */
    createBookmarkIfAllowed() {
        if (!this.shouldUserHaveHUD()) {
            console.log(`[${MODULE_ID}] User ${game.user.name} has no hand assignment. No bookmark created.`);
            return;
        }
        
        // Проверяем настройку включения закладки
        const bookmarkEnabled = Utils.getSettingSafe("bookmarkEnabled", false);
        if (!bookmarkEnabled) {
            console.log(`[${MODULE_ID}] Bookmark toggle is disabled in settings. No bookmark created.`);
            return;
        }
        
        // Создаем кнопку закладки
        this.createBookmark();
    },
    
    /**
     * Создает кнопку закладки
     */
    createBookmark() {
        const bookmark = document.getElementById("hud-bookmark-toggle");
        if (bookmark) {
            // Set initial state to collapsed (hidden)
            const container = document.getElementById("poker-hand-container");
            if (container) {
                container.style.display = "none";
                bookmark.classList.add("collapsed");
            }
            
            bookmark.addEventListener("click", () => {
                SFX.play(SFX.sounds.click);
                const container = document.getElementById("poker-hand-container");
                if (container) {
                    const isCollapsed = bookmark.classList.contains("collapsed");
                    
                    if (isCollapsed) {
                        // Opening - show container and animate entrance
                        container.style.display = "flex";
                        bookmark.classList.remove("collapsed");
                        
                        // Reset expanded card state when opening HUD
                        ExpandedCardManager.reset();
                        
                        // Force reset all card styles to normal state
                        const cards = container.querySelectorAll(".poker-card");
                        cards.forEach(card => {
                            // Remove expanded class and inline styles
                            card.classList.remove("expanded", "face-down");
                            card.style.cssText = '';
                        });
                        
                        // Animate entrance
                        this.animateEntrance(Array.from(container.querySelectorAll(".poker-card")));
                    } else {
                        // Closing - animate exit then hide
                        this.animateExit(Array.from(container.querySelectorAll(".poker-card")), () => {
                            container.style.display = "none";
                            bookmark.classList.add("collapsed");
                            
                            // Reset expanded card state when closing HUD
                            ExpandedCardManager.reset();
                        });
                    }
                }
            });
        }
    },
    
    /**
     * Создает HTML структуру HUD
     * @param {Object} config - Конфигурация отображения
     * @throws {Error} Если не удалось создать HTML элементы
     */
    buildHTML(config) {
        try {
            if (!pokerHandGlobalState.hand) {
                throw new Error("Hand not initialized");
            }
            
            const hudHtml = `
                <div id="poker-hand-container" class="poker-hand-container" style="--hand-width: ${config.handLayout.maxVisibleCards * config.handLayout.spacing + 100}px; --card-width: ${config.cardVisuals.width}px; --card-height: ${config.cardVisuals.height}px; --card-spacing: ${config.handLayout.spacing}px; --arc-height: ${config.handLayout.arcHeight}px; --rotation-factor: ${config.handLayout.rotationFactor}deg;">
                    <div class="hand-area" data-hand-id="${pokerHandGlobalState.hand.id}">
                        <div class="cards-container"></div>
                    </div>
                </div>
                ${this.shouldUserHaveHUD() && Utils.getSettingSafe("bookmarkEnabled", false) ? `
                <div id="hud-bookmark-toggle">
                    <span class="tab-label">CARDS</span>
                    <i class="chev fas fa-chevron-right"></i>
                </div>
                ` : ''}
            `;

            // Remove existing container
            const existing = document.getElementById("poker-hand-container");
            if (existing) existing.remove();

            // Add new container
            document.body.appendChild(document.createRange().createContextualFragment(hudHtml));
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to build HTML:`, error);
            throw error;
        }
    },
    
    setupBookmarkToggle() {
        // Проверяем есть ли у пользователя назначенная рука
        if (!this.shouldUserHaveHUD()) {
            console.log(`[${MODULE_ID}] User ${game.user.name} has no hand assignment. Bookmark toggle disabled.`);
            return;
        }
        
        // Проверяем настройку включения закладки
        const bookmarkEnabled = Utils.getSettingSafe("bookmarkEnabled", false);
        
        // Устанавливаем начальное состояние HUD
        const container = document.getElementById("poker-hand-container");
        if (container) {
            // Если закладка выключена, не меняем display - оставляем как установлено в applyGlobalCollapse()
            if (bookmarkEnabled) {
                // Если закладка включена, скрываем HUD по умолчанию
                container.style.display = "none";
            }
        }
        
        // Если закладка выключена — ничего не настраиваем, HUD будет открываться шорткатом
        if (!bookmarkEnabled) {
            return;
        }
        
        const bookmark = document.getElementById("hud-bookmark-toggle");
        if (!bookmark) return;
        
        bookmark.classList.add("collapsed");
        
        bookmark.addEventListener("click", () => {
            SFX.play(SFX.sounds.click);
            const container = document.getElementById("poker-hand-container");
            if (!container) return;
            
            const isCollapsed = container.style.display === "none";
            
            if (isCollapsed) {
                // Opening - show container and animate entrance
                container.style.display = "flex";
                bookmark.classList.remove("collapsed");
                
                // Reset expanded card state when opening HUD
                ExpandedCardManager.reset();
                
                // Force reset all card styles to normal state
                const cards = container.querySelectorAll(".poker-card");
                cards.forEach(card => {
                    // Remove expanded class and inline styles
                    card.classList.remove("expanded", "face-down");
                    
                    // Reset inline styles that might be set by expansion
                    card.style.width = "";
                    card.style.height = "";
                    card.style.filter = "";
                    
                    // Reset data attributes that might have been modified
                    delete card.dataset.originalWidth;
                    delete card.dataset.originalHeight;
                });
                
                // Trigger entrance animation when opening
                if (pokerHandGlobalState.hand && pokerHandGlobalState.config && cards.length > 0) {
                    // Re-arrange cards first
                    this.arrangeCardsInFan(Array.from(cards), pokerHandGlobalState.config);
                    // Then animate entrance
                    this.animateEntrance(Array.from(cards), pokerHandGlobalState.config);
                }
            } else {
                // Closing - animate exit then hide
                this.animateExit(Array.from(container.querySelectorAll(".poker-card")), () => {
                    container.style.display = "none";
                    bookmark.classList.add("collapsed");
                    
                    // Reset expanded card state when closing HUD
                    ExpandedCardManager.reset();
                });
            }
        });
    },
    
    /**
     * Анимирует скрытие карт с максимально плавной траекторией
     * @param {HTMLElement[]} cards - Массив элементов карт
     * @param {Function} callback - Функция вызываемая после завершения анимации
     */
    animateExit(cards, callback) {
        const visible = Array.from(cards).filter(card => card.style.display !== "none");
        
        // Animate each card to exit downward with ultra-smooth motion
        visible.forEach((card, index) => {
            const x = Number.parseFloat(card.dataset.xOffset) || 0;
            const y = Number.parseFloat(card.dataset.yOffset) || 0;
            const r = Number.parseFloat(card.dataset.rotation) || 0;
            
            setTimeout(() => {
                card.style.transition = "transform 500ms cubic-bezier(.4,0,.4,1), opacity 450ms ease-out";
                card.style.opacity = "0";
                card.style.transform = `translateX(${x}px) translateY(${y + 150}px) rotateZ(${r}deg)`;
                
                // Add face-down class for sleep effect
                setTimeout(() => {
                    card.classList.add("face-down");
                }, 200);
            }, index * 60); // Slightly slower for smoother cascade
        });
        
        // Call callback after all animations complete
        setTimeout(() => {
            if (callback) callback();
        }, visible.length * 60 + 500);
    },
    
    /**
     * Отображает карты из руки
     * @async
     * @param {Object} hand - Объект руки карт
     * @param {Object} config - Конфигурация отображения
     * @param {Object} options - Дополнительные опции
     * @param {boolean} options.skipGlobalState - Пропустить обновление глобального состояния
     * @returns {Promise<void>}
     * @throws {Error} Если не удалось найти контейнер или отрисовать карты
     */
    async renderCards(hand, config, options = {}) {
        try {
            if (!hand || !hand.cards) {
                throw new Error("Invalid hand data provided");
            }

            const container = document.querySelector(".cards-container");
            if (!container) {
                throw new Error("Cards container not found");
            }

            // Only update global state if not a local update
            if (!options.skipGlobalState) {
                // Update both global and user-specific state
                pokerHandGlobalState.hand = hand;
                pokerHandGlobalState.config = config;
                userStateManager.updateCurrentUserHand(hand);
                userStateManager.updateCurrentUserConfig(config);
            }

            // Clear container
            container.innerHTML = '';

            // Get cards from hand
            const cards = hand.cards.contents || [];
            if (cards.length === 0) {
                container.innerHTML = '<div class="no-content">Нет карт в руке</div>';
                return;
            }

            // Create card elements
            const allCardElements = [];
            cards.forEach((card, index) => {
                try {
                    const cardEl = this.createCardElement(card, index, config);
                    allCardElements.push(cardEl);
                    container.appendChild(cardEl);
                } catch (error) {
                    console.error(`[${MODULE_ID}] Failed to create card element for card ${card.id}:`, error);
                }
            });

            // Arrange cards in fan pattern
            this.arrangeCardsInFan(allCardElements, config);

            // Setup real-time updates only for non-local updates
            if (!options.skipGlobalState) {
                this.setupCardUpdates(hand, config, allCardElements);
            }
            
            // Animate entrance
            this.animateEntrance(allCardElements, config);
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to render cards:`, error);
            ui.notifications.error("Не удалось отобразить карты. Проверьте консоль для деталей.");
            throw error;
        }
    },
    
    /**
     * Анимирует появление карт снизу с максимально плавной траекторией
     * @param {HTMLElement[]} cards - Массив элементов карт
     * @param {Object} config - Конфигурация отображения
     */
    animateEntrance(cards, config) {
        if (StateManager.getGlobalCollapsed()) {
            return;
        }
        
        const visible = Array.from(cards).filter(card => card.style.display !== "none");
        
        // Set initial state - cards start from bottom
        visible.forEach((card, index) => {
            const x = Number.parseFloat(card.dataset.xOffset) || 0;
            const y = Number.parseFloat(card.dataset.yOffset) || 0;
            const r = Number.parseFloat(card.dataset.rotation) || 0;
            
            // Start position - below the final position
            card.style.opacity = "0";
            card.style.transform = `translateX(${x}px) translateY(${y + 200}px) rotateZ(${r}deg)`;
        });
        
        // Animate each card with delay using ultra-smooth trajectory
        visible.forEach((card, index) => {
            const x = Number.parseFloat(card.dataset.xOffset) || 0;
            const y = Number.parseFloat(card.dataset.yOffset) || 0;
            const r = Number.parseFloat(card.dataset.rotation) || 0;
            
            setTimeout(() => {
                card.style.opacity = "1";
                card.style.transition = "transform 600ms cubic-bezier(.25,1.05,.25,1.05), opacity 400ms ease-out";
                // Move to intermediate position above final position with more lift
                card.style.transform = `translateX(${x}px) translateY(${y - 15}px) rotateZ(${r}deg)`;
                
                setTimeout(() => {
                    // Ultra-smooth transition to final position
                    card.style.transition = "transform 500ms cubic-bezier(.15,.85,.15,1)";
                    card.style.transform = `translateX(${x}px) translateY(${y}px) rotateZ(${r}deg)`;
                    
                    setTimeout(() => {
                        card.style.transition = "";
                    }, 500);
                }, 600);
            }, (index + 1) * (config.animations?.entranceDelay || 120));
        });
        
        // Add enhanced sparkle effects
        setTimeout(() => {
            this.createEntranceSparkles();
        }, visible.length * (config.animations?.entranceDelay || 120) + 200);
    },
    
    /**
     * Создает улучшенные искровые эффекты при появлении
     */
    createEntranceSparkles() {
        const container = document.getElementById("poker-hand-container");
        if (!container) return;
        
        const dust = document.createElement("div");
        dust.className = "sparkle-layer";
        dust.style.cssText = `
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 1100px;
            height: 260px;
            pointer-events: none;
            z-index: 1;
            overflow: visible;
        `;
        container.appendChild(dust);
        
        // Create more sparkles with better distribution
        for (let i = 0; i < 18; i++) {
            const s = document.createElement("div");
            s.className = "sparkle";
            s.style.cssText = `
                position: absolute;
                opacity: 0;
                filter: saturate(1.2);
                animation: spark-float-fade var(--dur,2.2s) ease-out forwards;
                mix-blend-mode: screen;
                left: ${(Math.random() * 900) + 100}px;
                bottom: ${Math.random() * 15}px;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.7));
                border-radius: 50%;
                --dx: ${(Math.random() - 0.5) * 28}px;
                --dur: ${0.8 + Math.random() * 0.8}s;
                --sc: ${0.7 + Math.random() * 0.6};
            `;
            dust.appendChild(s);
            s.addEventListener("animationend", () => s.remove());
        }
        
        // Remove dust container after longer duration for smoother effect
        setTimeout(() => dust.remove(), 1600);
    },
    
    /**
     * Создает HTML элемент карты
     * @param {Object} card - Объект карты
     * @param {number} index - Индекс карты в руке
     * @param {Object} config - Конфигурация отображения
     * @returns {HTMLElement} HTML элемент карты
     * @throws {Error} Если не удалось создать элемент карты
     */
    createCardElement(card, index, config) {
        try {
            if (!card || !card.id) {
                throw new Error("Invalid card data");
            }

            const cardEl = document.createElement("div");
            cardEl.className = "poker-card";
            cardEl.dataset.cardId = card.id;
            cardEl.dataset.index = index;

            // Card back
            const cardBack = document.createElement("div");
            cardBack.className = "card-back";
            
            // Card art
            const cardArt = document.createElement("div");
            cardArt.className = "card-art";
            if (card.img) {
                cardArt.style.backgroundImage = `url('${card.img}')`;
                cardArt.style.backgroundSize = "cover";
                cardArt.style.backgroundPosition = "center top";
            }
            
            // Card text overlay
            const cardTextOverlay = document.createElement("div");
            cardTextOverlay.className = "card-text-overlay";
            
            // Card name
            const nameContainer = document.createElement("div");
            nameContainer.className = "card-name-container";
            
            const nameSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            nameSvg.setAttribute("class", "card-name-svg");
            nameSvg.setAttribute("viewBox", "0 0 200 50");
            
            const namePath = document.createElementNS("http://www.w3.org/2000/svg", "text");
            namePath.setAttribute("x", "100");
            namePath.setAttribute("y", "30");
            namePath.setAttribute("text-anchor", "middle");
            namePath.textContent = card.name || `Карта ${index + 1}`;
            
            nameSvg.appendChild(namePath);
            nameContainer.appendChild(nameSvg);

            // Shine effect
            const shine = document.createElement("div");
            shine.className = "shine";

            // Selection indicators (simplified)
            const selectBadge = document.createElement("div");
            selectBadge.className = "select-badge";
            selectBadge.textContent = "✓";

            const selectUnderline = document.createElement("div");
            selectUnderline.className = "select-underline";

            // Assemble card
            cardEl.appendChild(cardBack);
            cardEl.appendChild(cardArt);
            cardEl.appendChild(cardTextOverlay);
            cardEl.appendChild(nameContainer);
            cardEl.appendChild(shine);
            cardEl.appendChild(selectBadge);
            cardEl.appendChild(selectUnderline);

            return cardEl;
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to create card element:`, error);
            throw error;
        }
    },
    
    arrangeCardsInFan(cards, config) {
        const visible = Array.from(cards).filter(card => card.style.display !== "none");
        const total = visible.length;
        
        // Ensure handLayout exists with defaults
        const handLayout = config.handLayout || {
            spacing: 105,
            arcHeight: 5,
            rotationFactor: 5
        };
        
        visible.forEach((card, index) => {
            const ni = index - (total - 1) / 2.0;
            const { spacing, arcHeight, rotationFactor } = handLayout;
            
            const xOffset = ni * spacing;
            // Original formula from the source: creates proper arc shape
            const yOffset = Math.abs(ni) * (Math.abs(ni) * arcHeight);
            const rotation = ni * rotationFactor;
            
            card.dataset.xOffset = xOffset;
            card.dataset.yOffset = yOffset;
            card.dataset.rotation = rotation;
            card.dataset.originalZIndex = index;
            
            const base = (cx, cy, rot) => `translateX(${cx}px) translateY(${cy}px) rotateZ(${rot}deg)`;
            card.style.transform = base(xOffset, yOffset, rotation);
            card.style.zIndex = index;
        });
    },
    
    setupCardUpdates(hand, config, allCardElements) {
        // Remove existing hooks to prevent duplicates
        if (pokerHandGlobalState._cardHooks) {
            pokerHandGlobalState._cardHooks.forEach(hookId => Hooks.off(hookId.event, hookId.id));
            pokerHandGlobalState._cardHooks = null;
        }
        
        // Setup hooks for real-time updates
        const hooks = [];
        
        // Hook for card updates
        const updateHook = Hooks.on("updateCard", (updatedCard) => {
            if (updatedCard.id !== hand.id) return;
            // Re-render cards when hand updates
            this.renderCards(hand, config);
        });
        hooks.push({ event: "updateCard", id: updateHook });
        
        pokerHandGlobalState._cardHooks = hooks;
        
        // Attach hover events to all cards
        allCardElements.forEach(cardEl => {
            // Get the card data for this element using correct ID
            const cardId = cardEl.dataset.cardId;
            const cardData = pokerHandGlobalState.hand.cards.contents.find(c => c.id === cardId);
            console.log(`[${MODULE_ID}] attachHoverEvents: element ${cardId} -> card ${cardData?.name} (${cardData?.id})`);
            attachHoverEvents(cardEl, cardData);
        });
    },
    
    injectCSS(config) {
        const styleId = "poker-hand-styles";
        document.getElementById(styleId)?.remove();
        
        const { cardVisuals, colors } = config;
        const accent = colors.accent || "#c0a060";
        const selGlow = colors.selectedGlow || "rgba(255,200,100,0.6)";
        
        // Get custom URLs from settings
        const baseImage = Utils.getSettingSafe("cardBaseImageUrl", "") || cardVisuals.baseImage;
        const backImage = Utils.getSettingSafe("clientBackCustomUrl", "") || Utils.getSettingSafe("cardBackImageUrl", "") || cardVisuals.backImage;
        const maskImage = Utils.getSettingSafe("cardMaskImageUrl", "") || cardVisuals.artMaskImage;
        
        const cardBaseStyle = baseImage
            ? `background-image: url('${baseImage}'); background-size: cover; background-position: center;`
            : `background: radial-gradient(circle, #4a4a5a, #2a2a3a), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px); border: 1px solid rgba(200, 200, 255, 0.2); border-radius: 11px; box-sizing: border-box;`;

        const cardBackStyle = backImage
            ? `background-image: url('${backImage}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); border: 3px solid #1a252f;`;

        const cardArtMaskStyle = maskImage
            ? `mask-image: url('${maskImage}'); -webkit-mask-image: url('${maskImage}');`
            : config.cardVisuals?.disableGradientMask 
                ? `mask-image: none; -webkit-mask-image: none;`
                : `mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);`;

        const css = `
        .poker-card { width: ${cardVisuals.width}px; height: ${cardVisuals.height}px; position: absolute; transition: transform 0.22s cubic-bezier(.2,.8,.2,1), opacity .2s ease, filter .2s ease; pointer-events: auto; cursor: pointer; filter: ${config.cardVisuals?.alwaysShowShadow ? 'drop-shadow(3px 3px 5px rgba(0,0,0,0.5))' : 'drop-shadow(3px 3px 5px rgba(0,0,0,0.5))'}; overflow: hidden; will-change: transform, filter; transform-style: preserve-3d; ${cardBaseStyle} }
        .card-back { position: absolute; inset: 0; z-index: 3; opacity: 0; transform: scale(0.985); transition: opacity .22s ease, transform .22s ease; pointer-events: none; ${cardBackStyle} }
        .poker-card .card-art { position: absolute; z-index: 2; background-color: ${cardVisuals.artBackgroundColor}; background-size: cover; background-position: center top; background-repeat: no-repeat; mask-size: 100% 100%; -webkit-mask-size: 100% 100%; left: 0; top: 0; width: 100%; height: 100%; transition: opacity .22s ease, transform .22s ease; ${cardArtMaskStyle} }
        .poker-card .card-text-overlay { position: absolute; inset: 0; z-index: 2; pointer-events: none; transition: opacity .22s ease, transform .22s ease; }
        .poker-card.face-down .card-back { opacity: 1; transform: scale(1); }
        .poker-card.face-down .card-art, .poker-card.face-down .card-text-overlay { opacity: 0; transform: translateY(6px) scale(0.98); }

        .poker-card .shine { position: absolute; inset: -20% -30%; z-index: 4; pointer-events: none;
        background: linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0) 60%);
        transform: translateX(-160%) skewX(-12deg);
        opacity: 0; }
        .poker-card:hover .shine { animation: phh-shine 0.9s ease-out forwards; }
        @keyframes phh-shine { 0% { transform: translateX(-160%) skewX(-12deg); opacity: 0; } 25% { opacity: .8; } 100% { transform: translateX(160%) skewX(-12deg); opacity: 0; } }

        .card-name-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; height: 50px; display: flex; align-items: center; justify-content: center; }
        .card-name-svg { width: 100%; height: 100%; overflow: visible; }
        .card-name-svg text { font-family: "Signika", sans-serif; font-size: var(--card-name-font-size, ${cardVisuals.nameStyle.fontSize}); font-weight: var(--card-name-weight, ${cardVisuals.nameStyle.weight}); letter-spacing: var(--card-name-letter, ${cardVisuals.nameStyle.letter}); fill: white; stroke: black; stroke-width: var(--card-name-stroke, ${cardVisuals.nameStyle.stroke}); }

        #poker-hand-container { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 3500; display: flex; justify-content: center; align-items: center; pointer-events: auto; height: 135px; transition: bottom 0.45s cubic-bezier(.2,1,.2,1); overflow: visible; }

        .sparkle-layer { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 1100px; height: 260px; pointer-events: none; z-index: 1; overflow: visible; }
        .sparkle { position: absolute; opacity: 0; filter: saturate(1.1); animation: spark-float-fade var(--dur,1.8s) ease-out forwards; mix-blend-mode: screen; }
        .sparkle.text { width: auto !important; height: auto !important; background: none !important; border-radius: 0 !important; line-height: 1; white-space: pre; }
        .sparkle.runes { font-weight: 700; }
        .sparkle.petals { filter: saturate(1.2); }
        .sparkle.notes { font-weight: 700; }
        .sparkle.cards { font-weight: 900; }

        @keyframes spark-float-fade {
            0% { opacity: 0; transform: translateX(var(--dx,0px)) translateY(18px) rotate(var(--rot,0deg)) scale(var(--sc,0.9)); }
            10% { opacity: 1; }
            80% { opacity: 0.95; }
            100% { opacity: 0; transform: translateX(var(--dx,0px)) translateY(-42px) rotate(var(--rot,0deg)) scale(var(--sc,1.1)); }
        }

        #hud-bookmark-toggle { position: fixed; left: 0; top: var(--bookmark-top, 33vh); transform: translateY(-50%); width: 32px; height: 120px; border-radius: 0 8px 8px 0; background: linear-gradient(180deg, rgba(60,45,30,0.95), rgba(30,20,10,0.95)); border: 1px solid ${Utils.hexToRgba(accent,0.55)}; box-shadow: 0 4px 12px rgba(0,0,0,0.45), inset 0 0 10px ${Utils.hexToRgba(accent,0.15)}; z-index: 9000; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; color: #f0e6d2; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        #hud-bookmark-toggle .tab-label { font-size: 10px; letter-spacing: 1px; writing-mode: vertical-rl; transform: rotate(180deg); opacity: .9; }
        #hud-bookmark-toggle .chev { position: absolute; bottom: 6px; font-size: 12px; opacity: .8; }
        #hud-bookmark-toggle.collapsed .chev { transform: rotate(180deg); }

        .poker-card .select-badge {
        position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%;
        background: ${selGlow}; color: #111; font-weight: 900; font-size: 14px; line-height: 20px; text-align: center;
        box-shadow: 0 0 6px ${Utils.hexToRgba(selGlow,0.8)}, 0 0 16px ${Utils.hexToRgba(selGlow,0.5)};
        opacity: 0; transform: scale(0.5); transition: all .15s ease; pointer-events: none; z-index: 6;
        }
        .poker-card .select-underline {
        position: absolute; left: 12px; right: 12px; bottom: 10px; height: 4px; border-radius: 4px;
        background: linear-gradient(90deg, ${Utils.hexToRgba(selGlow,0.2)}, ${selGlow}, ${Utils.hexToRgba(selGlow,0.2)});
        opacity: 0; transform: translateY(6px); transition: all .18s ease; z-index: 6;
        }
        .poker-card.selectable.selected .select-badge { opacity: 1; transform: scale(1); }
        .poker-card.selectable.selected .select-underline { opacity: 1; transform: translateY(0); }

        .no-content {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #999;
            font-size: 16px;
            font-style: italic;
        }

        #poker-hand-container.collapsed { bottom: -9999px !important; pointer-events: none; }
        `;
        
        const style = document.createElement("style");
        style.id = styleId; 
        style.innerHTML = css; 
        document.head.appendChild(style);
    },
    
    setupCleanup() {
        pokerHandGlobalState.cleanup = () => {
            document.getElementById("poker-hand-container")?.remove();
            document.getElementById("poker-hand-styles")?.remove();
            
            // Clear expanded card state
            ExpandedCardManager.reset();
            
            // Clear context menus
            document.querySelectorAll(".card-context-menu").forEach(menu => menu.remove());
            
            // Clear confirmation button
            if (pokerHandGlobalState.confirmButton) {
                pokerHandGlobalState.confirmButton.remove();
                pokerHandGlobalState.confirmButton = null;
            }
            
            // Clear tooltip
            pokerHandGlobalState.cleanupTooltip?.();
            
            // Clear retract timer
            if (pokerHandGlobalState.cancelRetractTimer) {
                pokerHandGlobalState.cancelRetractTimer();
            }
            
            // Clear card hooks
            if (pokerHandGlobalState._cardHooks) {
                pokerHandGlobalState._cardHooks.forEach(hookId => Hooks.off(hookId.event, hookId.id));
                pokerHandGlobalState._cardHooks = null;
            }
            
            if (pokerHandGlobalState.sparkleInterval) {
                clearInterval(pokerHandGlobalState.sparkleInterval);
                pokerHandGlobalState.sparkleInterval = null;
            }
            if (pokerHandGlobalState._sparkleHandlers) {
                const { enter, leave, container: c } = pokerHandGlobalState._sparkleHandlers;
                if (c) { 
                    c.removeEventListener("mouseenter", enter); 
                    c.removeEventListener("mouseleave", leave); 
                }
                pokerHandGlobalState._sparkleHandlers = null;
            }
        };
    },
    
    /**
     * Обновляет HUD с новой рукой
     * @async
     */
    async refreshHand() {
        console.log(`[${MODULE_ID}] Refreshing HUD with new hand assignment...`);
        
        try {
            // Выбираем новую руку
            const hand = await CardSystem.selectCardHand();
            if (!hand) {
                console.log(`[${MODULE_ID}] No hand available after refresh`);
                return;
            }
            
            console.log(`[${MODULE_ID}] Refreshed hand: ${hand.name} (${hand.id})`);
            
            // Создаем и загружаем конфигурацию (как в init)
            let config = ConfigSystem.createDefaultConfig();
            config = ConfigSystem.loadSettings(config);
            
            // Проверяем существует ли контейнер
            const container = document.querySelector(".cards-container");
            if (container) {
                // Если контейнер существует, просто обновляем карты
                console.log(`[${MODULE_ID}] Updating existing HUD...`);
                await this.renderCards(hand, config);
            } else {
                // Если контейнера нет, нужно полностью реинициализировать HUD
                console.log(`[${MODULE_ID}] No container found, reinitializing HUD...`);
                
                // Сначала очищаем если есть что чистить
                if (pokerHandGlobalState.cleanup) {
                    pokerHandGlobalState.cleanup();
                }
                
                // Обновляем глобальное состояние
                pokerHandGlobalState.hand = hand;
                pokerHandGlobalState.config = config;
                
                // Вызываем полную инициализацию как в методе init
                await this.initializeHUD(hand, config);
            }
            
            console.log(`[${MODULE_ID}] HUD refreshed successfully`);
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Failed to refresh HUD:`, error);
            ui.notifications.error("Failed to refresh hand assignment");
        }
    },
    
    /**
     * Инициализирует HUD с рукой и конфигурацией
     * @async
     * @param {Object} hand - Объект руки
     * @param {Object} config - Конфигурация
     */
    async initializeHUD(hand, config) {
        console.log(`[${MODULE_ID}] Initializing HUD with hand: ${hand.name}`);
        
        // Store in user-specific state
        userStateManager.updateCurrentUserHand(hand);
        userStateManager.updateCurrentUserConfig(config);
        
        // Build HTML structure
        this.buildHTML(config);
        
        // Render cards
        await this.renderCards(hand, config);
        
        // Setup bookmark toggle
        this.setupBookmarkToggle();
        
        // Inject CSS
        this.injectCSS();
        
        console.log(`[${MODULE_ID}] HUD reinitialized successfully`);
    },
};

// Делаем PokerHandHUD доступным глобально для HandAssignmentSystem
window.PokerHandHUD = PokerHandHUD;

// Регистрируем query в init хуке чтобы он был доступен на всех клиентах
Hooks.on('init', () => {
    // Регистрируем query для обновления HUD
    CONFIG.queries[`${MODULE_ID}.refreshHand`] = async (queryData, { timeout }) => {
        console.log(`[${MODULE_ID}] Received refresh query:`, queryData);
        console.log(`[${MODULE_ID}] Current user: ${game.user.name} (${game.user.id})`);
        console.log(`[${MODULE_ID}] Refresh from user: ${queryData.userId}`);
        
        try {
            // Если есть назначения в данных, используем их
            if (queryData.assignments) {
                const userAssignment = queryData.assignments[game.user.id];
                console.log(`[${MODULE_ID}] Found assignment for current user:`, userAssignment);
                
                // Отправляем событие с правильными данными
                window.dispatchEvent(new CustomEvent('pokerHandAssignmentChanged', {
                    detail: {
                        userId: game.user.id,
                        newHand: userAssignment || ''
                    }
                }));
                
                return { success: true, message: 'HUD refreshed successfully' };
            } else {
                // Если нет назначений, просто обновляем HUD
                setTimeout(() => {
                    PokerHandHUD.refreshHand();
                }, 200);
                
                return { success: true, message: 'HUD refreshed without assignments' };
            }
        } catch (error) {
            console.error(`[${MODULE_ID}] Error in refreshHand query:`, error);
            return { success: false, error: error.message };
        }
    };
});

// Добавляем обработчик в ready хуке для событий
Hooks.on('ready', () => {
    // Добавляем обработчик кастомного события
    window.addEventListener('pokerHandAssignmentChanged', (event) => {
        console.log(`[${MODULE_ID}] Assignment changed event:`, event.detail);
        
        // Обновляем HUD с небольшой задержкой чтобы настройки применились
        setTimeout(() => {
            PokerHandHUD.refreshHand();
        }, 100);
    });
});

export { PokerHandHUD };
