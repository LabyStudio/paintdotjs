class ToolType {

    static PAN = new ToolType(
        "panTool",
        "pan_tool_icon",
        type => new PanTool(type),
        "H",
        false
    );
    static RECTANGLE_SELECT = new ToolType(
        "rectangleSelectTool",
        "rectangle_select_tool",
        type => new RectangleSelectTool(type),
        "S",
        false
    );
    static LASSO_SELECT = new ToolType(
        "lassoSelectTool",
        "lasso_select_tool",
        type => new LassoSelectTool(type),
        "S",
        false
    );
    static ELLIPSE_SELECT = new ToolType(
        "ellipseSelectTool",
        "ellipse_select_tool",
        type => new EllipseSelectTool(type),
        "S",
        false
    );
    static MOVE_SELECTION = new ToolType(
        "moveSelectionTool",
        "move_selection_tool",
        type => new MoveSelectionTool(type),
        "M",
        false
    );
    static MOVE = new ToolType(
        "moveTool",
        "move_tool",
        type => new MoveTool(type),
        "M",
        false
    );
    static ZOOM = new ToolType(
        "zoomTool",
        "zoom_tool",
        type => new ZoomTool(type),
        "Z",
        false
    );
    static PAINT_BUCKET = new ToolType(
        "paintBucketTool",
        "paint_bucket",
        type => new PaintBucketTool(type),
        "F",
        false
    );
    static PAINT_BRUSH = new ToolType(
        "paintBrushTool",
        "paint_brush_tool",
        type => new PaintBrushTool(type),
        "B",
        true
    );
    static ERASER = new ToolType(
        "eraserTool",
        "eraser_tool",
        type => new EraserTool(type),
        "E",
        true
    );
    static PENCIL = new ToolType(
        "pencilTool",
        "pencil_tool",
        type => new PencilTool(type),
        "P",
        true
    );
    static COLOR_PICKER = new ToolType(
        "colorPickerTool",
        "color_picker_tool",
        type => new ColorPickerTool(type),
        "K",
        true
    );
    static LINE = new ToolType(
        "lineTool",
        "line_tool",
        type => new LineTool(type),
        "O",
        false
    );
    static SHAPES = new ToolType(
        "shapesTool",
        "shapes_tool",
        type => new ShapesTool(type),
        "O",
        false
    );
    static MAGIC_WAND = new ToolType(
        "magicWandTool",
        "magic_wand_tool",
        type => new MagicWandTool(type),
        "S",
        false
    );
    static GRADIENT = new ToolType(
        "gradientTool",
        "gradient_tool",
        type => new GradientTool(type),
        "G",
        false
    );
    static CLONE_STAMP = new ToolType(
        "cloneStampTool",
        "clone_stamp_tool",
        type => new CloneStampTool(type),
        "L",
        false
    );
    static RECOLOR = new ToolType(
        "recolorTool",
        "recoloring_tool",
        type => new RecolorTool(type),
        "R",
        true
    );
    static TEXT = new ToolType(
        "textTool",
        "text_tool",
        type => new TextTool(type),
        "T",
        false
    );

    static VALUES = [
        ToolType.RECTANGLE_SELECT,
        ToolType.MOVE,
        ToolType.LASSO_SELECT,
        ToolType.MOVE_SELECTION,
        ToolType.ELLIPSE_SELECT,
        ToolType.ZOOM,
        ToolType.MAGIC_WAND,
        ToolType.PAN,
        ToolType.PAINT_BUCKET,
        ToolType.GRADIENT,
        ToolType.PAINT_BRUSH,
        ToolType.ERASER,
        ToolType.PENCIL,
        ToolType.COLOR_PICKER,
        ToolType.CLONE_STAMP,
        ToolType.RECOLOR,
        ToolType.TEXT,
        ToolType.LINE,
        ToolType.SHAPES,
    ];

    static {
        const selectionSettings = {combineMode: "replace", renderingQuality: "high"};
        const brushSettings = {
            width: 2, pressure: true,
            hardness: 75, spacing: 15, smoothing: true,
            antialias: true, renderingQuality: "high"
        };
        ToolType.RECTANGLE_SELECT.setSettings(Object.assign({
            selectionMode: "normal", selectionWidth: 1, selectionHeight: 1
        }, selectionSettings));
        ToolType.LASSO_SELECT.setSettings(selectionSettings);
        ToolType.ELLIPSE_SELECT.setSettings(selectionSettings);
        ToolType.MOVE_SELECTION.setSettings({renderingQuality: "high"});
        ToolType.MOVE.setSettings({
            resampling: "highQualityCubic", gammaCorrected: true, renderingQuality: "high"
        });
        // Migrate settings saved by the earlier three-choice implementation.
        if (ToolType.MOVE.settings.resampling === "bilinear") {
            ToolType.MOVE.settings.resampling = "linear";
        } else if (ToolType.MOVE.settings.resampling === "bicubic") {
            ToolType.MOVE.settings.resampling = "highQualityCubic";
        }
        ToolType.ZOOM.setSettings({renderingQuality: "high"});
        ToolType.PAN.setSettings({renderingQuality: "high"});
        ToolType.PAINT_BUCKET.setSettings({
            tolerance: 50, floodMode: "contiguous", fillStyle: "solid",
            alphaMode: "premultiplied", sampleMode: "layer", antialias: true,
            blendMode: "normal", renderingQuality: "high"
        });
        ToolType.PAINT_BRUSH.setSettings(Object.assign({fillStyle: "solid", blendMode: "normal"}, brushSettings));
        ToolType.ERASER.setSettings(brushSettings);
        ToolType.PENCIL.setSettings({blendMode: "normal", renderingQuality: "high"});
        ToolType.COLOR_PICKER.setSettings({
            sampleMode: "layer", sampleSize: 1, afterClick: "none", renderingQuality: "high"
        });
        ToolType.LINE.setSettings({
            width: 2, dash: "solid", startCap: "flat", endCap: "flat",
            fillStyle: "solid", curveType: "spline", blendMode: "normal",
            antialias: true, renderingQuality: "high"
        });
        // The previous JS default accidentally used a rounded start cap. Move
        // that exact legacy default to Paint.NET 5's flat/flat default while
        // preserving every other user-selected cap combination.
        if (ToolType.LINE.settings.startCap === "round"
            && ToolType.LINE.settings.endCap === "flat") {
            ToolType.LINE.setSetting("startCap", "flat");
        }
        ToolType.SHAPES.setSettings({
            shape: "rectangle", width: 2, drawType: "outline", dash: "solid",
            fillStyle: "solid", radius: 10, antialias: true,
            blendMode: "normal", renderingQuality: "high"
        });
        ToolType.MAGIC_WAND.setSettings({
            tolerance: 50, floodMode: "contiguous", combineMode: "replace",
            alphaMode: "premultiplied", sampleMode: "layer", renderingQuality: "high"
        });
        ToolType.GRADIENT.setSettings({
            gradientType: "linear", gradientMode: "color", repeatMode: "none",
            antialias: true, blendMode: "normal", renderingQuality: "high"
        });
        ToolType.CLONE_STAMP.setSettings(Object.assign({blendMode: "normal"}, brushSettings));
        ToolType.RECOLOR.setSettings(Object.assign({
            tolerance: 25, alphaMode: "premultiplied", recolorSampling: "once"
        }, brushSettings));
        ToolType.TEXT.setSettings({
            fontFamily: "Calibri", fontSize: 12, fontUnit: "points",
            bold: false, italic: false, underline: false, strikeout: false,
            textRendering: "smooth", align: "left", antialias: true,
            blendMode: "normal", renderingQuality: "high"
        });
    }

    constructor(id, iconName, factory, hotKey, skipIfActiveOnHotKey) {
        this.id = id;
        this.iconName = iconName;
        this.factory = factory;
        this.hotKey = hotKey;
        this.skipIfActiveOnHotKey = skipIfActiveOnHotKey;
        this.defaultSettings = {};
        this.settings = {};
        try {
            const saved = window.localStorage.getItem("paintdotjs.toolSettings." + id);
            if (saved !== null) this.settings = JSON.parse(saved);
        } catch (_) {
            // Settings persistence is optional (for example in private mode).
        }
    }

    create() {
        return this.factory(this);
    }

    getIconName() {
        return this.iconName;
    }

    getName() {
        return i18n(this.id + ".name");
    }

    getIconSrc() {
        return "assets/icons/" + this.getIconName() + "_icon.png";
    }

    getId() {
        return this.id;
    }

    getHotKey() {
        return this.hotKey;
    }

    getSkipIfActiveOnHotKey() {
        return this.skipIfActiveOnHotKey;
    }

    getTooltipText() {
        const action = ActionRegistry.get(this.id);
        return action instanceof ToolAction
            ? action.getTooltipText()
            : this.getName();
    }

    setSettings(settings) {
        this.defaultSettings = Object.assign({}, this.defaultSettings, settings);
        this.settings = Object.assign({}, settings, this.settings);
        return this;
    }

    resetSettings() {
        this.settings = Object.assign({}, this.defaultSettings);
        try {
            window.localStorage.removeItem("paintdotjs.toolSettings." + this.id);
        } catch (_) {
            // Keep the in-memory defaults when persistent storage is unavailable.
        }
    }

    getSetting(name, fallback = null) {
        return Object.prototype.hasOwnProperty.call(this.settings, name)
            ? this.settings[name]
            : fallback;
    }

    setSetting(name, value) {
        this.settings[name] = value;
        try {
            window.localStorage.setItem(
                "paintdotjs.toolSettings." + this.id,
                JSON.stringify(this.settings)
            );
        } catch (_) {
            // Keep in-memory settings when persistent storage is unavailable.
        }
    }

    static getById(id) {
        for (let type of ToolType.VALUES) {
            if (type.id === id) {
                return type;
            }
        }
        return null;
    }
}
