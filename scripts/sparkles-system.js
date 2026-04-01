/* ===== POKER HAND HUD - SPARKLES SYSTEM ===== */
/**
 * @fileoverview Sparkles visual effects system for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { pokerHandGlobalState } from './constants.js';
import { Utils } from './utils.js';
import { StateManager } from './state-manager.js';

const SparklesSystem = {
    getRates() {
        const level = Utils.getSettingSafe("sparkleIntensity", "high");
        if (level === "low") return { base: 1100, hover: 520 };
        if (level === "high") return { base: 380, hover: 180 };
        return { base: 700, hover: 300 };
    },
    
    setup(container) {
        container.querySelector(".sparkle-layer")?.remove();
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

        const style = Utils.getSettingSafe("sparkleStyle", "embers");
        if (style === "none") return;

        const layer = document.createElement("div");
        layer.className = "sparkle-layer";
        container.appendChild(layer);
        const { base, hover } = this.getRates();

        const spawn = () => {
            if (StateManager.getGlobalCollapsed()) return;
            const W = layer.clientWidth || 1100;
            const x = Math.random() * (W - 80) + 40;
            const bottom = 2 + Math.random() * 12;

            const s = document.createElement("div");
            s.className = "sparkle";
            const size = 2.5 + Math.random() * 4.5;
            const dur = 1.1 + Math.random() * 1.3;
            const dx = (Math.random() - 0.5) * 36;
            const rot = (Math.random() * 360 - 180).toFixed(1);

            s.style.left = `${Math.round(x)}px`;
            s.style.bottom = `${Math.round(bottom)}px`;
            s.style.setProperty("--dx", `${dx}px`);
            s.style.setProperty("--dur", `${dur}s`);
            s.style.setProperty("--sc", `${0.9 + Math.random() * 0.6}`);
            s.style.setProperty("--rot", `${rot}deg`);

            this.createSparkleStyle(s, style, size);
            layer.appendChild(s);
            s.addEventListener("animationend", () => s.remove());
        };

        pokerHandGlobalState.sparkleInterval = setInterval(spawn, base);
        const enter = () => { 
            if (pokerHandGlobalState.sparkleInterval) clearInterval(pokerHandGlobalState.sparkleInterval);
            pokerHandGlobalState.sparkleInterval = setInterval(() => { 
                spawn(); 
                if (Math.random() < 0.5) spawn(); 
            }, hover);
        };
        const leave = () => { 
            if (pokerHandGlobalState.sparkleInterval) clearInterval(pokerHandGlobalState.sparkleInterval);
            pokerHandGlobalState.sparkleInterval = setInterval(spawn, base);
        };
        container.addEventListener("mouseenter", enter);
        container.addEventListener("mouseleave", leave);
        pokerHandGlobalState._sparkleHandlers = { enter, leave, container };
    },
    
    createSparkleStyle(element, style, size) {
        const makeTextSpark = (cls, char, color, fsMin=12, fsMax=20, shadow="0 0 8px rgba(255,255,255,0.35)") => {
            element.classList.add("text", cls);
            element.textContent = char;
            element.style.fontSize = `${Math.round(fsMin + Math.random() * (fsMax-fsMin))}px`;
            element.style.color = color;
            element.style.textShadow = shadow;
            element.style.mixBlendMode = "screen";
            element.style.userSelect = "none";
        };

        if (style === "gold" || style === "embers" || style === "blue") {
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.borderRadius = "50%";
            if (style === "gold") {
                element.style.background = "radial-gradient(circle, rgba(255,235,190,0.98) 0%, rgba(255,220,150,0.7) 45%, rgba(255,220,150,0.18) 70%, rgba(255,220,150,0) 100%)";
                element.style.boxShadow = "0 0 10px rgba(192,160,96,0.95), 0 0 20px rgba(192,160,96,0.5)";
            } else if (style === "embers") {
                element.style.background = "radial-gradient(circle, rgba(255,200,130,0.98) 0%, rgba(255,150,80,0.65) 45%, rgba(255,110,60,0.18) 70%, rgba(255,110,60,0) 100%)";
                element.style.boxShadow = "0 0 10px rgba(255,140,70,0.95), 0 0 20px rgba(255,140,70,0.5)";
            } else if (style === "blue") {
                element.style.background = "radial-gradient(circle, rgba(185,230,255,0.98) 0%, rgba(150,210,255,0.7) 45%, rgba(150,210,255,0.18) 70%, rgba(150,210,255,0) 100%)";
                element.style.boxShadow = "0 0 10px rgba(140,190,255,0.95), 0 0 20px rgba(140,190,255,0.5)";
            }
        } else if (style === "runes") {
            const runes = "ᚠᚢᚦᚨᚱᚲᚺᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛝᛟ";
            makeTextSpark("runes", runes[Math.floor(Math.random()*runes.length)], "rgba(255,230,170,0.95)", 12, 20, "0 0 10px rgba(255,220,150,0.8),0 0 20px rgba(192,160,96,0.6)");
        } else if (style === "petals") {
            const petals = ["❀","✿","❁","❃","❋"];
            makeTextSpark("petals", petals[Math.floor(Math.random()*petals.length)], "rgba(255,180,200,0.95)", 14, 22, "0 0 8px rgba(255,160,190,0.65)");
        } else if (style === "butterflies") {
            makeTextSpark("butterflies", "🦋", "rgba(180,220,255,0.95)", 16, 22, "0 0 10px rgba(150,210,255,0.6)");
            element.style.mixBlendMode = "lighter";
        } else if (style === "notes") {
            const notes = ["♪","♫","♩","♬"];
            makeTextSpark("notes", notes[Math.floor(Math.random()*notes.length)], "rgba(150,210,255,0.95)", 14, 22, "0 0 10px rgba(140,190,255,0.6)");
        } else if (style === "cards") {
            const suits = ["♠","♥","♦","♣"];
            const ch = suits[Math.floor(Math.random()*suits.length)];
            const color = (ch === "♥" || ch === "♦") ? "rgba(255,120,140,0.95)" : "rgba(220,235,255,0.95)";
            makeTextSpark("cards", ch, color, 14, 22, "0 0 10px rgba(255,255,255,0.35)");
            element.style.fontWeight = "900";
        } else if (style === "matrix") {
            const matrixChars = "アァカサタナハマヤャラワガザダバパイキシチニヒミリヰギジビピウゥク";
            makeTextSpark("matrix", matrixChars[Math.floor(Math.random()*matrixChars.length)], "rgba(80,255,120,0.95)", 12, 18, "0 0 8px rgba(80,255,120,0.7)");
            element.style.mixBlendMode = "lighter";
        } else if (style === "sakura") {
            makeTextSpark("sakura", "🌸", "rgba(255,210,220,0.95)", 14, 22, "0 0 10px rgba(255,190,210,0.6)");
        } else if (style === "bubbles") {
            element.style.width = `${size * 2}px`; 
            element.style.height = `${size * 2}px`; 
            element.style.borderRadius = "50%";
            element.style.background = "radial-gradient(circle, rgba(200,230,255,0.5) 0%, rgba(180,220,255,0.1) 70%, rgba(180,220,255,0) 100%)";
            element.style.border = "1px solid rgba(220,240,255,0.6)";
            element.style.boxShadow = "inset 0 0 8px rgba(200,230,255,0.3)";
        } else if (style === "gears") {
            const gears = ["⚙️","⚛"];
            makeTextSpark("gears", gears[Math.floor(Math.random()*gears.length)], "rgba(200,200,200,0.9)", 14, 20, "0 0 6px rgba(180,180,180,0.5)");
        } else if (style === "sparks") {
            element.style.width = `${size * 0.5}px`; 
            element.style.height = `${size * 2.5}px`; 
            element.style.borderRadius = "2px";
            element.style.background = "linear-gradient(180deg, rgba(255,240,200,1) 0%, rgba(255,180,100,1) 100%)";
            element.style.boxShadow = "0 0 10px rgba(255,200,100,0.9)";
        }
    },
    
    restart() {
        const container = document.getElementById("poker-hand-container");
        if (container) this.setup(container);
    }
};

export { SparklesSystem };
