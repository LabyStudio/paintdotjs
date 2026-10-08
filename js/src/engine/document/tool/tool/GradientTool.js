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

class GradientTool extends PreviewShapeTool {
    constructor(type) {
        super(type, "gradient");
        this.gradientCanvas = null;
        this.gradientGl = null;
        this.gradientProgram = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("gradient_tool_cursor");
    }

    onDeactivate() {
        this.disposeGradientRenderer();
        super.onDeactivate();
    }

    renderPreview() {
        const surface = this.getActiveLayer().getSurface();
        surface.copySurface(this.scratchSurface);
        const context = surface.context;
        const points = [this.startPoint.clone(), this.endPoint.clone()];
        this.shapeTransform.transformPoints(points);
        const start = points[0];
        const end = points[1];
        const primaryColor = this.getColor(this.button);
        const secondaryColor = this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT);
        const transparencyMode = this.getSetting("gradientMode", "color") === "transparency";
        let primary;
        let secondary;
        if (transparencyMode) {
            const startAlpha = this.button === MouseButton.RIGHT
                ? 1 - primaryColor.alpha / 255 : primaryColor.alpha / 255;
            const endAlpha = this.button === MouseButton.RIGHT
                ? secondaryColor.alpha / 255 : 1 - secondaryColor.alpha / 255;
            primary = [0, 0, 0, startAlpha];
            secondary = [0, 0, 0, endAlpha];
        } else {
            primary = [primaryColor.red / 255, primaryColor.green / 255,
                primaryColor.blue / 255, primaryColor.alpha / 255];
            secondary = [secondaryColor.red / 255, secondaryColor.green / 255,
                secondaryColor.blue / 255, secondaryColor.alpha / 255];
        }

        context.save();
        this.clipToSelection(context);
        context.globalCompositeOperation = transparencyMode ? "destination-in" : this.getCompositeOperation();
        const gradientCanvas = this.renderGradientCanvas(
            surface.width, surface.height, start, end, primary, secondary,
            this.getSetting("gradientType", "linear"), this.getSetting("repeatMode", "none")
        );
        if (gradientCanvas !== null) {
            context.drawImage(gradientCanvas, 0, 0);
        } else {
            this.renderCanvasFallback(context, surface, start, end, primary, secondary);
        }
        context.restore();
        this.lastPoint = end.clone();
        this.changedBounds = this.getSelection().isEmpty()
            ? surface.getBounds() : this.getSelection().getBounds();
        this.markBitmapTransactionDirty(this.changedBounds);
        this.getActiveLayer().invalidate(this.getClippedChangedBounds());
        return true;
    }

    ensureGradientRenderer(width, height) {
        if (this.gradientGl === null) {
            this.gradientCanvas = document.createElement("canvas");
            this.gradientGl = this.gradientCanvas.getContext("webgl2", {
                alpha: true, antialias: false, premultipliedAlpha: false,
                preserveDrawingBuffer: true
            });
            if (this.gradientGl === null) {
                return false;
            }
            const vertexSource = `#version 300 es
                void main() {
                    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
                    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
                }`;
            const fragmentSource = `#version 300 es
                precision highp float;
                uniform vec2 resolution;
                uniform vec2 startPoint;
                uniform vec2 endPoint;
                uniform vec4 color0;
                uniform vec4 color1;
                uniform int gradientType;
                uniform int repeatMode;
                out vec4 outputColor;
                const float PI = 3.141592653589793;
                void main() {
                    vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
                    vec2 axis = endPoint - startPoint;
                    float axisLength = max(length(axis), 0.0001);
                    vec2 unitAxis = axis / axisLength;
                    vec2 delta = p - startPoint;
                    float along = dot(delta, unitAxis) / axisLength;
                    float across = dot(delta, vec2(-unitAxis.y, unitAxis.x)) / axisLength;
                    float t;
                    if (gradientType == 1) t = abs(along);
                    else if (gradientType == 2) t = abs(along) + abs(across);
                    else if (gradientType == 3) t = length(delta) / axisLength;
                    else if (gradientType == 4) {
                        t = fract((atan(across, along) / (2.0 * PI)) + 1.0);
                    } else if (gradientType == 5) {
                        t = fract((atan(across, along) / (2.0 * PI)) + length(delta) / axisLength + 1.0);
                    } else if (gradientType == 6) {
                        t = fract((-atan(across, along) / (2.0 * PI)) + length(delta) / axisLength + 1.0);
                    } else t = along;
                    if (repeatMode == 1) t = fract(t);
                    else if (repeatMode == 2) t = 1.0 - abs(mod(t, 2.0) - 1.0);
                    else t = clamp(t, 0.0, 1.0);
                    outputColor = mix(color0, color1, t);
                }`;
            const compile = (type, source) => {
                const shader = this.gradientGl.createShader(type);
                this.gradientGl.shaderSource(shader, source);
                this.gradientGl.compileShader(shader);
                if (!this.gradientGl.getShaderParameter(shader, this.gradientGl.COMPILE_STATUS)) {
                    return null;
                }
                return shader;
            };
            const vertex = compile(this.gradientGl.VERTEX_SHADER, vertexSource);
            const fragment = compile(this.gradientGl.FRAGMENT_SHADER, fragmentSource);
            if (vertex === null || fragment === null) {
                this.disposeGradientRenderer();
                return false;
            }
            this.gradientProgram = this.gradientGl.createProgram();
            this.gradientGl.attachShader(this.gradientProgram, vertex);
            this.gradientGl.attachShader(this.gradientProgram, fragment);
            this.gradientGl.linkProgram(this.gradientProgram);
            this.gradientGl.deleteShader(vertex);
            this.gradientGl.deleteShader(fragment);
            if (!this.gradientGl.getProgramParameter(this.gradientProgram, this.gradientGl.LINK_STATUS)) {
                this.disposeGradientRenderer();
                return false;
            }
        }
        if (this.gradientCanvas.width !== width || this.gradientCanvas.height !== height) {
            this.gradientCanvas.width = width;
            this.gradientCanvas.height = height;
        }
        return true;
    }

    renderGradientCanvas(width, height, start, end, primary, secondary, type, repeat) {
        if (!this.ensureGradientRenderer(width, height)) {
            return null;
        }
        const gl = this.gradientGl;
        const program = this.gradientProgram;
        const types = {linear: 0, reflected: 1, diamond: 2, radial: 3, conical: 4, spiral: 5, spiralCounter: 6};
        const repeats = {none: 0, wrapped: 1, reflected: 2};
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.uniform2f(gl.getUniformLocation(program, "resolution"), width, height);
        gl.uniform2f(gl.getUniformLocation(program, "startPoint"), start.x, start.y);
        gl.uniform2f(gl.getUniformLocation(program, "endPoint"), end.x, end.y);
        gl.uniform4fv(gl.getUniformLocation(program, "color0"), primary);
        gl.uniform4fv(gl.getUniformLocation(program, "color1"), secondary);
        gl.uniform1i(gl.getUniformLocation(program, "gradientType"), types[type] ?? 0);
        gl.uniform1i(gl.getUniformLocation(program, "repeatMode"), repeats[repeat] ?? 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.finish();
        return this.gradientCanvas;
    }

    renderCanvasFallback(context, surface, start, end, primary, secondary) {
        const color = value => `rgba(${Math.round(value[0] * 255)},${Math.round(value[1] * 255)},`
            + `${Math.round(value[2] * 255)},${value[3]})`;
        const type = this.getSetting("gradientType", "linear");
        let gradient;
        if (type === "radial" || type === "diamond") {
            gradient = context.createRadialGradient(start.x, start.y, 0, start.x, start.y,
                Math.max(1, Utility.distance(start, end)));
        } else {
            gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
        }
        gradient.addColorStop(0, color(primary));
        gradient.addColorStop(1, color(secondary));
        context.fillStyle = gradient;
        context.fillRect(0, 0, surface.width, surface.height);
    }

    disposeGradientRenderer() {
        if (this.gradientGl !== null && this.gradientProgram !== null) {
            this.gradientGl.deleteProgram(this.gradientProgram);
        }
        this.gradientProgram = null;
        this.gradientGl = null;
        this.gradientCanvas = null;
    }

    getPreviewBounds() {
        return this.getActiveLayer().getBounds();
    }
}
