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

}