class ImageUtil {

    /**
     * With antialiasing if the image is scaled down
     */
    static drawImage(context, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        const downscaling = dWidth < sWidth || dHeight < sHeight;
        context.save();
        context.imageSmoothingEnabled = downscaling;
        context.imageSmoothingQuality = downscaling ? "high" : "low";
        context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        context.restore();
    }

    static createTransparentPattern(context, size, brightness = 1) {
        let patternCanvas = document.createElement('canvas');
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;

        // Render pattern
        let patternContext = patternCanvas.getContext('2d');
        const light = Math.round(255 * brightness);
        const dark = Math.round(191 * brightness);
        patternContext.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
        patternContext.fillRect(0, 0, size, size);
        patternContext.fillRect(size, size, size, size);

        patternContext.fillStyle = `rgb(${light}, ${light}, ${light})`;
        patternContext.fillRect(size, 0, size, size);
        patternContext.fillRect(0, size, size, size);

        return context.createPattern(patternCanvas, 'repeat');
    }

    static createDirtyStar(size = 32) {
        const scale = size / 32;

        const color = "#FFA500";
        const thickness = 3 * scale;

        const outlineColor = "#FFFFFF";
        const outlineThickness = 8 * scale;

        let amount = 8;

        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        let ctx = canvas.getContext("2d");
        ctx.save();
        ctx.imageSmoothingEnabled = true;

        const left = 0;
        const top = 0;
        const right = canvas.width;
        const bottom = canvas.height;

        const radius = Math.min((right - left) / 2.0, (bottom - top) / 2.0);
        const centerPoint = {
            x: (left + right) / 2.0,
            y: (top + bottom) / 2.0
        };

        // Calculate points for a star shape
        const lines = [];
        for (let i = 0; i < amount; i++) {
            const rotation = i * 2 * Math.PI / amount;
            const x = centerPoint.x + radius * Math.sin(rotation);
            const y = centerPoint.y + radius * Math.cos(rotation);
            lines.push(centerPoint);
            lines.push({
                x: x,
                y: y
            });
        }

        // Draw lines with outer pen
        ctx.lineWidth = outlineThickness;
        ctx.strokeStyle = outlineColor;
        for (let i = 0; i < lines.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(lines[i].x, lines[i].y);
            ctx.lineTo(lines[i + 1].x, lines[i + 1].y);
            ctx.stroke();
        }

        // Draw lines with inner pen
        ctx.lineWidth = thickness;
        ctx.strokeStyle = color;
        for (let i = 0; i < lines.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(lines[i].x, lines[i].y);
            ctx.lineTo(lines[i + 1].x, lines[i + 1].y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw white dot in middle
        ctx.fillStyle = outlineColor;
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, 3 * scale, 0, 2 * Math.PI);
        ctx.fill();

        return canvas.toDataURL();
    }

}
