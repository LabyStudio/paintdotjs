class TextTool extends DrawingTool {
    constructor(type) {
        super(type, 1, false);
        this.pending = false;
        this.textOrigin = null;
        this.button = MouseButton.LEFT;
        this.editor = null;
        this.caretElement = null;
        this.previewBounds = null;
        this.originNub = null;
        this.tracking = false;
        this.dragStart = null;
        this.originStart = null;
    }

    usesContinuousPointerCoordinates() {
        return this.pending || this.tracking;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("text_tool_cursor");
    }

    onDeactivate() {
        if (this.pending) this.commitPending();
        this.destroyEditor();
        super.onDeactivate();
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) return false;
        const point = new Point(x, y);
        // Paint.NET moves active text with the right mouse button anywhere on
        // the canvas, or with the compass handle using the left button.
        if (this.pending && (button === MouseButton.RIGHT
            || (this.originNub !== null && this.originNub.isPointTouching(point, true)))) {
            this.beginMove(point);
            return true;
        }
        if (button !== MouseButton.LEFT) return false;

        // A click inside the active text changes the insertion point instead
        // of committing the text and creating a new object.
        if (this.pending && this.previewBounds !== null && this.previewBounds.contains(point)) {
            this.placeCaretAt(point);
            return true;
        }
        if (this.pending) this.commitPending();
        this.beginBitmapTransaction();
        this.pending = true;
        this.button = button;
        this.textOrigin = new Point(Math.floor(x), Math.floor(y));
        this.previewBounds = null;
        this.createEditor();
        this.positionEditor();
        this.positionNub();
        this.renderPreview();
        this.focusEditor(0);
        return true;
    }

    beginMove(point) {
        this.tracking = true;
        this.dragStart = point;
        this.originStart = this.textOrigin.clone();
        if (this.originNub !== null) this.originNub.setVisible(false);
        this.app.setCursorImg("hand_closed_cursor");
    }

    onMouseMove(x, y) {
        if (!this.tracking) return false;
        this.textOrigin = new Point(
            this.originStart.x + Math.round(x - this.dragStart.x),
            this.originStart.y + Math.round(y - this.dragStart.y)
        );
        this.positionEditor();
        this.positionNub();
        this.renderPreview();
        return true;
    }

    onMouseUp(x, y) {
        if (!this.tracking) return false;
        this.onMouseMove(x, y);
        this.tracking = false;
        this.positionNub();
        if (this.editor !== null) this.editor.focus();
        this.app.setCursorImg("text_tool_cursor");
        return true;
    }

    onSettingChanged() {
        if (!this.pending) return;
        this.updateEditorStyle();
        this.renderPreview();
    }

    onKeyPress(key) {
        if (!this.pending) return false;
        if (key === "Escape") return this.cancelPending();
        return false;
    }

    createEditor() {
        this.destroyEditor();
        const editor = document.createElement("textarea");
        editor.className = "text-tool-editor";
        editor.spellcheck = false;
        editor.wrap = "off";
        editor.setAttribute("aria-label", this.getName());
        // Keep the editing surface self-contained even when an installed PWA
        // still has an older stylesheet in its service-worker cache.
        Object.assign(editor.style, {
            position: "absolute",
            zIndex: "20",
            minWidth: "12px",
            minHeight: "1.3em",
            width: "24px",
            height: "24px",
            margin: "0",
            padding: "0",
            overflow: "hidden",
            resize: "none",
            border: "0",
            outline: "none",
            background: "transparent",
            color: "transparent",
            caretColor: "transparent",
            whiteSpace: "pre"
        });
        editor.oninput = () => this.renderPreview();
        editor.onselect = () => this.updateCaret();
        editor.onkeyup = () => this.updateCaret();
        editor.onfocus = () => this.updateCaret();
        editor.onblur = () => this.updateCaret();
        editor.onkeydown = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                this.cancelPending();
            } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.stopPropagation();
                this.commitPending();
            } else {
                event.stopPropagation();
            }
        };
        // The textarea is the text editor, not another click on the canvas.
        // Keep its pointer events from bubbling to AppView, which previously
        // committed/restarted the text and made typing require a double click.
        editor.addEventListener("pointerdown", event => {
            event.stopPropagation();
            if (event.button === MouseButton.RIGHT) {
                event.preventDefault();
                this.beginMove(this.eventToDocumentPoint(event));
                if (typeof editor.setPointerCapture === "function") {
                    editor.setPointerCapture(event.pointerId);
                }
            } else if (event.button === MouseButton.LEFT) {
                event.preventDefault();
                this.placeCaretAt(this.eventToDocumentPoint(event));
            }
        });
        editor.addEventListener("pointermove", event => {
            event.stopPropagation();
            if (!this.tracking) return;
            event.preventDefault();
            const point = this.eventToDocumentPoint(event);
            this.onMouseMove(point.x, point.y);
        });
        editor.addEventListener("pointerup", event => {
            event.stopPropagation();
            if (!this.tracking) return;
            event.preventDefault();
            const point = this.eventToDocumentPoint(event);
            this.onMouseUp(point.x, point.y, event.button);
        });
        editor.addEventListener("contextmenu", event => event.preventDefault());
        this.app.getEditorElement().appendChild(editor);
        this.editor = editor;
        const caret = document.createElement("div");
        caret.className = "text-tool-caret";
        this.app.getEditorElement().appendChild(caret);
        this.caretElement = caret;
        this.updateEditorStyle();
    }

    destroyEditor() {
        if (this.editor !== null && this.editor.parentNode !== null) {
            this.editor.parentNode.removeChild(this.editor);
        }
        this.editor = null;
        if (this.caretElement !== null) this.caretElement.remove();
        this.caretElement = null;
    }

    getFontSize() {
        const configured = Number(this.getSetting("fontSize", 12));
        const documentModel = this.getDocumentWorkspace().getDocument();
        const resolution = Math.max(0.01,
            Number(documentModel.getResolution?.() ?? documentModel.resolution) || 96);
        return this.getSetting("fontUnit", "points") === "points"
            ? configured * resolution / 72 : configured;
    }

    getFontString() {
        const family = this.getSetting("fontFamily", "Segoe UI");
        const generic = ["serif", "sans-serif", "monospace", "cursive", "fantasy"];
        const cssFamily = generic.includes(family) ? family : `'${family}'`;
        return `${this.getSetting("italic", false) ? "italic " : ""}`
            + `${this.getSetting("bold", false) ? "bold " : ""}`
            + `${this.getFontSize()}px ${cssFamily}, sans-serif`;
    }

    updateEditorStyle() {
        if (this.editor === null) return;
        const zoom = this.getDocumentWorkspace().getZoom();
        this.editor.style.font = this.getFontString();
        this.editor.style.fontSize = (this.getFontSize() * zoom) + "px";
        this.editor.style.lineHeight = "1.2";
        this.editor.style.textAlign = this.getSetting("align", "left");
        this.positionEditor();
        this.updateCaret();
    }

    positionEditor() {
        if (this.editor === null || this.textOrigin === null) return;
        const screen = this.getDocumentWorkspace().toScreenPosition(new Point(
            this.textOrigin.x,
            this.getTextTop()
        ));
        const align = this.getSetting("align", "left");
        this.editor.style.left = screen.x + "px";
        this.editor.style.top = screen.y + "px";
        this.editor.style.transform = align === "center" ? "translateX(-50%)"
            : align === "right" ? "translateX(-100%)" : "none";
    }

    renderPreview() {
        if (!this.pending || this.editor === null) return false;
        const surface = this.getActiveLayer().getSurface();
        const context = surface.context;
        const text = this.editor.value;
        const lines = text.split("\n");
        const fontSize = this.getFontSize();
        const lineHeight = this.getLineHeight();
        const textTop = this.getTextTop();
        context.save();
        context.font = this.getFontString();
        let width = 1;
        for (const line of lines) width = Math.max(width, context.measureText(line || " ").width);
        context.restore();
        const zoom = this.getDocumentWorkspace().getZoom();
        this.editor.style.width = Math.max(24, Math.ceil(width * zoom) + 8) + "px";
        this.editor.style.height = Math.max(24, Math.ceil(lines.length * lineHeight * zoom) + 4) + "px";
        this.positionEditor();
        const align = this.getSetting("align", "left");
        const left = align === "center" ? this.textOrigin.x - width / 2
            : align === "right" ? this.textOrigin.x - width : this.textOrigin.x;
        const nextBounds = Rectangle.intersect(new Rectangle(
            Math.floor(left) - 3, Math.floor(textTop) - 3,
            Math.ceil(width) + 6, Math.ceil(lines.length * lineHeight) + 6
        ), surface.getBounds());
        let dirtyBounds = this.previewBounds === null
            ? nextBounds : Rectangle.union(this.previewBounds, nextBounds);
        dirtyBounds.intersect(surface.getBounds());
        if (!dirtyBounds.isEmpty()) surface.copyRegionFrom(this.scratchSurface, dirtyBounds);

        if (text.length > 0) {
            context.save();
            this.clipToSelection(context);
            context.globalCompositeOperation = this.getCompositeOperation();
            context.font = this.getFontString();
            context.textBaseline = "top";
            context.textAlign = align;
            context.fillStyle = this.getColor(this.button).toHex();
            const decorationThickness = Math.max(1, Math.round(fontSize / 14));
            for (let i = 0; i < lines.length; ++i) {
                const y = textTop + i * lineHeight;
                const line = lines[i];
                context.fillText(line, this.textOrigin.x, y);
                const lineWidth = context.measureText(line).width;
                const lineLeft = align === "center" ? this.textOrigin.x - lineWidth / 2
                    : align === "right" ? this.textOrigin.x - lineWidth : this.textOrigin.x;
                if (this.getSetting("underline", false)) {
                    context.fillRect(lineLeft, y + fontSize + 1, lineWidth, decorationThickness);
                }
                if (this.getSetting("strikeout", false)) {
                    context.fillRect(lineLeft, y + fontSize * 0.52, lineWidth, decorationThickness);
                }
            }
            context.restore();
        }
        this.previewBounds = nextBounds;
        this.bitmapTransaction.dirtyBounds = nextBounds;
        this.positionNub();
        this.updateCaret();
        this.getActiveLayer().invalidate(dirtyBounds);
        return true;
    }

    getLineHeight() {
        return this.getFontSize() * 1.2;
    }

    getTextTop() {
        return this.textOrigin === null ? 0 : Math.floor(this.textOrigin.y - this.getLineHeight() / 2);
    }

    updateCaret() {
        if (this.editor === null || this.caretElement === null || this.textOrigin === null) return;
        if (document.activeElement !== this.editor || !this.pending) {
            this.caretElement.hidden = true;
            return;
        }

        const text = this.editor.value;
        const position = this.editor.selectionStart === null ? text.length : this.editor.selectionStart;
        const beforeCaret = text.substring(0, position);
        const lineIndex = (beforeCaret.match(/\n/g) || []).length;
        const lineStart = beforeCaret.lastIndexOf("\n") + 1;
        const prefix = beforeCaret.substring(lineStart);
        const line = text.split("\n")[lineIndex] || "";
        const context = this.getActiveLayer().getSurface().context;
        context.save();
        context.font = this.getFontString();
        const prefixWidth = context.measureText(prefix).width;
        const lineWidth = context.measureText(line).width;
        context.restore();

        const align = this.getSetting("align", "left");
        const lineLeft = align === "center" ? this.textOrigin.x - lineWidth / 2
            : align === "right" ? this.textOrigin.x - lineWidth : this.textOrigin.x;
        const documentPoint = new Point(
            lineLeft + prefixWidth,
            this.getTextTop() + lineIndex * this.getLineHeight()
        );
        const screen = this.getDocumentWorkspace().toScreenPosition(documentPoint);
        const zoom = this.getDocumentWorkspace().getZoom();
        this.caretElement.style.left = screen.x + "px";
        this.caretElement.style.top = screen.y + "px";
        this.caretElement.style.width = Math.max(1, 2 * zoom) + "px";
        this.caretElement.style.height = Math.max(1, this.getLineHeight() * zoom) + "px";
        this.caretElement.hidden = false;
    }

    eventToDocumentPoint(event) {
        const bounds = this.app.getEditorElement().getBoundingClientRect();
        return this.getDocumentWorkspace().toDocumentPosition(new Point(
            event.clientX - bounds.left,
            event.clientY - bounds.top
        ), true);
    }

    focusEditor(position = null) {
        if (this.editor === null) return;
        const editor = this.editor;
        requestAnimationFrame(() => {
            if (this.editor !== editor) return;
            editor.focus({preventScroll: true});
            if (position !== null) editor.setSelectionRange(position, position);
            this.updateCaret();
        });
    }

    placeCaretAt(point) {
        if (this.editor === null) return;
        const lines = this.editor.value.split("\n");
        const lineHeight = this.getLineHeight();
        const lineIndex = Utility.clamp(
            Math.floor((point.y - this.getTextTop()) / lineHeight), 0, lines.length - 1
        );
        const context = this.getActiveLayer().getSurface().context;
        context.save();
        context.font = this.getFontString();
        const line = lines[lineIndex];
        const lineWidth = context.measureText(line).width;
        const align = this.getSetting("align", "left");
        const lineLeft = align === "center" ? this.textOrigin.x - lineWidth / 2
            : align === "right" ? this.textOrigin.x - lineWidth : this.textOrigin.x;
        const localX = point.x - lineLeft;
        let offset = line.length;
        for (let i = 0; i < line.length; ++i) {
            const before = context.measureText(line.substring(0, i)).width;
            const after = context.measureText(line.substring(0, i + 1)).width;
            if (localX < (before + after) / 2) {
                offset = i;
                break;
            }
        }
        context.restore();
        let position = offset;
        for (let i = 0; i < lineIndex; ++i) position += lines[i].length + 1;
        this.focusEditor(position);
    }

    commitPending() {
        if (!this.pending) return false;
        const hasText = this.editor !== null && this.editor.value.length > 0;
        this.pending = false;
        this.tracking = false;
        this.destroyEditor();
        this.destroyNub();
        if (hasText) this.commitBitmapTransaction();
        else this.cancelBitmapTransaction();
        this.app.setCursorImg("text_tool_cursor");
        return true;
    }

    cancelPending() {
        if (!this.pending) return false;
        this.pending = false;
        this.tracking = false;
        this.destroyEditor();
        this.destroyNub();
        this.cancelBitmapTransaction();
        this.app.setCursorImg("text_tool_cursor");
        return true;
    }

    positionNub() {
        if (this.originNub === null) {
            this.originNub = new MoveNubRenderer(this.getSurfaceBox());
            this.originNub.setShape(MoveNubShape.COMPASS);
            this.getSurfaceBox().addRenderer(this.originNub);
        }
        const location = this.previewBounds === null
            ? this.textOrigin
            : new Point(this.previewBounds.getRight() + 8, this.previewBounds.getBottom() + 8);
        this.originNub.setLocation(location);
        this.originNub.setVisible(!this.tracking);
    }

    destroyNub() {
        if (this.originNub === null) return;
        this.getSurfaceBox().removeRenderer(this.originNub);
        this.originNub.dispose();
        this.originNub = null;
    }
}
