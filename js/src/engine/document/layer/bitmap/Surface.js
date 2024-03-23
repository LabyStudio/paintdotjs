class Surface {

    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = false;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear(color) {
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.fillStyle = color.toHex();
        this.context.fillRect(0, 0, this.width, this.height);
    }

    render(renderArgs, rectangle) {
        // Render surface to renderArgs.surface
        renderArgs.surface.context.drawImage(
            this.canvas,
            rectangle.x,
            rectangle.y,
            rectangle.width, rectangle.height,
            rectangle.x, rectangle.y,
            rectangle.width, rectangle.height
        );
    }
}