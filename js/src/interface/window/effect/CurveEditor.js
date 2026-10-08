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

class CurveEditor {

    constructor(values, onChange, onCoordinatesChange) {
        this.values = values;
        this.onChange = onChange;
        this.onCoordinatesChange = onCoordinatesChange;

        this.channels = [];
        this.selectedChannels = new Map();
        this.dragging = [];
        this.pointerPoint = null;

        this.canvas = null;
    }

    buildElement() {
        let canvas = document.createElement("canvas");
        canvas.className = "effect-curve-editor";
        canvas.width = 354;
        canvas.height = 312;
        {
            canvas.onpointerdown = event => this.onPointerDown(event);
            canvas.onpointermove = event => this.onPointerMove(event);
            canvas.onpointerup = event => this.onPointerUp(event);
            canvas.onpointercancel = event => this.onPointerUp(event);
            canvas.onpointerleave = () => this.onPointerLeave();
            canvas.oncontextmenu = event => this.onContextMenu(event);
        }
        this.canvas = canvas;
        return canvas;
    }

    setChannels(channels) {
        this.channels = channels;
        for (const channel of channels) {
            if (!this.selectedChannels.has(channel.key)) {
                this.selectedChannels.set(channel.key, true);
            }
        }
        this.dragging = [];
        this.draw();
    }

    setChannelSelected(key, selected) {
        this.selectedChannels.set(key, selected);
        this.draw();
    }

    isChannelSelected(key) {
        return this.selectedChannels.get(key) !== false;
    }

    setCurve(key, points) {
        this.values[key] = this.normalizePoints(points);
        this.draw();
    }

    reset() {
        for (const channel of this.channels) {
            this.values[channel.key] = [[0, 0], [255, 255]];
        }
        this.draw();
        this.onChange(true);
    }

    draw() {
        if (this.canvas === null) {
            return;
        }

        let context = this.canvas.getContext("2d");
        let width = this.canvas.width;
        let height = this.canvas.height;
        context.clearRect(0, 0, width, height);

        // Background and guides
        context.fillStyle = EffectConfigDialog.themeColor("--color-curve-background", "#171717");
        context.fillRect(0, 0, width, height);
        context.strokeStyle = EffectConfigDialog.themeColor("--color-curve-grid", "#8b8b8b");
        context.lineWidth = 1;
        context.setLineDash([3, 2]);
        for (let index = 1; index < 4; ++index) {
            let x = Math.round((width - 1) * index / 4) + .5;
            let y = Math.round((height - 1) * index / 4) + .5;
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        context.beginPath();
        context.moveTo(0, height - 1);
        context.lineTo(width - 1, 0);
        context.stroke();
        context.setLineDash([]);

        // Pointer guides
        if (this.pointerPoint !== null) {
            let x = this.toCanvasX(this.pointerPoint[0]);
            let y = this.toCanvasY(this.pointerPoint[1]);
            context.save();
            context.globalAlpha = .45;
            context.beginPath();
            context.moveTo(x + .5, 0);
            context.lineTo(x + .5, height);
            context.moveTo(0, y + .5);
            context.lineTo(width, y + .5);
            context.stroke();
            context.restore();
        }

        // Curves and control points
        for (const channel of this.channels) {
            this.drawChannel(context, channel);
        }
    }

    drawChannel(context, channel) {
        let selected = this.isChannelSelected(channel.key);
        let lookup = BitmapEffectEngine.createCurveLookup(this.values[channel.key]);
        context.save();
        context.globalAlpha = selected ? 1 : .5;
        context.strokeStyle = channel.color;
        context.lineWidth = selected ? 2 : 1;
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(this.toCanvasX(0), this.toCanvasY(lookup[0]));
        for (let x = 1; x < lookup.length; ++x) {
            context.lineTo(this.toCanvasX(x), this.toCanvasY(lookup[x]));
        }
        context.stroke();

        for (const point of this.values[channel.key]) {
            let x = this.toCanvasX(point[0]);
            let y = this.toCanvasY(point[1]);
            context.fillStyle = selected ? channel.color : "#888";
            context.strokeStyle = selected ? "#fff" : "#444";
            context.lineWidth = 1;
            context.beginPath();
            context.arc(x, y, selected ? 4 : 2.5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
        }
        context.restore();
    }

    onPointerDown(event) {
        if (event.button !== MouseButton.LEFT) {
            return;
        }

        let point = this.getEventPoint(event);
        let nearest = this.findNearestPoints(point, true);
        this.dragging = [];
        if (nearest.length === 0) {
            for (const channel of this.channels) {
                if (!this.isChannelSelected(channel.key)) {
                    continue;
                }
                let points = this.values[channel.key];
                let existing = points.find(existingPoint => existingPoint[0] === point[0]);
                if (existing === undefined) {
                    existing = [...point];
                    points.push(existing);
                    points.sort((a, b) => a[0] - b[0]);
                }
                this.dragging.push({channel, x: existing[0]});
            }
        } else {
            this.dragging = nearest.map(item => ({channel: item.channel, x: item.point[0]}));
        }

        if (this.dragging.length === 0) {
            return;
        }
        this.canvas.setPointerCapture(event.pointerId);
        this.moveDraggingPoints(point);
    }

    onPointerMove(event) {
        let point = this.getEventPoint(event);
        this.pointerPoint = point;
        this.onCoordinatesChange(point);
        if (this.dragging.length !== 0) {
            this.moveDraggingPoints(point);
        } else {
            this.draw();
        }
    }

    onPointerUp(event) {
        if (this.canvas.hasPointerCapture(event.pointerId)) {
            this.canvas.releasePointerCapture(event.pointerId);
        }
        this.dragging = [];
    }

    onPointerLeave() {
        if (this.dragging.length !== 0) {
            return;
        }
        this.pointerPoint = null;
        this.onCoordinatesChange(null);
        this.draw();
    }

    onContextMenu(event) {
        event.preventDefault();
        let nearest = this.findNearestPoints(this.getEventPoint(event), true);
        let changed = false;
        for (const item of nearest) {
            if (item.point[0] === 0 || item.point[0] === 255) {
                continue;
            }
            let points = this.values[item.channel.key];
            points.splice(points.indexOf(item.point), 1);
            changed = true;
        }
        if (changed) {
            this.draw();
            this.onChange(true);
        }
    }

    moveDraggingPoints(point) {
        let nextDragging = [];
        for (const item of this.dragging) {
            let points = this.values[item.channel.key];
            let index = points.findIndex(existingPoint => existingPoint[0] === item.x);
            if (index === -1) {
                continue;
            }

            let x = point[0];
            if (index === 0) {
                x = 0;
            } else if (index === points.length - 1) {
                x = 255;
            } else {
                x = Math.max(points[index - 1][0] + 1, Math.min(points[index + 1][0] - 1, x));
            }
            points[index] = [x, point[1]];
            nextDragging.push({channel: item.channel, x});
        }
        this.dragging = nextDragging;
        this.draw();
        this.onChange();
    }

    findNearestPoints(point, selectedOnly) {
        let nearest = [];
        for (const channel of this.channels) {
            if (selectedOnly && !this.isChannelSelected(channel.key)) {
                continue;
            }
            let bestPoint = null;
            let bestDistance = 8;
            for (const candidate of this.values[channel.key]) {
                let distance = Math.hypot(
                    this.toCanvasX(candidate[0]) - this.toCanvasX(point[0]),
                    this.toCanvasY(candidate[1]) - this.toCanvasY(point[1])
                );
                if (distance < bestDistance) {
                    bestPoint = candidate;
                    bestDistance = distance;
                }
            }
            if (bestPoint !== null) {
                nearest.push({channel, point: bestPoint});
            }
        }
        return nearest;
    }

    getEventPoint(event) {
        let bounds = this.canvas.getBoundingClientRect();
        return [
            Math.round(Utility.clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * 255),
            Math.round(Utility.clamp((bounds.bottom - event.clientY) / bounds.height, 0, 1) * 255)
        ];
    }

    toCanvasX(value) {
        return value / 255 * (this.canvas.width - 1);
    }

    toCanvasY(value) {
        return (255 - value) / 255 * (this.canvas.height - 1);
    }

    normalizePoints(points) {
        return points
            .map(point => [
                Math.round(Utility.clamp(Number(point[0]), 0, 255)),
                Math.round(Utility.clamp(Number(point[1]), 0, 255))
            ])
            .sort((a, b) => a[0] - b[0]);
    }
}
