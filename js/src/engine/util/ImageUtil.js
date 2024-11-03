class ImageUtil {

    /**
     * With antialiasing if the image is scaled down
     */
    static drawImage(context, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        let scaleX = dWidth / sWidth
        let scaleY = dHeight / sHeight
        let steps = Math.ceil(Math.log(1 / Math.min(scaleX, scaleY)) / Math.log(2))

        if (steps <= 0) {
            context.imageSmoothingEnabled = false;
            context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        } else {
            let stepScaleX = Math.pow(scaleX, 1 / steps)
            let stepScaleY = Math.pow(scaleY, 1 / steps)

            let imageCanvas = document.createElement('canvas')
            let imageContext = imageCanvas.getContext('2d')
            let stepCanvas = document.createElement('canvas')
            let stepContext = stepCanvas.getContext('2d')

            imageCanvas.width = sWidth
            imageCanvas.height = sHeight
            imageContext.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight)

            context.imageSmoothingQuality = "high";
            context.imageSmoothingEnabled = true;

            imageContext.imageSmoothingQuality = "high";
            imageContext.imageSmoothingEnabled = true;

            stepContext.imageSmoothingQuality = "high";
            stepContext.imageSmoothingEnabled = true;

            for (let i = 0; i < steps; i++) {
                stepCanvas.width = imageCanvas.width * stepScaleX
                stepCanvas.height = imageCanvas.height * stepScaleY
                stepContext.drawImage(imageCanvas, 0, 0, stepCanvas.width, stepCanvas.height)

                imageCanvas.width = stepCanvas.width
                imageCanvas.height = stepCanvas.height
                imageContext.drawImage(stepCanvas, 0, 0, imageCanvas.width, imageCanvas.height)
            }

            context.drawImage(imageCanvas, dx, dy, dWidth, dHeight)
        }
    }

    static createTransparentPattern(context, size) {
        let patternCanvas = document.createElement('canvas');
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;

        // Render pattern
        let patternContext = patternCanvas.getContext('2d');
        patternContext.fillStyle = '#BFBFBF';
        patternContext.fillRect(0, 0, size, size);
        patternContext.fillRect(size, size, size, size);

        patternContext.fillStyle = '#FFFFFF';
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