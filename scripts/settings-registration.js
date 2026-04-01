/* ===== POKER HAND HUD - SETTINGS REGISTRATION ===== */
/**
 * @fileoverview Settings registration for Poker Hand HUD
 * @author Poker Hand HUD Team
 * @version 2.0.0
 */

import { MODULE_ID } from './constants.js';
import { Utils } from './utils.js';
import { SFX } from './sound-effects.js';
import { StateManager } from './state-manager.js';

Hooks.on("init", () => {
    // Basic settings
    game.settings.register(MODULE_ID, "enabled", {
        name: "POKER_HUD.Settings.Enabled.Name",
        hint: "POKER_HUD.Settings.Enabled.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => Utils.scheduleRebuild(true)
    });

    // Hand assignments setting
    game.settings.register(MODULE_ID, "handAssignments", {
        name: "POKER_HUD.Settings.HandAssignments.Name",
        hint: "POKER_HUD.Settings.HandAssignments.Hint",
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register(MODULE_ID, "clientOptOut", {
        name: "POKER_HUD.Settings.ClientOptOut.Name",
        hint: "POKER_HUD.Settings.ClientOptOut.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Utils.scheduleRebuild(true)
    });

    // Card selection dialog settings
    game.settings.register(MODULE_ID, "cardSelectionCloseDelay", {
        name: "POKER_HUD.Settings.CardSelectionCloseDelay.Name",
        hint: "POKER_HUD.Settings.CardSelectionCloseDelay.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 8,
        min: 1,
        max: 30,
        step: 1
    });

    game.settings.register(MODULE_ID, "cardSelectionScale", {
        name: "POKER_HUD.Settings.CardSelectionScale.Name",
        hint: "POKER_HUD.Settings.CardSelectionScale.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1.35,
        min: 1.0,
        max: 2.0,
        step: 0.05
    });

    game.settings.register(MODULE_ID, "hudCardScale", {
        name: "POKER_HUD.Settings.HudCardScale.Name",
        hint: "POKER_HUD.Settings.HudCardScale.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1.35,
        min: 1.0,
        max: 2.0,
        step: 0.05
    });

    // Visual settings
    game.settings.register(MODULE_ID, "hudBgColor", {
        name: "POKER_HUD.Settings.HudBgColor.Name",
        scope: "world",
        config: true,
        type: String,
        default: "rgba(20,15,10,0.85)",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "accentColor", {
        name: "POKER_HUD.Settings.AccentColor.Name",
        scope: "world",
        config: true,
        type: String,
        default: "#c0a060",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "labelColor", {
        name: "POKER_HUD.Settings.LabelColor.Name",
        scope: "world",
        config: true,
        type: String,
        default: "#d4c5a0",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "textColor", {
        name: "POKER_HUD.Settings.TextColor.Name",
        scope: "world",
        config: true,
        type: String,
        default: "#f0e6d2",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "selectedGlowColor", {
        name: "POKER_HUD.Settings.SelectedGlowColor.Name",
        scope: "world",
        config: true,
        type: String,
        default: "rgba(255,200,100,0.6)",
        onChange: () => Utils.scheduleRebuild(false)
    });

    // Layout settings
    game.settings.register(MODULE_ID, "handMaxVisible", {
        name: "POKER_HUD.Settings.HandMaxVisible.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 7,
        range: { min: 3, max: 10, step: 1 },
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "handSpacing", {
        name: "POKER_HUD.Settings.HandSpacing.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 105,
        range: { min: 80, max: 150, step: 5 },
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "handArc", {
        name: "POKER_HUD.Settings.HandArc.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 5,
        range: { min: 0, max: 20, step: 1 },
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "handRotation", {
        name: "POKER_HUD.Settings.HandRotation.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 5,
        range: { min: 0, max: 15, step: 1 },
        onChange: () => Utils.scheduleRebuild(true)
    });

    // Bookmark settings
    game.settings.register(MODULE_ID, "bookmarkEnabled", {
        name: "POKER_HUD.Settings.BookmarkEnabled.Name",
        hint: "POKER_HUD.Settings.BookmarkEnabled.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "bookmarkTopPercent", {
        name: "POKER_HUD.Settings.BookmarkTopPercent.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 60,
        range: { min: 5, max: 95, step: 1 },
        onChange: () => globalThis.updateBookmarkPosition()
    });

    // Sparkle settings
    game.settings.register(MODULE_ID, "sparkleStyle", {
        name: "POKER_HUD.Settings.SparkleStyle.Name",
        scope: "client",
        config: true,
        type: String,
        default: "cards",
        choices: {
            "none": "POKER_HUD.Settings.SparkleStyle.Choices.None",
            "cards": "POKER_HUD.Settings.SparkleStyle.Choices.Cards",
            "gold": "POKER_HUD.Settings.SparkleStyle.Choices.Gold",
            "embers": "POKER_HUD.Settings.SparkleStyle.Choices.Embers"
        },
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "sparkleIntensity", {
        name: "POKER_HUD.Settings.SparkleIntensity.Name",
        scope: "client",
        config: true,
        type: String,
        default: "high",
        choices: {
            "low": "POKER_HUD.Settings.SparkleIntensity.Choices.Low",
            "medium": "POKER_HUD.Settings.SparkleIntensity.Choices.Medium",
            "high": "POKER_HUD.Settings.SparkleIntensity.Choices.High"
        },
        onChange: () => Utils.scheduleRebuild(false)
    });

    // Collapse settings
    game.settings.register(MODULE_ID, "collapseEnabled", {
        name: "POKER_HUD.Settings.CollapseEnabled.Name",
        hint: "POKER_HUD.Settings.CollapseEnabled.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "sleepHudOnly", {
        name: "POKER_HUD.Settings.SleepHudOnly.Name",
        hint: "POKER_HUD.Settings.SleepHudOnly.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => globalThis.applyGlobalCollapse()
    });

    game.settings.register(MODULE_ID, "handRetractDelay", {
        name: "POKER_HUD.Settings.HandRetractDelay.Name",
        hint: "POKER_HUD.Settings.HandRetractDelay.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1000,
        range: { min: 0, max: 5000, step: 100 },
        onChange: () => Utils.scheduleRebuild(false)
    });

    // SFX settings
    game.settings.register(MODULE_ID, "sfxEnabled", {
        name: "POKER_HUD.Settings.SfxEnabled.Name",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => { SFX.load(); }
    });

    game.settings.register(MODULE_ID, "sfxVolume", {
        name: "POKER_HUD.Settings.SfxVolume.Name",
        scope: "client",
        config: true,
        type: Number,
        default: 0.85,
        range: { min: 0, max: 1, step: 0.05 },
        onChange: () => { SFX.load(); }
    });

    game.settings.register(MODULE_ID, "enableDisplayOnUse", {
        name: "POKER_HUD.Settings.EnableDisplayOnUse.Name",
        hint: "POKER_HUD.Settings.EnableDisplayOnUse.Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(MODULE_ID, "sfxHoverUrl", {
        name: "POKER_HUD.Settings.SfxHoverUrl.Name",
        scope: "client",
        config: true,
        type: String,
        default: "",
        filePicker: "audio",
        onChange: () => { SFX.load(); }
    });

    game.settings.register(MODULE_ID, "sfxClickUrl", {
        name: "POKER_HUD.Settings.SfxClickUrl.Name",
        scope: "client",
        config: true,
        type: String,
        default: "",
        filePicker: "audio",
        onChange: () => { SFX.load(); }
    });

    game.settings.register(MODULE_ID, "sfxUseUrl", {
        name: "POKER_HUD.Settings.SfxUseUrl.Name",
        scope: "client",
        config: true,
        type: String,
        default: "",
        filePicker: "audio",
        onChange: () => { SFX.load(); }
    });

    // Card management settings
    game.settings.register(MODULE_ID, "removeCardAfterUse", {
        name: "POKER_HUD.Settings.RemoveCardAfterUse.Name",
        hint: "POKER_HUD.Settings.RemoveCardAfterUse.Hint",
        scope: "world",
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "returnToMainDeck", {
        name: "POKER_HUD.Settings.ReturnToMainDeck.Name",
        hint: "POKER_HUD.Settings.ReturnToMainDeck.Hint",
        scope: "world",
        config: false,
        type: Boolean,
        default: true
    });

    // Visual customization settings
    game.settings.register(MODULE_ID, "cardBaseImageUrl", {
        name: "POKER_HUD.Settings.CardBaseImageUrl.Name",
        hint: "POKER_HUD.Settings.CardBaseImageUrl.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "",
        filePicker: "image",
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "cardMaskImageUrl", {
        name: "POKER_HUD.Settings.CardMaskImageUrl.Name",
        hint: "POKER_HUD.Settings.CardMaskImageUrl.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "",
        filePicker: "image",
        onChange: () => Utils.scheduleRebuild(true)
    });

    game.settings.register(MODULE_ID, "cardBackImageUrl", {
        name: "POKER_HUD.Settings.CardBackImageUrl.Name",
        hint: "POKER_HUD.Settings.CardBackImageUrl.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "",
        filePicker: "image",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "clientBackCustomUrl", {
        name: "POKER_HUD.Settings.ClientBackCustomUrl.Name",
        hint: "POKER_HUD.Settings.ClientBackCustomUrl.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        filePicker: "image",
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "tiltMax", {
        name: "POKER_HUD.Settings.TiltMax.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 6,
        range: { min: 0, max: 15, step: 1 },
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "disableTilt", {
        name: "POKER_HUD.Settings.DisableTilt.Name",
        hint: "POKER_HUD.Settings.DisableTilt.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "disableGradientMask", {
        name: "POKER_HUD.Settings.DisableGradientMask.Name",
        hint: "POKER_HUD.Settings.DisableGradientMask.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "alwaysShowShadow", {
        name: "POKER_HUD.Settings.AlwaysShowShadow.Name",
        hint: "POKER_HUD.Settings.AlwaysShowShadow.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "hoverScale", {
        name: "POKER_HUD.Settings.HoverScale.Name",
        scope: "world",
        config: true,
        type: Number,
        default: 1.35,
        range: { min: 1.05, max: 1.4, step: 0.01 },
        onChange: () => Utils.scheduleRebuild(false)
    });

    game.settings.register(MODULE_ID, "hoverLift", {
        name: "POKER_HUD.Settings.HoverLift.Name",
        scope: "world",
        config: true,
        type: Number,
        default: -120,
        range: { min: -200, max: 0, step: 2 },
        onChange: () => Utils.scheduleRebuild(false)
    });

    // User hand assignment settings
    game.settings.register(MODULE_ID, "enableUserHandAssignment", {
        name: "POKER_HUD.Settings.EnableUserHandAssignment.Name",
        hint: "POKER_HUD.Settings.EnableUserHandAssignment.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "handAssignmentMode", {
        name: "POKER_HUD.Settings.HandAssignmentMode.Name",
        hint: "POKER_HUD.Settings.HandAssignmentMode.Hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "manual": "POKER_HUD.Settings.HandAssignmentMode.Choices.Manual",
            "smart": "POKER_HUD.Settings.HandAssignmentMode.Choices.Smart",
            "name": "POKER_HUD.Settings.HandAssignmentMode.Choices.Name",
            "flags": "POKER_HUD.Settings.HandAssignmentMode.Choices.Flags",
            "first": "POKER_HUD.Settings.HandAssignmentMode.Choices.First"
        },
        default: "manual"
    });

    game.settings.register(MODULE_ID, "gmHandPrefix", {
        name: "POKER_HUD.Settings.GmHandPrefix.Name",
        hint: "POKER_HUD.Settings.GmHandPrefix.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "GM"
    });

    game.settings.register(MODULE_ID, "dealCardsFaceDown", {
        name: "POKER_HUD.Settings.DealCardsFaceDown.Name",
        hint: "POKER_HUD.Settings.DealCardsFaceDown.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        restricted: true
    });

    game.settings.register(MODULE_ID, "cardBackStyle", {
        name: "POKER_HUD.Settings.CardBackStyle.Name",
        hint: "POKER_HUD.Settings.CardBackStyle.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "dark",
        choices: {
            "dark": "POKER_HUD.Settings.CardBackStyle.Choices.Dark",
            "light": "POKER_HUD.Settings.CardBackStyle.Choices.Light"
        },
        restricted: true
    });

    // ===== FANCY DISPLAY SETTINGS =====
    game.settings.register(MODULE_ID, "enableFancyDisplay", {
        name: "POKER_HUD.Settings.EnableFancyDisplay.Name",
        hint: "POKER_HUD.Settings.EnableFancyDisplay.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "defaultCardBackImage", {
        name: "POKER_HUD.Settings.DefaultCardBackImage.Name",
        hint: "POKER_HUD.Settings.DefaultCardBackImage.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "systems/dnd5e/ui/cards/back.webp",
        filePicker: "image"
    });

    game.settings.register(MODULE_ID, "defaultCardBorderWidth", {
        name: "POKER_HUD.Settings.DefaultCardBorderWidth.Name",
        hint: "POKER_HUD.Settings.DefaultCardBorderWidth.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "8px"
    });

    game.settings.register(MODULE_ID, "defaultCardBorderColor", {
        name: "POKER_HUD.Settings.DefaultCardBorderColor.Name",
        hint: "POKER_HUD.Settings.DefaultCardBorderColor.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "#d29a38"
    });

    game.settings.register(MODULE_ID, "defaultCardGlowColor", {
        name: "POKER_HUD.Settings.DefaultCardGlowColor.Name",
        hint: "POKER_HUD.Settings.DefaultCardGlowColor.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "rgb(210 154 56 / 30%)"
    });

    game.settings.register(MODULE_ID, "enableDramaticRevealOnDraw", {
        name: "POKER_HUD.Settings.EnableDramaticRevealOnDraw.Name",
        hint: "POKER_HUD.Settings.EnableDramaticRevealOnDraw.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_ID, "dramaticRevealDelay", {
        name: "POKER_HUD.Settings.DramaticRevealDelay.Name",
        hint: "POKER_HUD.Settings.DramaticRevealDelay.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1000,
        min: 0,
        max: 5000,
        step: 100
    });

    game.settings.register(MODULE_ID, "whatDeterminesCardFaceOnDraw", {
        name: "POKER_HUD.Settings.WhatDeterminesCardFaceOnDraw.Name",
        hint: "POKER_HUD.Settings.WhatDeterminesCardFaceOnDraw.Hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "source": "POKER_HUD.Settings.WhatDeterminesCardFaceOnDraw.Choices.Source",
            "alwaysup": "POKER_HUD.Settings.WhatDeterminesCardFaceOnDraw.Choices.AlwaysUp",
            "alwaysdown": "POKER_HUD.Settings.WhatDeterminesCardFaceOnDraw.Choices.AlwaysDown"
        },
        default: "source"
    });

    game.settings.register(MODULE_ID, "enableDisplayOnDraw", {
        name: "POKER_HUD.Settings.EnableDisplayOnDraw.Name",
        hint: "POKER_HUD.Settings.EnableDisplayOnDraw.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "enableWhisperCardTextToDM", {
        name: "POKER_HUD.Settings.EnableWhisperCardTextToDM.Name",
        hint: "POKER_HUD.Settings.EnableWhisperCardTextToDM.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_ID, "playersCanShareToAll", {
        name: "POKER_HUD.Settings.PlayersCanShareToAll.Name",
        hint: "POKER_HUD.Settings.PlayersCanShareToAll.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        restricted: true
    });

    game.settings.register(MODULE_ID, "enableCardIconClick", {
        name: "POKER_HUD.Settings.EnableCardIconClick.Name",
        hint: "POKER_HUD.Settings.EnableCardIconClick.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
});