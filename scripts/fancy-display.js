/* ===== POKER HAND HUD - FANCY CARD DISPLAY ===== */
/**
 * @fileoverview Fancy card display system with 3D animations and effects
 * @author Poker Hand HUD Team
 * @version 2.0.0
 * Adapted from orcnog-card-viewer module
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';

class FancyDisplay {
    constructor({imgArray, borderColor, borderWidth, glowColor, faceDown}) {
        this.imgArray = imgArray;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
        this.glowColor = glowColor;
        this.faceDown = faceDown;
    }

    async render(shareToAll, dramaticReveal) {
        try {
            const FancyDisplay = this;
            
            // Default paths for back images if not provided
            this.imgArray.forEach(image => {
                if (!image.back) {
                    image.back = Utils.getSettingSafe("defaultCardBackImage", "systems/dnd5e/ui/cards/back.webp");
                }
            });
            
            const renderFaceDown = this.faceDown;
            const renderDramaticReveal = dramaticReveal;
            const borderWidth = FancyDisplay._getBorderWidth(this.borderWidth);
            const borderColor = FancyDisplay._getBorderColor(this.borderColor, this.borderWidth);
            const glowColor = FancyDisplay._getGlowColor(this.glowColor);
            const share = shareToAll;
            const playersCanShareToAll = Utils.getSettingSafe("playersCanShareToAll", false);
            const dramaticRevealDelayMs = Utils.getSettingSafe("dramaticRevealDelay", 1000);
            
            if (this.imgArray.length > 0) {
                const dialogWidth = "100vw";
                const dialogHeight = "100vh";

                // Create the custom display
                class CustomPopout extends Application {
                    constructor(images, borderColor, borderWidth, glowColor) {
                        super();
                        this.images = images;
                        this.borderWidth = borderWidth;
                        this.borderColor = borderColor;
                        this.glowColor = glowColor;
                    }

                    static get defaultOptions() {
                        return foundry.utils.mergeObject(super.defaultOptions, {
                            template: `modules/${MODULE_ID}/templates/card-viewer.html`,
                            popOut: false,
                            minimizable: true,
                            resizable: true,
                            width: dialogWidth,
                            height: dialogHeight
                        });
                    }

                    activateListeners(html) {
                        console.log(`[${MODULE_ID}] Fancy display rendered.`);
                        this.jsEvents(html[0]);
                    }

                    async jsEvents (html) {
                        const wrpDrawn = html.querySelector('.decks-draw__stg');
                        const wrpCards = html.querySelectorAll('.decks-draw__wrp-card');
                        const wrpCardArcs = html.querySelectorAll('.decks-draw__wrp-card-arc');
                        const wrpCardPerspectives = html.querySelectorAll('.decks-draw__wrp-card-perspective');
                        const wrpCardFlips = html.querySelectorAll('.decks-draw__wrp-card-flip');
                        const shareBtn = html.querySelector(`.${MODULE_ID}-share-btn`);
                        const numOfCards = wrpCards.length;
                    
                        wrpCardFlips.forEach(wrpCardFlip => {
                            const btnFlip = wrpCardFlip.querySelector(`.${MODULE_ID}-flip-button`);
                            if (btnFlip) {
                                btnFlip.addEventListener("click", (evt) => {
                                    evt.stopPropagation();
                                    wrpCardFlip.classList.toggle("decks-draw__wrp-card-flip--flipped");
                                });
                            }
                        });
                    
                        wrpCards.forEach(wrpCard => {
                            wrpCard.addEventListener("click", (evt) => {
                                evt.stopPropagation();
                            });
                        });
                    
                        if (shareBtn) {
                            shareBtn.addEventListener("click", (evt) => {
                                evt.stopPropagation();
                                shareBtn.disabled = true;
                                FancyDisplay._shareToAll.call(FancyDisplay);
                            });
                        }
                    
                        wrpDrawn.addEventListener("contextmenu", (evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            
                            // Add closing animation classes
                            const stage = html.querySelector('.decks-draw__stg');
                            const cards = html.querySelectorAll('.decks-draw__wrp-card');
                            
                            stage.classList.remove('decks-draw__stg--visible');
                            stage.classList.add('decks-draw__stg--closing');
                            
                            cards.forEach(card => {
                                card.classList.remove('decks-draw__wrp-card--visible');
                                card.classList.add('decks-draw__wrp-card--closing');
                            });
                            
                            // Remove after animation completes
                            setTimeout(() => {
                                $(`.${MODULE_ID}`).remove();
                            }, 500);
                        });

                        _arcThis(wrpCardArcs, {
                            dir: 1,
                            rotate: true
                        });
                    
                        wrpDrawn.addEventListener("mousemove", (evt) => {
                            const mouseX = evt.clientX;
                            const mouseY = evt.clientY;
                    
                            requestAnimationFrame(() => {
                                wrpCardPerspectives.forEach((wrpCardPersp, index) => {
                                    const wrpCard = wrpCardPersp;
                                    const dispGlint = wrpCardPersp.querySelector('.decks-draw__disp-glint');
                                    _pRenderStgCard_onMouseMove_mutElements({mouseX, mouseY, wrpCard, dispGlint});
                                });
                            });
                        });

                        // Automatically flip all cards over (animated), if dramatic reveal is enabled
                        if (dramaticReveal && renderFaceDown) {
                            setTimeout(() => {
                                // After delay, start the interval
                                let flipAllIndex = 0;
                                let flipAll = setInterval(() => {
                                    wrpCardFlips[flipAllIndex]?.classList.remove('decks-draw__wrp-card-flip--flipped');
                                    flipAllIndex++;
                                    if (flipAllIndex === wrpCardFlips.length) clearInterval(flipAll);
                                }, 80);
                            }, dramaticRevealDelayMs);
                        }

                        function _arcThis(things, options = {}) {
                            const dir = options.dir ?? 1;
                            const rotate = options.rotate ?? true;
                            let radius = options.radius ?? 200;
                            
                            let totalWidth = 0;
                            const centers = [];

                            things.forEach(thing => {
                                const widthPx = thing.offsetWidth;
                                const widthVh = (widthPx / window.innerHeight) * 100;
                                const center = totalWidth + widthVh / 2;
                                centers.push(center);
                                totalWidth += widthVh;
                            });
                            
                            if (radius < totalWidth / 2) radius = totalWidth / 2;
                            
                            const baseArc = totalWidth;
                            const angle = 2 * Math.asin(baseArc / (2 * radius));
                            const fullArcLength = radius * angle;
                            
                            let iteratorX = 0;
                            things.forEach((thing, i) => {
                                const widthPx = thing.offsetWidth;
                                const widthVh = (widthPx / window.innerHeight) * 100;
                            
                                const arcLetter = (widthVh / totalWidth) * fullArcLength;
                                const beta = arcLetter / radius;
                                const h = radius * Math.cos(beta / 2);
                            
                                const alpha = Math.acos((totalWidth / 2 - iteratorX) / radius);
                                const theta = alpha + beta / 2;
                            
                                const x = Math.cos(theta) * h;
                                const y = Math.sin(theta) * h;
                                const xpos = iteratorX + Math.abs(totalWidth / 2 - x - iteratorX);
                            
                                const xval = xpos - centers[i];
                                const yval = dir * (radius - y);
                                const ang = rotate ? dir * -Math.asin(x / radius) * (180 / Math.PI) : 0;
                            
                                thing.style.display = `inline-block`;
                                thing.style.position = `relative`;
                                thing.style.left = `${xval}vh`;
                                thing.style.top = `${yval}vh`;
                                thing.style.transform = `rotate(${ang}deg)`;
                                thing.style.transformOrigin = `bottom center`;
                            
                                iteratorX = 2 * xpos - iteratorX;
                            });
                        }

                        function _pRenderStgCard_onMouseMove_mutElements ({mouseX, mouseY, wrpCard, dispGlint}) {
                            const perStyles = _pRenderStgCard_getPerspectiveStyles({mouseX, mouseY, ele: wrpCard});
                            wrpCard.style.transform = perStyles.cardTransform;
                            // Removed dispGlint.style.background to disable glint effect
                        }

                        function _pRenderStgCard_getPerspectiveStyles ({mouseX, mouseY, ele}) {
                            const bcr = ele.getBoundingClientRect();
                            const hView = window.innerHeight;
                        
                            const cCenterX = bcr.left + bcr.width / 2;
                            const cCenterY = bcr.top + bcr.height / 2;
                        
                            const cMouseX = mouseX - cCenterX;
                            const cMouseY = (hView - mouseY) - (hView - cCenterY);
                        
                            const scaleFactor = hView * 2;
                        
                            const distance = Math.sqrt(Math.pow(cMouseX, 2) + Math.pow(cMouseY, 2));
                            const falloffFactor = 3 * Math.max(0.1, 1 - Math.pow(distance / scaleFactor, 0.5));
                        
                            const rotX = (cMouseY / scaleFactor) * falloffFactor;
                            const rotY = (cMouseX / scaleFactor) * falloffFactor;

                            const glintEdgeSpreadTop = parseInt(borderWidth) == 0 ? 110 : 100;
                            const glintEdgeSpreadBottom = parseInt(borderWidth) == 0 ? -10 : 0;
                        
                            return {
                                ..._pRenderStgCard_getPerspectiveStyles_card({mouseX, mouseY, bcr, hView, rotX, rotY}),
                                ..._pRenderStgCard_getPerspectiveStyles_glint({mouseX, mouseY, bcr, hView, rotX, rotY, glintEdgeSpreadTop, glintEdgeSpreadBottom}),
                            };
                        }

                        function _pRenderStgCard_getPerspectiveStyles_card ({rotX, rotY}) {
                            return {
                                cardTransform: `perspective(100vh) rotateX(${rotX}rad) rotateY(${rotY}rad)`,
                            };
                        }

                        function _pRenderStgCard_getPerspectiveStyles_glint ({mouseX, mouseY, bcr, hView, rotX, rotY, glintEdgeSpreadTop, glintEdgeSpreadBottom}) {
                            const cCenterX = bcr.left + bcr.width / 2;
                            const cCenterY = bcr.top + bcr.height / 2;
                        
                            const cMouseX = mouseX - cCenterX;
                            const cMouseY = (hView - mouseY) - (hView - cCenterY);
                        
                            const glintDist = Math.sqrt(Math.pow(cMouseX, 2) + Math.pow(cMouseY, 2));
                            const glintDistRatio = glintDist / hView;
                        
                            const pctLeft = ((mouseX - bcr.left) / bcr.width) * 100;
                            const pctTop = ((mouseY - bcr.top) / bcr.height) * 100;
                        
                            const pctLeftClamped = Math.max(0, Math.min(100, pctLeft));
                            const pctTopClamped = Math.max(0, Math.min(100, pctTop));
                        
                            const glintOpacityFalloff = glintDistRatio * 0.33;
                        
                            // Removed glint background calculation as it's no longer used
                            return {};
                        }
                    }

                    getData() {
                        const data = super.getData();
                        data.moduleId = MODULE_ID;
                        data.isGM = game.user.isGM;
                        data.showShareBtn = !share && (game.user.isGM || playersCanShareToAll);
                        data.images = this.images;
                        data.dramaticReveal = renderDramaticReveal;
                        data.faceDown = renderFaceDown;
                        data.hasBorder = parseInt(this.borderWidth) !== 0;
                        data.glowColor = this.glowColor;
                        data.borderColor = this.borderColor;
                        data.borderWidth = this.borderWidth;
                        data.glintColor = FancyDisplay._adjustToGlintColor(this.borderColor);
                        return data;
                    }
                }

                const customPopout = new CustomPopout(this.imgArray, borderColor, borderWidth, glowColor);
                customPopout.render(true);

                if (share && (game.user.isGM || playersCanShareToAll)) {
                    FancyDisplay._shareToAll.call(this);
                }

            } else {
                console.warn(`[${MODULE_ID}] Image URL or file path not provided.`);
            }
        } catch (error) {
            console.error(`[${MODULE_ID}] Error rendering FancyDisplay:`, error);
        }
    }

    _shareToAll() {
        console.log(`[${MODULE_ID}] Sharing card display to all players.`);
        
        // Use socketlib to share with all other players
        try {
            const socketData = {
                imgArray: this.imgArray,
                faceDown: this.faceDown,
                borderColor: this.borderColor,
                borderWidth: this.borderWidth,
                glowColor: this.glowColor,
                dramaticReveal: true,
                senderId: game.user.id // Add sender ID to prevent self-display
            };
            
            // Wait for socketlib to be ready and try multiple times
            const tryShare = (attempts = 0) => {
                const globalSocket = globalThis.CardSocket || window.CardSocket;
                
                console.log(`[${MODULE_ID}] Share attempt ${attempts + 1}:`, typeof globalSocket, !!globalSocket?.executeForOthers);
                
                if (globalSocket && globalSocket.executeForOthers) {
                    const methodString = globalSocket.executeForOthers.toString();
                    console.log(`[${MODULE_ID}] Method string:`, methodString.substring(0, 100));
                    
                    if (!methodString.includes('socketlib is required')) {
                        globalSocket.executeForOthers("ShareCard", socketData);
                        console.log(`[${MODULE_ID}] Card shared with all players via socketlib.`);
                        return true;
                    } else {
                        console.log(`[${MODULE_ID}] Socket method still contains placeholder, trying direct socketlib call`);
                        // Try direct socketlib call as fallback
                        try {
                            if (typeof socketlib !== 'undefined') {
                                const directSocket = socketlib.registerModule('poker-hand-hud-dnd');
                                directSocket.executeForOthers("ShareCard", socketData);
                                console.log(`[${MODULE_ID}] Card shared via direct socketlib call`);
                                return true;
                            }
                        } catch (e) {
                            console.error(`[${MODULE_ID}] Direct socketlib call failed:`, e);
                        }
                    }
                }
                
                if (attempts < 5) {
                    console.log(`[${MODULE_ID}] Socket not ready, retrying in 100ms...`);
                    setTimeout(() => tryShare(attempts + 1), 100);
                } else {
                    console.error(`[${MODULE_ID}] Failed to share card after 5 attempts`);
                }
                return false;
            };
            
            tryShare();
            
        } catch (error) {
            console.error(`[${MODULE_ID}] Error sharing card:`, error);
        }
    }

    _adjustToGlintColor(color) {
        if (!color || color == 'transparent') return null;
        const Y = 58;
        const [H, S, L] = this._convertHexToHSL(color);
        const newH = (H > (Y+10) ? H-10 : H < (Y-10) ? H+10 : Y);
        const newS = Math.pow(S, 1.08);
        const newL = (L*10 + 100) / 11;
        const alpha = '100';
        return `hsl(${Math.round(newH)} ${Math.round(newS)}% ${Math.round(newL)}% / ${alpha})`;
    }

    _convertHexToHSL(color) {
        let r, g, b;
      
        if (color.startsWith("#")) {
          let hex = color.slice(1);
          if (hex.length === 3) hex = [hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]].join('');
          r = parseInt(hex.substr(0, 2), 16) / 255;
          g = parseInt(hex.substr(2, 2), 16) / 255;
          b = parseInt(hex.substr(4, 2), 16) / 255;
        } else if (color.startsWith("rgb")) {
          const rgb = color.match(/(\d+)/g);
          r = parseInt(rgb[0]) / 255;
          g = parseInt(rgb[1]) / 255;
          b = parseInt(rgb[2]) / 255;
        } else {
          throw new Error("Invalid color format");
        }
      
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
      
        if (max === min) {
          h = 6.2069;
          s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
      
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    _getBorderWidth(input) {
        let bwidth;
        if (input == '0' || input == 'none') {
            bwidth = '0px';
        } else if (input == null) {
            bwidth = Utils.getSettingSafe("defaultCardBorderWidth", '8px');
        } else if (!isNaN(Number(input))) {
            bwidth = input + 'px';
        } else {
            bwidth = input;
        }
        return bwidth;
    }

    _getBorderColor(input, borderWidth) {
        let bcolor;
        if (input) {
            bcolor = input;
        } else if (parseInt(borderWidth) == 0) {
            bcolor = '#fff296';
        } else {
            bcolor = Utils.getSettingSafe("defaultCardBorderColor", '#d29a38');
        }
        return bcolor;
    }

    _getGlowColor(input) {
        let gcolor;
        if (input) {
            gcolor = input;
        } else {
            gcolor = Utils.getSettingSafe("defaultCardGlowColor", `rgb(210 154 56 / 30%)`);
        }
        return gcolor;
    }
}

export default FancyDisplay;
