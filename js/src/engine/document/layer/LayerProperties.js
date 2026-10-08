/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class LayerProperties {

    static BLEND_MODES = Object.freeze([
        {value: "normal", label: "Normal", pdnValue: 0, canvasOperation: "source-over"},
        {value: "multiply", label: "Multiply", pdnValue: 1, canvasOperation: "multiply"},
        {value: "additive", label: "Additive", pdnValue: 2, canvasOperation: "lighter"},
        {value: "colorBurn", label: "Color Burn", pdnValue: 3, canvasOperation: "color-burn"},
        {value: "colorDodge", label: "Color Dodge", pdnValue: 4, canvasOperation: "color-dodge"},
        {value: "reflect", label: "Reflect", pdnValue: 5, canvasOperation: null},
        {value: "glow", label: "Glow", pdnValue: 6, canvasOperation: null},
        {value: "overlay", label: "Overlay", pdnValue: 7, canvasOperation: "overlay"},
        {value: "difference", label: "Difference", pdnValue: 8, canvasOperation: "difference"},
        {value: "negation", label: "Negation", pdnValue: 9, canvasOperation: null},
        {value: "lighten", label: "Lighten", pdnValue: 10, canvasOperation: "lighten"},
        {value: "darken", label: "Darken", pdnValue: 11, canvasOperation: "darken"},
        {value: "screen", label: "Screen", pdnValue: 12, canvasOperation: "screen"},
        {value: "xor", label: "Xor", pdnValue: 13, canvasOperation: null}
    ]);

    constructor(name, visible, isBackground, opacity, blendMode = "normal") {
        this.name = name;
        this.visible = visible;
        this.isBackground = isBackground;
        this.opacity = opacity;
        this.blendMode = blendMode;
    }

    clone() {
        return new LayerProperties(
            this.name,
            this.visible,
            this.isBackground,
            this.opacity,
            this.blendMode
        );
    }

    static getBlendMode(value) {
        return this.BLEND_MODES.find(mode => mode.value === value || mode.pdnValue === value)
            || this.BLEND_MODES[0];
    }

    static areEqual(left, right) {
        return left.name === right.name
            && left.visible === right.visible
            && left.isBackground === right.isBackground
            && left.opacity === right.opacity
            && this.getBlendMode(left.blendMode).value === this.getBlendMode(right.blendMode).value;
    }
}
