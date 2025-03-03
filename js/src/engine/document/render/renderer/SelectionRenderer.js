class SelectionRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox, selection) {
        super(surfaceBox);

        this.selection = selection;
        this.selection.changed.add(this.onSelectionChanged.bind(this));

        this.selectedPath = null;
        this.timeInitialized = Date.now();
    }

    render(destination, renderBounds) {
        let selectedPath = this.selectedPath;
        if (selectedPath === null || selectedPath.isEmpty()) {
            return;
        }

        this.renderSelection(destination, renderBounds, selectedPath);
    }

    renderSelection(destination, renderBounds, selectedPath) {
        let context = destination.getContext();
        context.save();

        // Draw tint fill
        this.renderPath(context, renderBounds, selectedPath, {
            color: 'rgba(34, 97, 196, 0.3)',
            fill: true
        });

        // Draw black outline
        this.renderPath(context, renderBounds, selectedPath, {
            color: "rgba(0, 0, 0, 0.6)",
            lineWidth: 1
        });

        // Draw marching ants (white dashed outline)
        let antsOffset = -(Date.now() - this.timeInitialized) / 30 % 8;
        this.renderPath(context, renderBounds, selectedPath, {
            color: "white",
            dashPattern: [4, 4],
            antsOffset: antsOffset,
            lineWidth: 1
        });

        context.restore();
    }

    renderPath(context, renderBounds, selectedPath, options) {
        let surface = this.surfaceBox.getSurface();
        let scaleX = renderBounds.getWidth() / surface.getWidth();
        let scaleY = renderBounds.getHeight() / surface.getHeight();

        context.strokeStyle = options.color || "black";
        context.fillStyle = options.color || "black";
        context.lineWidth = options.lineWidth || 1;

        if (options.dashPattern) {
            context.setLineDash(options.dashPattern);
            context.lineDashOffset = options.antsOffset || 0;
        } else {
            context.setLineDash([]);
        }

        for (let vertexList of selectedPath.getVertexLists()) {
            context.beginPath();

            let vertices = vertexList.getVertices();
            for (let i = 0; i < vertices.length; i++) {
                let point = vertices[i];
                let x = point.x * scaleX + renderBounds.getX();
                let y = point.y * scaleY + renderBounds.getY();

                if (i === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }
            context.closePath();

            if (options.fill) {
                context.fill();
            } else {
                context.stroke();
            }
        }
    };

    onSelectionChanged() {
        let path = this.selection.createPath();

        if (this.selectedPath !== null) {
            this.selectedPath.dispose();
        }

        this.selectedPath = path;
    }

}