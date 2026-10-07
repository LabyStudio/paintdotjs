class BitmapEffectEngine {

    static gaussianNoiseTable = null;

    static DEFINITIONS = Object.freeze({
        autoLevel: this.instant("autoLevel", "auto_level.png", (r, g, b, a, _, state) => [
            this.stretch(r, state.min[0], state.max[0]),
            this.stretch(g, state.min[1], state.max[1]),
            this.stretch(b, state.min[2], state.max[2]), a
        ], data => this.channelExtents(data)),
        desaturateEffect: this.instant("desaturateEffect", "desaturate_effect.png", (r, g, b, a) => {
            const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            return [gray, gray, gray, a];
        }),
        brightnessAndContrastAdjustment: this.configurable(
            "brightnessAndContrastAdjustment", "brightness_and_contrast_adjustment.png",
            [this.range("brightness", "Brightness", -100, 100, 0), this.range("contrast", "Contrast", -100, 100, 0)],
            (r, g, b, a, values) => {
                const intensity = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
                let multiply = 1;
                let divide = 1;
                if (values.contrast < 0) {
                    multiply = values.contrast + 100;
                    divide = 100;
                } else if (values.contrast > 0) {
                    multiply = 100;
                    divide = 100 - values.contrast;
                }
                if (divide === 0) {
                    const value = intensity + values.brightness < 128 ? 0 : 255;
                    return [value, value, value, a];
                }
                const adjustment = divide === 100
                    ? (intensity - 127) * multiply / divide + 127 - intensity + values.brightness
                    : (intensity - 127 + values.brightness) * multiply / divide + 127 - intensity;
                const apply = channel => channel + adjustment;
                return [apply(r), apply(g), apply(b), a];
            }
        ),
        curvesEffect: this.configurable("curvesEffect", "curves_effect.png", [
            this.select("channel", "Transfer Map", "luminosity", [
                ["luminosity", "Luminosity"], ["rgb", "RGB"]
            ]),
            this.curve("points", [[0, 0], [255, 255]])
        ], (r, g, b, a, values) => {
            const map = value => this.interpolateCurve(value, values.points);
            switch (values.channel) {
                case "red": return [map(r), g, b, a];
                case "green": return [r, map(g), b, a];
                case "blue": return [r, g, map(b), a];
                case "alpha": return [r, g, b, map(a)];
                case "rgb": return [map(r), map(g), map(b), a];
                default: {
                    const luminance = r * .299 + g * .587 + b * .114;
                    const delta = map(luminance) - luminance;
                    return [r + delta, g + delta, b + delta, a];
                }
            }
        }, null, "curves"),
        exposureEffect: this.configurable("exposureEffect", "exposure_effect.png",
            [this.range("exposure", "Exposure", -5, 5, 0, 0.1)],
            (r, g, b, a, values) => {
                const scale = Math.pow(2, values.exposure);
                return [r * scale, g * scale, b * scale, a];
            }),
        highlightsAndShadowsEffect: this.configurable(
            "highlightsAndShadowsEffect", "highlights_and_shadows_effect.png", [
                this.range("shadows", "Shadows", -100, 100, 0),
                this.range("highlights", "Highlights", -100, 100, 0),
                this.range("clarity", "Clarity", -100, 100, 0),
                this.range("radius", "Radius", 1, 100, 20)
            ],
            (r, g, b, a, values) => {
                const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                const shadow = (1 - luminance) * values.shadows * 1.6;
                const highlight = luminance * values.highlights * 1.6;
                const contrast = 1 + values.clarity / 200;
                const apply = channel => ((channel + shadow + highlight) - 127.5) * contrast + 127.5;
                return [apply(r), apply(g), apply(b), a];
            }
        ),
        hueAndSaturationAdjustment: this.configurable(
            "hueAndSaturationAdjustment", "hue_and_saturation_adjustment.png", [
                this.range("hue", "Hue", -180, 180, 0),
                this.range("saturation", "Saturation", 0, 200, 100),
                this.range("lightness", "Lightness", -100, 100, 0)
            ],
            (r, g, b, a, values) => {
                let [h, s, l] = this.rgbToHsl(r, g, b);
                h = (h + values.hue / 360 + 1) % 1;
                const saturation = values.saturation > 100
                    ? (values.saturation - 100) * 3 + 100
                    : values.saturation;
                s = this.clamp01(s * saturation / 100);
                l = this.clamp01(l + values.lightness / 100);
                const rgb = this.hslToRgb(h, s, l);
                return [rgb[0], rgb[1], rgb[2], a];
            }
        , null, "hueSaturation"),
        invertAlphaEffect: this.instant("invertAlphaEffect", "invert_alpha_effect.png",
            (r, g, b, a) => [r, g, b, 255 - a]),
        invertColorsEffect: this.instant("invertColorsEffect", "invert_colors_effect.png",
            (r, g, b, a) => [255 - r, 255 - g, 255 - b, a]),
        levelsEffect: this.levelsDefinition(),
        posterizeAdjustment: this.configurable("posterizeAdjustment", "posterize_effect_icon.png", [
            this.range("red", "Red", 2, 64, 16), this.range("green", "Green", 2, 64, 16),
            this.range("blue", "Blue", 2, 64, 16), this.range("alpha", "Alpha", 2, 64, 16),
            this.checkbox("linked", "Linked", true)
        ], (r, g, b, a, values) => {
            const levels = key => values.linked ? values.red : values[key];
            return [this.posterize(r, levels("red")), this.posterize(g, levels("green")),
                this.posterize(b, levels("blue")), this.posterize(a, levels("alpha"))];
        }),
        sepiaEffect: this.configurable("sepiaEffect", "sepia_effect.png",
            [this.range("intensity", "Intensity", 0, 100, 100)],
            (r, g, b, a, values) => {
                const amount = values.intensity / 100;
                const sr = r * .393 + g * .769 + b * .189;
                const sg = r * .349 + g * .686 + b * .168;
                const sb = r * .272 + g * .534 + b * .131;
                return [r + (sr - r) * amount, g + (sg - g) * amount, b + (sb - b) * amount, a];
            }),
        temperatureAndTintEffect: this.configurable(
            "temperatureAndTintEffect", "temperature_and_tint_effect.png", [
                this.range("temperature", "Temperature", -100, 100, 0),
                this.range("tint", "Tint", -100, 100, 0)
            ],
            (r, g, b, a, values) => [
                r + values.temperature * 0.8 + values.tint * 0.15,
                g - values.tint * 0.55,
                b - values.temperature * 0.8 + values.tint * 0.15,
                a
            ]
        )
    });

    static ROTATE_ZOOM = Object.freeze({
        id: "rotateZoomEffect",
        actionId: "menu.layers.rotateZoom",
        translationKey: "rotateZoomEffect.name",
        icon: "menu_layers_rotate_zoom_icon.png",
        dialog: "rotateZoom",
        controls: [
            this.range("angle", "Angle", -180, 180, 0, 0.1),
            this.range("rollDirection", "Roll direction", -180, 180, 0, 0.1),
            this.range("rollAmount", "Roll amount", 0, 90, 0, 0.1),
            this.range("panX", "Pan X", -10, 10, 0, 0.01),
            this.range("panY", "Pan Y", -10, 10, 0, 0.01),
            this.range("zoom", "Zoom", 0.06, 16, 1, 0.01, {exponential: true}),
            this.range("quality", "Quality", 1, 5, 2),
            this.select("sampling", "Sampling", "linear", [["linear", "Bilinear"], ["point", "Nearest Neighbor"]]),
            this.select("tiling", "Tiling", "transparent", [
                ["transparent", "None"], ["wrap", "Repeat"], ["mirror", "Mirror"]
            ])
        ],
        apply: (source, width, height, values) => {
            const input = document.createElement("canvas");
            input.width = width;
            input.height = height;
            input.getContext("2d").putImageData(source, 0, 0);
            const output = document.createElement("canvas");
            output.width = width;
            output.height = height;
            const context = output.getContext("2d");
            context.imageSmoothingEnabled = values.sampling !== "point";
            context.imageSmoothingQuality = "high";
            context.translate(
                width / 2 + values.panX / 20 * width,
                height / 2 + values.panY / 20 * height
            );
            // Paint.NET represents the roll control as an in-plane angle,
            // followed by the direction and amount of the 3D tilt. Projecting
            // that tilted plane back to 2D compresses it along the roll axis.
            const angle = values.angle * Math.PI / 180;
            const rollDirection = values.rollDirection * Math.PI / 180;
            const rollAmount = values.rollAmount * Math.PI / 180;
            context.rotate(-angle);
            context.rotate(rollDirection);
            context.scale(values.zoom * Math.cos(rollAmount), values.zoom);
            context.rotate(-rollDirection);
            if (values.tiling === "transparent") {
                context.drawImage(input, -width / 2, -height / 2);
            } else {
                for (let tileY = -2; tileY <= 2; ++tileY) for (let tileX = -2; tileX <= 2; ++tileX) {
                    context.save();
                    const mirrorX = values.tiling === "mirror" && Math.abs(tileX) % 2 === 1;
                    const mirrorY = values.tiling === "mirror" && Math.abs(tileY) % 2 === 1;
                    context.translate(tileX * width, tileY * height);
                    context.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
                    context.drawImage(input, -width / 2, -height / 2);
                    context.restore();
                }
            }
            return context.getImageData(0, 0, width, height);
        }
    });

    // Paint.NET's effects are grouped independently from adjustments.  Spatial
    // effects use full ImageData renderers; color-only effects use the same
    // per-pixel pipeline as adjustments.
    static EFFECTS = Object.freeze({
        inkSketchEffect: this.configurableSpatial("inkSketchEffect", "ink_sketch_effect_icon.png", [
            this.range("ink", "Ink outline", 0, 100, 50),
            this.range("color", "Coloring", 0, 100, 50)
        ], (source, width, height, values) => this.inkSketch(source, width, height, values)),
        oilPaintingEffect: this.configurableSpatial("oilPaintingEffect", "oil_painting_effect.png", [
            this.range("brush", "Brush size", 1, 50, 10),
            this.range("granularity", "Coarseness", .01, 1, .2, .01),
            this.select("kernel", "Kernel shape", "circle", [["circle", "Circle"], ["square", "Square"]])
        ], (source, width, height, values) => this.oilPaint(source, width, height, values)),
        pencilSketchEffect: this.configurableSpatial("pencilSketchEffect", "pencil_sketch_effect_icon.png", [
            this.range("tip", "Pencil tip size", 1, 20, 2), this.range("range", "Color range", -20, 20, 0)
        ], (source, width, height, values) => this.pencilSketch(source, width, height, values)),

        blurEffect: this.configurableSpatial("blurEffect", "blur_effect.png", [
            this.range("radius", "Radius", 0, 200, 2),
            this.range("gamma", "Gamma boost", -.99, 2, 0, .01),
            this.range("quality", "Quality", 1, 4, 2)
        ], (source, width, height, values) => this.gaussianBlur(
            source, width, height, values.radius, values.gamma, values.quality)),
        bokehEffect: this.configurableSpatial("bokehEffect", "bokeh_effect_icon.png", [
            this.range("radius", "Radius", 0, 200, 25),
            this.range("gamma", "Gamma boost", -.99, 2, 0, .01),
            this.range("quality", "Quality", 1, 4, 3)
        ], (source, width, height, values) => this.discBlur(source, width, height, values.radius, values.gamma)),
        fragmentEffect: this.configurableSpatial("fragmentEffect", "fragment_effect_icon.png", [
            this.range("fragments", "Fragment count", 2, 200, 4), this.range("distance", "Distance", 0, 400, 8),
            this.range("rotation", "Rotation", 0, 360, 0)
        ], (source, width, height, values) => this.fragment(source, width, height, values)),
        medianBlurEffect: this.configurableSpatial("medianBlurEffect", "median_effect_icon.png", [
            this.range("radius", "Radius", 0, 100, 10), this.range("percentile", "Percentile", 0, 100, 50),
            this.range("quality", "Quality", 1, 9, 8)
        ], (source, width, height, values) => this.percentileBlur(source, width, height, values.radius, values.percentile)),
        motionBlurEffect: this.configurableSpatial("motionBlurEffect", "motion_blur_effect.png", [
            this.range("distance", "Distance", 1, 500, 10), this.range("angle", "Angle", -180, 180, 25)
        ], (source, width, height, values) => this.directionalBlur(source, width, height, values.distance, values.angle)),
        radialBlurEffect: this.configurableSpatial("radialBlurEffect", "radial_blur_effect.png", [
            this.range("angle", "Angle", -360, 360, 10), this.range("centerX", "Center X", -100, 100, 0),
            this.range("centerY", "Center Y", -100, 100, 0)
        ], (source, width, height, values) => this.radialBlur(source, width, height, values)),
        reduceNoiseEffect: this.configurableSpatial("reduceNoiseEffect", "reduce_noise_effect.png", [
            this.range("radius", "Radius", 0, 50, 10), this.range("strength", "Strength", 0, 1, .4, .01)
        ], (source, width, height, values) => this.reduceNoise(source, width, height, values)),
        sketchBlurEffect: this.configurableSpatial("sketchBlurEffect", "sketch_blur_effect_icon.png", [
            this.range("radius", "Radius", 0, 100, 25), this.range("percentile", "Percentile", 0, 100, 50),
            this.range("smoothness", "Smoothness", 1, 20, 3)
        ], (source, width, height, values) => this.sketchBlur(source, width, height, values)),
        squareBlurEffect: this.configurableSpatial("squareBlurEffect", "square_blur_effect.png", [
            this.range("radius", "Radius", 0, 300, 6), this.range("gamma", "Gamma boost", -.99, 2, 0, .01)
        ], (source, width, height, values) => this.squareBlur(source, width, height, values.radius, values.gamma)),
        surfaceBlurEffect: this.configurableSpatial("surfaceBlurEffect", "surface_blur_effect_icon.png", [
            this.range("radius", "Radius", 1, 50, 6), this.range("threshold", "Threshold", 1, 100, 15)
        ], (source, width, height, values) => this.surfaceBlur(source, width, height, values)),
        unfocusEffect: this.configurableSpatial("unfocusEffect", "unfocus_effect_icon.png", [
            this.range("radius", "Radius", 0, 200, 25)
        ], (source, width, height, values) => this.discBlur(source, width, height, values.radius, 0)),
        zoomBlurEffect: this.configurableSpatial("zoomBlurEffect", "zoom_blur_effect.png", [
            this.range("amount", "Amount", 0, 100, 10), this.range("centerX", "Center X", -100, 100, 0),
            this.range("centerY", "Center Y", -100, 100, 0)
        ], (source, width, height, values) => this.zoomBlur(source, width, height, values)),

        quantizeEffect: this.configurableSpatial("quantizeEffect", "quantize_effect_icon.png", [
            this.select("algorithm", "Algorithm", "wu", [["octree", "Octree"], ["wu", "Wu"]]),
            this.range("colors", "Color count", 2, 256, 256),
            this.range("dithering", "Dithering level", 0, 8, 7),
            this.range("alphaThreshold", "Alpha threshold", 0, 255, 128)
        ], (source, width, height, values) => this.quantize(source, width, height, values)),
        bulgeEffect: this.distortDefinition("bulgeEffect", "bulge_effect.png", "Amount", -300, 100, 45,
            (dx, dy, radius, value) => {
                const distance = Math.hypot(dx, dy);
                if (distance >= radius) return [dx, dy];
                const falloff = 1 - distance / radius;
                const scale = 1 - value / 100 * falloff * falloff;
                return [dx * scale, dy * scale];
            }),
        crystalizeEffect: this.configurableSpatial("crystalizeEffect", "crystalize_effect_icon.png", [
            this.range("cell", "Cell size", 2, 250, 8), this.range("quality", "Quality", 1, 5, 3),
            this.range("seed", "Seed", 0, 255, 0)
        ], (source, width, height, values) => this.crystalize(source, width, height, values)),
        dentsEffect: this.configurableSpatial("dentsEffect", "dents_effect_icon.png", [
            this.range("scale", "Scale", 0, 200, 25), this.range("refraction", "Refraction", 0, 200, 50),
            this.range("detail", "Roughness", 0, 100, 10), this.range("turbulence", "Tension", 0, 100, 10),
            this.range("angle", "Angle", -180, 180, 0), this.range("quality", "Quality", 1, 5, 3),
            this.range("seed", "Seed", 0, 255, 0)
        ], (source, width, height, values) => this.dents(source, width, height, values)),
        pixelateEffect: this.configurableSpatial("pixelateEffect", "pixelate_effect.png", [
            this.range("cell", "Cell size", 1, 256, 2)
        ], (source, width, height, values) => this.pixelate(source, width, height, values.cell)),
        polarInversion: this.distortDefinition("polarInversion", "polar_inversion_effect.png", "Amount", -8, 8, 1, (dx, dy, radius, value) => {
            const distance2 = Math.max(Number.EPSILON, dx * dx + dy * dy);
            const inversion = radius * radius / distance2;
            const scale = 1 + (inversion - 1) * value;
            return [dx * scale, dy * scale];
        }),
        tileEffect: this.configurableSpatial("tileEffect", "tile_effect.png", [
            this.range("rotation", "Rotation", -180, 180, 30), this.range("tile", "Tile size", 1, 1600, 40),
            this.range("curvature", "Curvature", -200, 200, 8)
        ], (source, width, height, values) => this.tile(source, width, height, values)),
        twistEffect: this.distortDefinition("twistEffect", "twist_effect.png", "Amount", -200, 200, 30,
            (dx, dy, radius, value) => {
                const distance = Math.hypot(dx, dy);
                const falloff = Math.max(0, 1 - distance / radius);
                const angle = Math.atan2(dy, dx) + falloff * falloff * falloff * value / 100;
                return [Math.cos(angle) * distance, Math.sin(angle) * distance];
            }),
        turbulenceEffect: this.configurableSpatial("turbulenceEffect", "turbulence_effect_icon.png", [
            this.range("octaves", "Octaves", 1, 15, 4), this.range("period", "Period", .1, 1024, 100, .1),
            this.range("size", "Size", 1, 4096, 4096),
            this.select("noise", "Noise", "turbulence", [["fractal", "Fractal sum"], ["turbulence", "Turbulence"]]),
            this.range("seed", "Seed", 0, 255, 1)
        ], (_source, width, height, values) => this.turbulence(width, height, values)),

        addNoiseEffect: this.configurableSpatial("addNoiseEffect", "add_noise_effect.png", [
            this.range("intensity", "Intensity", 0, 100, 64), this.range("saturation", "Color saturation", 0, 400, 100),
            this.range("coverage", "Coverage", 0, 100, 100), this.range("seed", "Seed", 0, 255, 0)
        ], (source, width, height, values) => this.addNoise(source, width, height, values)),
        frostedGlassEffect: this.configurableSpatial("frostedGlassEffect", "frosted_glass_effect.png", [
            this.range("maxRadius", "Maximum scatter radius", 0, 500, 3),
            this.range("minRadius", "Minimum scatter radius", 0, 500, 0),
            this.range("diffusion", "Diffusion", .01, 3, 1, .01),
            this.range("smoothness", "Smoothness", 1, 8, 2), this.range("seed", "Seed", 0, 255, 0)
        ], (source, width, height, values) => this.frostedGlass(source, width, height, values)),
        medianEffect: this.configurableSpatial("medianEffect", "median_effect_icon.png", [
            this.range("radius", "Radius", 0, 100, 10), this.range("percentile", "Percentile", 0, 100, 50),
            this.range("quality", "Quality", 1, 9, 8)
        ], (source, width, height, values) => this.percentileBlur(source, width, height, values.radius, values.percentile)),

        dropShadowEffect: this.configurableSpatial("dropShadowEffect", "drop_shadow_effect.png", [
            this.range("blur", "Blur radius", 0, 100, 10), this.range("distance", "Distance", 0, 100, 10),
            this.range("angle", "Angle", -180, 180, -45), this.range("opacity", "Opacity", 0, 1, .75, .01),
            this.checkbox("shadowOnly", "Shadow only", false)
        ], (source, width, height, values) => this.dropShadow(source, width, height, values)),
        morphologyEffect: this.configurableSpatial("morphologyEffect", "morphology_effect_icon.png", [
            this.range("width", "Width", 1, 100, 5), this.range("height", "Height", 1, 100, 5),
            this.checkbox("linked", "Linked", true),
            this.select("mode", "Operation", "dilate", [["dilate", "Dilate"], ["erode", "Erode"]])
        ], (source, width, height, values) => this.morphology(source, width, height, values)),
        outlineEffect: this.configurableSpatial("outlineEffect", "outline_effect_icon.png", [
            this.range("thickness", "Thickness", 1, 70, 3), this.range("intensity", "Intensity", 0, 100, 50),
            this.range("quality", "Quality", 1, 9, 8)
        ], (source, width, height, values) => this.outline(source, width, height, values)),

        glowEffect: this.configurableSpatial("glowEffect", "glow_effect.png", [
            this.range("radius", "Radius", 1, 20, 6), this.range("brightness", "Brightness", -100, 100, 10),
            this.range("contrast", "Contrast", -100, 100, 10)
        ], (source, width, height, values) => this.glow(source, width, height, values)),
        redEyeRemoveEffect: this.configurable("redEyeRemoveEffect", "red_eye_remove_effect.png", [
            this.range("tolerance", "Tolerance", 0, 100, 70), this.range("saturation", "Saturation", 0, 100, 90)
        ], (r, g, b, a, values) => {
            const limit = Math.max(g, b) * (1 + (100 - values.tolerance) / 100);
            return r > limit ? [(g + b) / 2, g, b, a] : [r, g, b, a];
        }),
        sharpenEffect: this.configurableSpatial("sharpenEffect", "sharpen_effect.png", [
            this.range("amount", "Amount", 0, 10, 2, .1), this.range("threshold", "Threshold", 0, 1, 0, .01)
        ], (source, width, height, values) => this.sharpen(source, width, height, values.amount, values.threshold)),
        softenPortraitEffect: this.configurableSpatial("softenPortraitEffect", "soften_portrait_effect_icon.png", [
            this.range("softness", "Softness", 0, 10, 5), this.range("lighting", "Lighting", -20, 20, 0),
            this.range("warmth", "Warmth", 0, 20, 10)
        ], (source, width, height, values) => this.softenPortrait(source, width, height, values)),
        straightenEffect: this.configurableSpatial("straightenEffect", "straighten_effect.png", [
            this.range("angle", "Angle", -45, 45, 0, .1)
        ], (source, width, height, values) => this.rotate(source, width, height, values.angle)),
        vignetteEffect: this.configurableSpatial("vignetteEffect", "vignette_effect_icon.png", [
            this.range("strength", "Strength", 0, 1, 1, .01), this.range("radius", "Radius", .1, 4, .5, .01)
        ], (source, width, height, values) => this.vignette(source, width, height, values)),

        cloudsEffect: this.configurableSpatial("cloudsEffect", "clouds_effect.png", [
            this.range("scale", "Scale", 2, 1000, 250), this.range("roughness", "Roughness", 0, 1, .5, .01),
            this.range("seed", "Seed", 0, 255, 0)
        ], (source, width, height, values) => this.clouds(source, width, height, values)),
        juliaFractalEffect: this.fractalDefinition("juliaFractalEffect", "julia_fractal_effect_icon.png", true),
        mandelbrotFractalEffect: this.fractalDefinition("mandelbrotFractalEffect", "mandelbrot_fractal_effect_icon.png", false),

        edgeDetectEffect: this.convolutionDefinition("edgeDetectEffect", "edge_detect_effect.png", [-1,-1,-1,-1,8,-1,-1,-1,-1], 0),
        embossEffect: this.convolutionDefinition("embossEffect", "emboss_effect.png", [-2,-1,0,-1,1,1,0,1,2], 128),
        reliefEffect: this.convolutionDefinition("reliefEffect", "relief_effect.png", [-1,-1,0,-1,0,1,0,1,1], 128)
    });

    static instant(id, icon, transform, prepare = null) {
        return {id, icon, controls: [], transform, prepare};
    }

    static configurable(id, icon, controls, transform, prepare = null, dialog = null, dialogTitle = null) {
        return {id, icon, controls, transform, prepare, dialog, dialogTitle};
    }

    static configurableSpatial(id, icon, controls, apply) {
        return {id, icon, controls, apply};
    }

    static levelsDefinition() {
        return {
            id: "levelsEffect",
            icon: "levels_effect.png",
            dialog: "levels",
            dialogTitle: "Levels Adjustment",
            controls: [
                this.range("inputLow", "Input black point", 0, 254, 0),
                this.range("inputHigh", "Input white point", 1, 255, 255),
                this.range("gamma", "Gamma", 0.1, 10, 1, 0.01),
                this.range("outputLow", "Output black point", 0, 254, 0),
                this.range("outputHigh", "Output white point", 1, 255, 255),
                this.checkbox("red", "R", true),
                this.checkbox("green", "G", true),
                this.checkbox("blue", "B", true)
            ],
            apply: (source, width, height, values) => this.applyLevels(source, width, height, values)
        };
    }

    static blurDefinition(id, icon, label, min, max, defaultValue) {
        return this.configurableSpatial(id, icon, [this.range("radius", label, min, max, defaultValue)],
            (source, width, height, values) => this.boxBlur(source, width, height, values.radius));
    }

    static convolutionDefinition(id, icon, kernel, bias) {
        return this.configurableSpatial(id, icon, [],
            (source, width, height) => this.convolve(source, width, height, kernel, bias));
    }

    static distortDefinition(id, icon, label, min, max, defaultValue, mapper) {
        return this.configurableSpatial(id, icon, [this.range("amount", label, min, max, defaultValue)],
            (source, width, height, values) => this.distort(source, width, height, values.amount, mapper));
    }

    static fractalDefinition(id, icon, julia) {
        return this.configurableSpatial(id, icon, [
            this.range("zoom", "Zoom", 1, 100, 10), this.range("iterations", "Quality", 10, 500, 100)
        ], (_source, width, height, values) => this.fractal(width, height, values, julia));
    }

    static range(key, label, min, max, defaultValue, step = 1, options = {}) {
        return {type: "range", key, label, min, max, defaultValue, step, ...options};
    }

    static checkbox(key, label, defaultValue) {
        return {type: "checkbox", key, label, defaultValue};
    }

    static select(key, label, defaultValue, choices) {
        return {
            type: "select", key, label, defaultValue,
            choices: choices.map(([value, choiceLabel]) => ({value, label: choiceLabel}))
        };
    }

    static curve(key, defaultValue) {
        return {type: "curve", key, defaultValue};
    }

    static defaults(definition) {
        return Object.fromEntries(definition.controls.map(control => [
            control.key,
            Array.isArray(control.defaultValue)
                ? control.defaultValue.map(value => Array.isArray(value) ? [...value] : value)
                : control.defaultValue
        ]));
    }

    static apply(source, width, height, definition, values, selection = null) {
        if (typeof definition.apply === "function") {
            const rendered = definition.apply(source, width, height, values);
            return this.maskResult(source, rendered, width, height, selection);
        }
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const state = definition.prepare === null ? null : definition.prepare(source.data, values);
        const mask = this.createSelectionMask(width, height, selection);

        for (let offset = 0, pixel = 0; offset < source.data.length; offset += 4, ++pixel) {
            const coverage = mask === null ? 255 : mask[pixel];
            if (coverage === 0) continue;
            const result = definition.transform(
                source.data[offset], source.data[offset + 1], source.data[offset + 2],
                source.data[offset + 3], values, state
            );
            const amount = coverage / 255;
            for (let channel = 0; channel < 4; ++channel) {
                output.data[offset + channel] = source.data[offset + channel]
                    + (result[channel] - source.data[offset + channel]) * amount;
            }
        }
        return output;
    }

    static applyLevels(source, width, height, values) {
        const low = Math.min(values.inputLow, values.inputHigh - 1);
        const high = Math.max(values.inputHigh, low + 1);
        const outputLow = Math.min(values.outputLow, values.outputHigh - 1);
        const outputHigh = Math.max(values.outputHigh, outputLow + 1);
        const exponent = 1 / values.gamma;
        const lookup = new Uint8ClampedArray(256);

        // Levels is a channel lookup operation. Building the curve once avoids
        // allocating an array and evaluating Math.pow() for every pixel/channel.
        for (let value = 0; value < 256; ++value) {
            const normalized = Math.max(0, Math.min(1, (value - low) / (high - low)));
            lookup[value] = outputLow + Math.pow(normalized, exponent) * (outputHigh - outputLow);
        }

        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const data = output.data;
        for (let offset = 0; offset < data.length; offset += 4) {
            if (values.red) data[offset] = lookup[data[offset]];
            if (values.green) data[offset + 1] = lookup[data[offset + 1]];
            if (values.blue) data[offset + 2] = lookup[data[offset + 2]];
        }
        return output;
    }

    static maskResult(source, rendered, width, height, selection) {
        const mask = selection instanceof Uint8Array
            ? selection
            : this.createSelectionMask(width, height, selection);
        if (mask === null) return rendered;
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        for (let pixel = 0, offset = 0; pixel < mask.length; ++pixel, offset += 4) {
            const amount = mask[pixel] / 255;
            for (let channel = 0; channel < 4; ++channel) {
                output.data[offset + channel] = source.data[offset + channel]
                    + (rendered.data[offset + channel] - source.data[offset + channel]) * amount;
            }
        }
        return output;
    }

    static createSelectionMask(width, height, selection) {
        if (selection === null) return null;
        // Effect previews rasterize the document selection once and reuse the
        // resulting mask for each render. Do not treat that byte mask as a live
        // Selection object and try to call Selection methods on it.
        if (selection instanceof Uint8Array) return selection;
        if (selection.isEmpty()) return null;
        const path = selection.createPath();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        FillSelectionFunction.tracePath(context, path);
        context.fill("evenodd");
        path.dispose();
        const rgba = context.getImageData(0, 0, width, height).data;
        const mask = new Uint8Array(width * height);
        let fullySelected = true;
        for (let offset = 3, pixel = 0; offset < rgba.length; offset += 4, ++pixel) {
            mask[pixel] = rgba[offset];
            if (rgba[offset] !== 255) fullySelected = false;
        }
        return fullySelected ? null : mask;
    }

    static channelExtents(data) {
        const min = [255, 255, 255];
        const max = [0, 0, 0];
        for (let offset = 0; offset < data.length; offset += 4) {
            if (data[offset + 3] === 0) continue;
            for (let channel = 0; channel < 3; ++channel) {
                min[channel] = Math.min(min[channel], data[offset + channel]);
                max[channel] = Math.max(max[channel], data[offset + channel]);
            }
        }
        return {min, max};
    }

    static stretch(value, min, max) {
        return max <= min ? value : (value - min) * 255 / (max - min);
    }

    static posterize(value, levels) {
        return Math.round(Math.round(value / 255 * (levels - 1)) * 255 / (levels - 1));
    }

    static interpolateCurve(value, points) {
        if (value <= points[0][0]) return points[0][1];
        for (let index = 1; index < points.length; ++index) {
            const right = points[index];
            if (value > right[0]) continue;
            const left = points[index - 1];
            const amount = (value - left[0]) / Math.max(1, right[0] - left[0]);
            return left[1] + (right[1] - left[1]) * amount;
        }
        return points[points.length - 1][1];
    }

    static randomState(seed = 0) {
        let state = this.hash32(Number(seed) | 0);
        const nextUint32 = () => {
            state += 0x6d2b79f5;
            let value = state;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return (value ^ value >>> 14) >>> 0;
        };
        return {nextUint32, next: () => nextUint32() / 4294967296};
    }

    static getGaussianNoiseTable() {
        if (this.gaussianNoiseTable !== null) return this.gaussianNoiseTable;
        const table = new Float32Array(65536);
        const random = this.randomState(0x4e4f4953);
        for (let index = 0; index < table.length; index += 2) {
            const magnitude = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random.next())));
            const angle = Math.PI * 2 * random.next();
            table[index] = magnitude * Math.cos(angle);
            table[index + 1] = magnitude * Math.sin(angle);
        }
        this.gaussianNoiseTable = table;
        return table;
    }

    static sample(data, width, height, x, y, channel) {
        const sx = Math.max(0, Math.min(width - 1, Math.round(x)));
        const sy = Math.max(0, Math.min(height - 1, Math.round(y)));
        return data[(sy * width + sx) * 4 + channel];
    }

    static sampleLinear(data, width, height, x, y, channel) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const tx = x - x0, ty = y - y0;
        const a = this.sample(data, width, height, x0, y0, channel);
        const b = this.sample(data, width, height, x0 + 1, y0, channel);
        const c = this.sample(data, width, height, x0, y0 + 1, channel);
        const d = this.sample(data, width, height, x0 + 1, y0 + 1, channel);
        return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }

    static mapImage(source, width, height, mapper) {
        const output = new ImageData(width, height);
        const sourceData = source.data;
        const outputData = output.data;
        const mapped = [0, 0];
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                mapper(x, y, mapped);
                const sx = mapped[0], sy = mapped[1];
                const offset = (y * width + x) * 4;
                const x0 = Math.floor(sx), y0 = Math.floor(sy);
                const tx = sx - x0, ty = sy - y0;
                const left = Math.max(0, Math.min(width - 1, x0));
                const right = Math.max(0, Math.min(width - 1, x0 + 1));
                const top = Math.max(0, Math.min(height - 1, y0));
                const bottom = Math.max(0, Math.min(height - 1, y0 + 1));
                const topLeft = (top * width + left) * 4;
                const topRight = (top * width + right) * 4;
                const bottomLeft = (bottom * width + left) * 4;
                const bottomRight = (bottom * width + right) * 4;
                for (let channel = 0; channel < 4; ++channel) {
                    const topValue = sourceData[topLeft + channel]
                        + (sourceData[topRight + channel] - sourceData[topLeft + channel]) * tx;
                    const bottomValue = sourceData[bottomLeft + channel]
                        + (sourceData[bottomRight + channel] - sourceData[bottomLeft + channel]) * tx;
                    outputData[offset + channel] = topValue + (bottomValue - topValue) * ty;
                }
            }
        }
        return output;
    }

    static boxBlur(source, width, height, radius) {
        radius = Math.max(0, Math.round(radius));
        if (radius === 0) return new ImageData(new Uint8ClampedArray(source.data), width, height);
        const horizontal = new Float32Array(source.data.length);
        const output = new ImageData(width, height);
        const diameter = radius * 2 + 1;
        for (let y = 0; y < height; ++y) {
            const sums = [0, 0, 0, 0];
            for (let x = -radius; x <= radius; ++x) {
                const sx = Math.max(0, Math.min(width - 1, x));
                const offset = (y * width + sx) * 4;
                for (let c = 0; c < 4; ++c) sums[c] += source.data[offset + c];
            }
            for (let x = 0; x < width; ++x) {
                const offset = (y * width + x) * 4;
                for (let c = 0; c < 4; ++c) horizontal[offset + c] = sums[c] / diameter;
                const removeX = Math.max(0, x - radius);
                const addX = Math.min(width - 1, x + radius + 1);
                for (let c = 0; c < 4; ++c) {
                    sums[c] += source.data[(y * width + addX) * 4 + c]
                        - source.data[(y * width + removeX) * 4 + c];
                }
            }
        }
        for (let x = 0; x < width; ++x) {
            const sums = [0, 0, 0, 0];
            for (let y = -radius; y <= radius; ++y) {
                const sy = Math.max(0, Math.min(height - 1, y));
                const offset = (sy * width + x) * 4;
                for (let c = 0; c < 4; ++c) sums[c] += horizontal[offset + c];
            }
            for (let y = 0; y < height; ++y) {
                const offset = (y * width + x) * 4;
                for (let c = 0; c < 4; ++c) output.data[offset + c] = sums[c] / diameter;
                const removeY = Math.max(0, y - radius);
                const addY = Math.min(height - 1, y + radius + 1);
                for (let c = 0; c < 4; ++c) {
                    sums[c] += horizontal[(addY * width + x) * 4 + c]
                        - horizontal[(removeY * width + x) * 4 + c];
                }
            }
        }
        return output;
    }

    static withGamma(source, width, height, gamma, operation) {
        if (!gamma) return operation(source);
        const exponent = 1 / (1 + gamma);
        const linear = new ImageData(width, height);
        for (let offset = 0; offset < source.data.length; offset += 4) {
            for (let channel = 0; channel < 3; ++channel) {
                linear.data[offset + channel] = Math.pow(source.data[offset + channel] / 255, exponent) * 255;
            }
            linear.data[offset + 3] = source.data[offset + 3];
        }
        const result = operation(linear);
        for (let offset = 0; offset < result.data.length; offset += 4) {
            for (let channel = 0; channel < 3; ++channel) {
                result.data[offset + channel] = Math.pow(result.data[offset + channel] / 255, 1 / exponent) * 255;
            }
        }
        return result;
    }

    static gaussianBoxRadii(sigma, passes) {
        // A sequence of box blurs converges on a Gaussian. Choose the two odd
        // box widths whose combined variance most closely matches sigma. This
        // keeps rendering O(width * height * passes), regardless of radius.
        const idealWidth = Math.sqrt(12 * sigma * sigma / passes + 1);
        let lowerWidth = Math.floor(idealWidth);
        if (lowerWidth % 2 === 0) --lowerWidth;
        lowerWidth = Math.max(1, lowerWidth);
        const upperWidth = lowerWidth + 2;
        const lowerPasses = Utility.clamp(Math.round(
            (12 * sigma * sigma - passes * lowerWidth * lowerWidth
                - 4 * passes * lowerWidth - 3 * passes)
            / (-4 * lowerWidth - 4)
        ), 0, passes);
        return Array.from({length: passes}, (_, index) =>
            ((index < lowerPasses ? lowerWidth : upperWidth) - 1) / 2);
    }

    static nativeGaussianBlur(source, width, height, sigma) {
        if (typeof document === "undefined") return null;
        const sourceCanvas = document.createElement("canvas");
        const sourceContext = sourceCanvas.getContext("2d", {alpha: true});
        const outputCanvas = document.createElement("canvas");
        const outputContext = outputCanvas.getContext("2d", {alpha: true});
        if (sourceContext === null || outputContext === null
            || !("filter" in outputContext)) return null;

        // Canvas filters are implemented by Chromium's native graphics stack
        // and are substantially faster than moving millions of samples through
        // JavaScript. Extend the edge pixels into the filter margin so the
        // result matches the CPU renderer's clamped-edge behavior.
        const padding = Math.ceil(sigma * 3);
        const paddedWidth = width + padding * 2;
        const paddedHeight = height + padding * 2;
        sourceCanvas.width = paddedWidth;
        sourceCanvas.height = paddedHeight;
        outputCanvas.width = width;
        outputCanvas.height = height;

        const imageCanvas = document.createElement("canvas");
        imageCanvas.width = width;
        imageCanvas.height = height;
        const imageContext = imageCanvas.getContext("2d", {alpha: true});
        if (imageContext === null) return null;
        imageContext.putImageData(source, 0, 0);
        sourceContext.drawImage(imageCanvas, padding, padding);
        if (padding > 0) {
            sourceContext.drawImage(imageCanvas, 0, 0, 1, height,
                0, padding, padding, height);
            sourceContext.drawImage(imageCanvas, width - 1, 0, 1, height,
                padding + width, padding, padding, height);
            sourceContext.drawImage(imageCanvas, 0, 0, width, 1,
                padding, 0, width, padding);
            sourceContext.drawImage(imageCanvas, 0, height - 1, width, 1,
                padding, padding + height, width, padding);
            sourceContext.drawImage(imageCanvas, 0, 0, 1, 1,
                0, 0, padding, padding);
            sourceContext.drawImage(imageCanvas, width - 1, 0, 1, 1,
                padding + width, 0, padding, padding);
            sourceContext.drawImage(imageCanvas, 0, height - 1, 1, 1,
                0, padding + height, padding, padding);
            sourceContext.drawImage(imageCanvas, width - 1, height - 1, 1, 1,
                padding + width, padding + height, padding, padding);
        }

        outputContext.filter = `blur(${sigma}px)`;
        if (outputContext.filter === "none") return null;
        outputContext.drawImage(sourceCanvas, -padding, -padding);
        outputContext.filter = "none";
        return outputContext.getImageData(0, 0, width, height);
    }

    static gaussianBlur(source, width, height, radius, gamma = 0, quality = 2) {
        const sigma = Math.max(0, Number(radius)) / 3;
        if (sigma < .01) return new ImageData(new Uint8ClampedArray(source.data), width, height);
        return this.withGamma(source, width, height, gamma, input => {
            let nativeResult = null;
            try {
                nativeResult = this.nativeGaussianBlur(input, width, height, sigma);
            } catch (_) {
                // Oversized canvases or constrained devices can reject the
                // native surface allocation. The bounded CPU path still works.
            }
            if (nativeResult !== null) return nativeResult;
            // Quality 1..4 maps to 2..5 passes. Even the fast setting is a
            // much closer Gaussian approximation than one box, while higher
            // settings smooth the small residual box profile at modest cost.
            const passes = Utility.clamp(Math.round(Number(quality)) || 2, 1, 4) + 1;
            let output = input;
            for (const boxRadius of this.gaussianBoxRadii(sigma, passes)) {
                output = this.boxBlur(output, width, height, boxRadius);
            }
            return output;
        });
    }

    static squareBlur(source, width, height, radius, gamma = 0) {
        return this.withGamma(source, width, height, gamma,
            input => this.boxBlur(input, width, height, radius));
    }

    static discBlur(source, width, height, radius, gamma = 0) {
        radius = Math.max(0, Math.round(radius));
        if (!radius) return new ImageData(new Uint8ClampedArray(source.data), width, height);
        return this.withGamma(source, width, height, gamma, input => {
            const output = new ImageData(width, height);
            const inputData = input.data;
            const outputData = output.data;
            const diameter = radius * 2 + 1;
            const halfWidths = new Int32Array(diameter);
            let count = 0;
            for (let row = 0; row < diameter; ++row) {
                const dy = row - radius;
                const halfWidth = Math.floor(Math.sqrt(radius * radius - dy * dy));
                halfWidths[row] = halfWidth;
                count += halfWidth * 2 + 1;
            }
            const rowOffsets = new Int32Array(diameter);
            for (let y = 0; y < height; ++y) {
                let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
                // Build the disc at the left edge once. Moving one pixel to the
                // right then only removes and adds one sample per disc row.
                for (let row = 0; row < diameter; ++row) {
                    const sy = Math.max(0, Math.min(height - 1, y + row - radius));
                    const rowOffset = sy * width * 4;
                    rowOffsets[row] = rowOffset;
                    const halfWidth = halfWidths[row];
                    for (let dx = -halfWidth; dx <= halfWidth; ++dx) {
                        const sx = Math.max(0, Math.min(width - 1, dx));
                        const sampleOffset = rowOffset + sx * 4;
                        totalR += inputData[sampleOffset];
                        totalG += inputData[sampleOffset + 1];
                        totalB += inputData[sampleOffset + 2];
                        totalA += inputData[sampleOffset + 3];
                    }
                }
                for (let x = 0; x < width; ++x) {
                    const offset = (y * width + x) * 4;
                    outputData[offset] = totalR / count;
                    outputData[offset + 1] = totalG / count;
                    outputData[offset + 2] = totalB / count;
                    outputData[offset + 3] = totalA / count;
                    if (x + 1 >= width) continue;
                    for (let row = 0; row < diameter; ++row) {
                        const halfWidth = halfWidths[row];
                        const removeX = Math.max(0, x - halfWidth);
                        const addX = Math.min(width - 1, x + halfWidth + 1);
                        const rowOffset = rowOffsets[row];
                        const removeOffset = rowOffset + removeX * 4;
                        const addOffset = rowOffset + addX * 4;
                        totalR += inputData[addOffset] - inputData[removeOffset];
                        totalG += inputData[addOffset + 1] - inputData[removeOffset + 1];
                        totalB += inputData[addOffset + 2] - inputData[removeOffset + 2];
                        totalA += inputData[addOffset + 3] - inputData[removeOffset + 3];
                    }
                }
            }
            return output;
        });
    }

    static percentileBlur(source, width, height, radius, percentile = 50) {
        radius = Math.max(0, Math.round(radius));
        if (!radius) return new ImageData(new Uint8ClampedArray(source.data), width, height);
        const output = new ImageData(width, height);
        const histograms = new Uint32Array(256 * 4);
        const targetRatio = this.clamp01(percentile / 100);
        const diameter = radius * 2 + 1;
        const count = diameter * diameter;
        const target = Math.floor((count - 1) * targetRatio);
        for (let y = 0; y < height; ++y) {
            histograms.fill(0);
            for (let dy = -radius; dy <= radius; ++dy) {
                const sy = Math.max(0, Math.min(height - 1, y + dy));
                for (let dx = -radius; dx <= radius; ++dx) {
                    const sx = Math.max(0, Math.min(width - 1, dx));
                    const sampleOffset = (sy * width + sx) * 4;
                    for (let channel = 0; channel < 4; ++channel) {
                        ++histograms[channel * 256 + source.data[sampleOffset + channel]];
                    }
                }
            }
            for (let x = 0; x < width; ++x) {
                const offset = (y * width + x) * 4;
                for (let channel = 0; channel < 4; ++channel) {
                    const histogramOffset = channel * 256;
                    let total = 0, value = 0;
                    while (value < 255 && total + histograms[histogramOffset + value] <= target) {
                        total += histograms[histogramOffset + value++];
                    }
                    output.data[offset + channel] = value;
                }
                if (x + 1 >= width) continue;
                const removeX = Math.max(0, x - radius);
                const addX = Math.min(width - 1, x + radius + 1);
                for (let dy = -radius; dy <= radius; ++dy) {
                    const sy = Math.max(0, Math.min(height - 1, y + dy));
                    const removeOffset = (sy * width + removeX) * 4;
                    const addOffset = (sy * width + addX) * 4;
                    for (let channel = 0; channel < 4; ++channel) {
                        --histograms[channel * 256 + source.data[removeOffset + channel]];
                        ++histograms[channel * 256 + source.data[addOffset + channel]];
                    }
                }
            }
        }
        return output;
    }

    static surfaceBlur(source, width, height, values) {
        const radius = Math.max(1, Math.round(values.radius));
        const threshold = values.threshold / 100 * 255;
        const output = new ImageData(width, height);
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const offset = (y * width + x) * 4;
            const centers = [source.data[offset], source.data[offset + 1],
                source.data[offset + 2], source.data[offset + 3]];
            const totals = [0, 0, 0, 0];
            const weightTotals = [0, 0, 0, 0];
            for (let dy = -radius; dy <= radius; ++dy) {
                const sy = Math.max(0, Math.min(height - 1, y + dy));
                for (let dx = -radius; dx <= radius; ++dx) {
                    const sx = Math.max(0, Math.min(width - 1, x + dx));
                    const sampleOffset = (sy * width + sx) * 4;
                    for (let channel = 0; channel < 4; ++channel) {
                        const sample = source.data[sampleOffset + channel];
                        const center = centers[channel];
                    const difference = Math.abs(sample - center);
                    if (difference <= threshold) {
                        const weight = 1 - difference / Math.max(1, threshold);
                            totals[channel] += sample * weight;
                            weightTotals[channel] += weight;
                        }
                    }
                }
            }
            for (let channel = 0; channel < 4; ++channel) {
                output.data[offset + channel] = weightTotals[channel]
                    ? totals[channel] / weightTotals[channel] : centers[channel];
            }
        }
        return output;
    }

    static reduceNoise(source, width, height, values) {
        const filtered = this.surfaceBlur(source, width, height,
            {radius: values.radius, threshold: Math.max(1, values.strength * 100)});
        const output = new ImageData(width, height);
        for (let i = 0; i < source.data.length; ++i) {
            output.data[i] = source.data[i] + (filtered.data[i] - source.data[i]) * values.strength;
        }
        return output;
    }

    static sketchBlur(source, width, height, values) {
        const percentile = this.percentileBlur(source, width, height, values.radius, values.percentile);
        return this.gaussianBlur(percentile, width, height, values.smoothness, 0);
    }

    static convolve(source, width, height, kernel, bias = 0) {
        const output = new ImageData(width, height);
        const size = Math.sqrt(kernel.length);
        const radius = Math.floor(size / 2);
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const destination = (y * width + x) * 4;
            const totals = [0, 0, 0];
            for (let ky = 0; ky < size; ++ky) {
                const sy = Math.max(0, Math.min(height - 1, y + ky - radius));
                for (let kx = 0; kx < size; ++kx) {
                    const sx = Math.max(0, Math.min(width - 1, x + kx - radius));
                    const sampleOffset = (sy * width + sx) * 4;
                    const weight = kernel[ky * size + kx];
                    totals[0] += source.data[sampleOffset] * weight;
                    totals[1] += source.data[sampleOffset + 1] * weight;
                    totals[2] += source.data[sampleOffset + 2] * weight;
                }
            }
            output.data[destination] = totals[0] + bias;
            output.data[destination + 1] = totals[1] + bias;
            output.data[destination + 2] = totals[2] + bias;
            output.data[destination + 3] = source.data[destination + 3];
        }
        return output;
    }

    static distort(source, width, height, amount, mapper) {
        const centerX = (width - 1) / 2;
        const centerY = (height - 1) / 2;
        const radius = Math.hypot(centerX, centerY);
        return this.mapImage(source, width, height, (x, y, output) => {
            const mapped = mapper(x - centerX, y - centerY, radius, amount);
            output[0] = mapped[0] + centerX;
            output[1] = mapped[1] + centerY;
        });
    }

    static dents(source, width, height, values) {
        const scale = Math.max(.1, values.scale);
        const angle = values.angle * Math.PI / 180;
        const cosine = Math.cos(angle), sine = Math.sin(angle);
        const refraction = values.refraction / 25;
        const octaves = Math.max(1, Math.round(1 + values.detail / 20));
        const noiseAt = (x, y) => {
            let sum = 0, amplitude = 1, normalization = 0, frequency = 1 / scale;
            for (let octave = 0; octave < octaves; ++octave) {
                sum += this.perlin(x * frequency, y * frequency, values.seed + octave) * amplitude;
                normalization += amplitude;
                frequency *= 2;
                amplitude *= .5 + values.turbulence / 200;
            }
            return sum / normalization;
        };
        return this.mapImage(source, width, height, (x, y, output) => {
            const rx = x * cosine - y * sine, ry = x * sine + y * cosine;
            const dx = noiseAt(rx + .5, ry) - noiseAt(rx - .5, ry);
            const dy = noiseAt(rx, ry + .5) - noiseAt(rx, ry - .5);
            output[0] = x + (dx * cosine + dy * sine) * refraction;
            output[1] = y + (-dx * sine + dy * cosine) * refraction;
        });
    }

    static pixelate(source, width, height, cellSize) {
        const cell = Math.max(1, Math.round(cellSize));
        const output = new ImageData(width, height);
        for (let top = 0; top < height; top += cell) for (let left = 0; left < width; left += cell) {
            const right = Math.min(width, left + cell), bottom = Math.min(height, top + cell);
            const totals = [0, 0, 0, 0];
            let count = 0;
            for (let y = top; y < bottom; ++y) for (let x = left; x < right; ++x) {
                const offset = (y * width + x) * 4;
                for (let channel = 0; channel < 4; ++channel) totals[channel] += source.data[offset + channel];
                ++count;
            }
            for (let y = top; y < bottom; ++y) for (let x = left; x < right; ++x) {
                const offset = (y * width + x) * 4;
                for (let channel = 0; channel < 4; ++channel) output.data[offset + channel] = totals[channel] / count;
            }
        }
        return output;
    }

    static quantize(source, width, height, values) {
        const histogram = new Map();
        for (let offset = 0; offset < source.data.length; offset += 4) {
            if (source.data[offset + 3] < values.alphaThreshold) continue;
            const key = (source.data[offset] >> 3) << 10 | (source.data[offset + 1] >> 3) << 5 | source.data[offset + 2] >> 3;
            const entry = histogram.get(key);
            if (entry) {
                ++entry.count;
                entry.r += source.data[offset]; entry.g += source.data[offset + 1]; entry.b += source.data[offset + 2];
            } else {
                histogram.set(key, {count: 1, r: source.data[offset], g: source.data[offset + 1], b: source.data[offset + 2]});
            }
        }
        const colors = [...histogram.values()].map(entry => ({
            count: entry.count, r: entry.r / entry.count, g: entry.g / entry.count, b: entry.b / entry.count
        }));
        if (colors.length === 0) return new ImageData(new Uint8ClampedArray(source.data), width, height);
        const boxes = [colors];
        const bounds = box => {
            let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0,total=0;
            for (const color of box) {
                minR=Math.min(minR,color.r); minG=Math.min(minG,color.g); minB=Math.min(minB,color.b);
                maxR=Math.max(maxR,color.r); maxG=Math.max(maxG,color.g); maxB=Math.max(maxB,color.b); total+=color.count;
            }
            return {ranges:[maxR-minR,maxG-minG,maxB-minB],total};
        };
        while (boxes.length < values.colors) {
            let splitIndex = -1, splitScore = -1, splitBounds = null;
            for (let i=0;i<boxes.length;++i) {
                if (boxes[i].length < 2) continue;
                const boxBounds=bounds(boxes[i]);
                const score=Math.max(...boxBounds.ranges)*boxBounds.total;
                if(score>splitScore){splitIndex=i;splitScore=score;splitBounds=boxBounds;}
            }
            if(splitIndex<0) break;
            const box=boxes.splice(splitIndex,1)[0];
            const channel=splitBounds.ranges.indexOf(Math.max(...splitBounds.ranges));
            const keys=["r","g","b"];
            box.sort((a,b)=>a[keys[channel]]-b[keys[channel]]);
            let cumulative=0, cut=1;
            for(;cut<box.length;++cut){cumulative+=box[cut-1].count;if(cumulative>=splitBounds.total/2)break;}
            boxes.push(box.slice(0,cut),box.slice(cut));
        }
        const palette=boxes.map(box=>{
            let count=0,r=0,g=0,b=0;
            for(const color of box){count+=color.count;r+=color.r*color.count;g+=color.g*color.count;b+=color.b*color.count;}
            return [r/count,g/count,b/count];
        });
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const errors = new Float32Array(source.data.length);
        const dither = values.dithering / 8;
        for(let y=0;y<height;++y) for(let x=0;x<width;++x){
            const offset=(y*width+x)*4;
            if(source.data[offset+3]<values.alphaThreshold){output.data[offset+3]=0;continue;}
            const rgb=[0,1,2].map(c=>Math.max(0,Math.min(255,source.data[offset+c]+errors[offset+c])));
            let nearest=palette[0],distance=Infinity;
            for(const color of palette){const d=(rgb[0]-color[0])**2+(rgb[1]-color[1])**2+(rgb[2]-color[2])**2;if(d<distance){distance=d;nearest=color;}}
            for(let c=0;c<3;++c){
                output.data[offset+c]=nearest[c];
                const error=(rgb[c]-nearest[c])*dither;
                if(x+1<width)errors[offset+4+c]+=error*7/16;
                if(y+1<height){if(x>0)errors[offset+(width-1)*4+c]+=error*3/16;errors[offset+width*4+c]+=error*5/16;if(x+1<width)errors[offset+(width+1)*4+c]+=error/16;}
            }
        }
        return output;
    }

    static hash32(value) {
        let state = (Math.imul(value >>> 0, 747796405) + 2891336453) >>> 0;
        const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0;
        return ((word >>> 22) ^ word) >>> 0;
    }

    static coordinateRandom(seed, x, y, stream = 0) {
        let value = this.hash32(seed ^ stream);
        value = (Math.imul(value, 33) ^ this.hash32(x)) >>> 0;
        value = (Math.imul(value, 33) ^ this.hash32(y)) >>> 0;
        return this.hash32(value) / 4294967296;
    }

    static crystalize(source, width, height, values) {
        const cell = Math.max(2, values.cell);
        const seed = values.seed | 0;
        return this.mapImage(source, width, height, (x, y, output) => {
            const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
            let bestDistance = Infinity, bestX = x, bestY = y;
            for (let oy = -1; oy <= 1; ++oy) for (let ox = -1; ox <= 1; ++ox) {
                const gx = cx + ox, gy = cy + oy;
                const fx = (gx + this.coordinateRandom(seed, gx, gy, 0x51ed)) * cell + .5;
                const fy = (gy + this.coordinateRandom(seed, gx, gy, 0xa7f3)) * cell + .5;
                const distance = (fx - x) ** 2 + (fy - y) ** 2;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestX = fx;
                    bestY = fy;
                }
            }
            output[0] = bestX;
            output[1] = bestY;
        });
    }

    static directionalBlur(source, width, height, distance, angle) {
        const output = new ImageData(width, height);
        const radians = angle * Math.PI / 180;
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        const samples = Math.min(31, Math.max(2, Math.round(distance) + 1));
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const offset = (y * width + x) * 4;
            const totals = [0, 0, 0, 0];
            for (let sample = 0; sample < samples; ++sample) {
                const delta = (sample / (samples - 1) - .5) * distance;
                const sx = Math.max(0, Math.min(width - 1, Math.round(x + cosine * delta)));
                const sy = Math.max(0, Math.min(height - 1, Math.round(y + sine * delta)));
                const sampleOffset = (sy * width + sx) * 4;
                totals[0] += source.data[sampleOffset];
                totals[1] += source.data[sampleOffset + 1];
                totals[2] += source.data[sampleOffset + 2];
                totals[3] += source.data[sampleOffset + 3];
            }
            for (let channel = 0; channel < 4; ++channel) output.data[offset + channel] = totals[channel] / samples;
        }
        return output;
    }

    static radialBlur(source, width, height, values) {
        const centerX = width / 2 + values.centerX / 200 * width;
        const centerY = height / 2 + values.centerY / 200 * height;
        const radians = values.angle * Math.PI / 180;
        const samples = 12;
        const cosines = new Float64Array(samples);
        const sines = new Float64Array(samples);
        for (let sample = 0; sample < samples; ++sample) {
            const angle = radians * (sample / (samples - 1) - .5);
            cosines[sample] = Math.cos(angle);
            sines[sample] = Math.sin(angle);
        }
        return this.averageMapped(source, width, height, (x, y, sample, output) => {
            const dx = x - centerX, dy = y - centerY;
            output[0] = centerX + dx * cosines[sample] - dy * sines[sample];
            output[1] = centerY + dx * sines[sample] + dy * cosines[sample];
        }, samples);
    }

    static zoomBlur(source, width, height, values) {
        const centerX = width / 2 + values.centerX / 200 * width;
        const centerY = height / 2 + values.centerY / 200 * height;
        const samples = 12;
        const scales = Array.from({length: samples}, (_, sample) =>
            1 / (1 + values.amount / 100 * sample / (samples - 1)));
        return this.averageMapped(source, width, height, (x, y, sample, output) => {
            output[0] = centerX + (x - centerX) * scales[sample];
            output[1] = centerY + (y - centerY) * scales[sample];
        }, samples);
    }

    static averageMapped(source, width, height, mapper, samples) {
        const output = new ImageData(width, height);
        const mapped = [0, 0];
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const offset = (y * width + x) * 4;
            const totals = [0, 0, 0, 0];
            for (let sample = 0; sample < samples; ++sample) {
                mapper(x, y, sample, mapped);
                const sx = Math.max(0, Math.min(width - 1, Math.round(mapped[0])));
                const sy = Math.max(0, Math.min(height - 1, Math.round(mapped[1])));
                const sampleOffset = (sy * width + sx) * 4;
                totals[0] += source.data[sampleOffset];
                totals[1] += source.data[sampleOffset + 1];
                totals[2] += source.data[sampleOffset + 2];
                totals[3] += source.data[sampleOffset + 3];
            }
            for (let channel = 0; channel < 4; ++channel) output.data[offset + channel] = totals[channel] / samples;
        }
        return output;
    }

    static fragment(source, width, height, values) {
        const samples = Math.min(16, values.fragments);
        const radians = values.rotation * Math.PI / 180;
        const offsets = Array.from({length: samples}, (_, sample) => {
            const angle = radians + sample * Math.PI * 2 / samples;
            return [Math.cos(angle) * values.distance, Math.sin(angle) * values.distance];
        });
        return this.averageMapped(source, width, height, (x, y, sample, output) => {
            output[0] = x + offsets[sample][0];
            output[1] = y + offsets[sample][1];
        }, samples);
    }

    static tile(source, width, height, values) {
        const radians = values.rotation * Math.PI / 180;
        const cosine = Math.cos(radians), sine = Math.sin(radians), size = values.tile;
        return this.mapImage(source, width, height, (x, y, output) => {
            let rx = x * cosine - y * sine;
            let ry = x * sine + y * cosine;
            const fold = coordinate => {
                let value = ((coordinate % (size * 2)) + size * 2) % (size * 2);
                if (value > size) value = size * 2 - value;
                return value;
            };
            const bend = values.curvature / 200;
            rx += Math.sin(ry * Math.PI / size) * size * bend;
            ry += Math.sin(rx * Math.PI / size) * size * bend;
            output[0] = fold(rx);
            output[1] = fold(ry);
        });
    }

    static frostedGlass(source, width, height, values) {
        const minimum = Math.min(values.minRadius, values.maxRadius);
        const maximum = Math.max(values.minRadius, values.maxRadius);
        const exponent = Math.max(.01, values.diffusion);
        const minPow = Math.pow(minimum, exponent), maxPow = Math.pow(maximum, exponent);
        const samples = Math.max(1, values.smoothness | 0);
        return this.averageMapped(source, width, height, (x, y, sample, output) => {
            const angle = this.coordinateRandom(values.seed, x, y, sample * 2) * Math.PI * 2;
            const randomRadius = this.coordinateRandom(values.seed, x, y, sample * 2 + 1);
            const radius = Math.pow(minPow + randomRadius * (maxPow - minPow), 1 / exponent);
            output[0] = x + Math.cos(angle) * radius;
            output[1] = y + Math.sin(angle) * radius;
        }, samples);
    }

    static addNoise(source, width, height, values) {
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const deviation = values.intensity * 1.275;
        const saturation = values.saturation / 100;
        const coverage = Utility.clamp(Number(values.coverage), 0, 100) / 100;
        if (deviation <= 0 || coverage <= 0) return output;

        // The effect visits every pixel in a fixed order, so a seeded stream is
        // deterministic without recalculating seven coordinate hashes per
        // pixel. A reusable Box-Muller table preserves the normal distribution
        // without evaluating logarithms and trigonometry for every pixel.
        const random = this.randomState(values.seed);
        const gaussian = this.getGaussianNoiseTable();
        const sourceData = source.data;
        const outputData = output.data;
        const fullCoverage = coverage >= 1;
        const coverageThreshold = coverage * 4294967296;
        for (let offset = 0; offset < sourceData.length; offset += 4) {
            if (!fullCoverage && random.nextUint32() >= coverageThreshold) continue;

            const redNoise = gaussian[random.nextUint32() & 0xffff];
            const greenNoise = gaussian[random.nextUint32() & 0xffff];
            const blueNoise = gaussian[random.nextUint32() & 0xffff];
            const luminance = redNoise * .299 + greenNoise * .587 + blueNoise * .114;

            outputData[offset] = sourceData[offset]
                + (luminance + (redNoise - luminance) * saturation) * deviation;
            outputData[offset + 1] = sourceData[offset + 1]
                + (luminance + (greenNoise - luminance) * saturation) * deviation;
            outputData[offset + 2] = sourceData[offset + 2]
                + (luminance + (blueNoise - luminance) * saturation) * deviation;
        }
        return output;
    }

    static sharpen(source, width, height, amount, threshold = 0) {
        const blurred = this.gaussianBlur(source, width, height, Math.max(.1, amount), 0);
        const output = new ImageData(width, height);
        const strength = amount / 2;
        for (let offset = 0; offset < source.data.length; ++offset) {
            const difference = source.data[offset] - blurred.data[offset];
            output.data[offset] = Math.abs(difference) / 255 < threshold
                ? source.data[offset]
                : source.data[offset] + difference * strength;
        }
        return output;
    }

    static glow(source, width, height, values) {
        const blurred = this.boxBlur(source, width, height, values.radius);
        const output = new ImageData(width, height);
        const contrast = 1 + values.contrast / 100;
        for (let offset = 0; offset < source.data.length; offset += 4) {
            for (let channel = 0; channel < 3; ++channel) {
                const screen = 255 - (255 - source.data[offset + channel]) * (255 - blurred.data[offset + channel]) / 255;
                output.data[offset + channel] = (screen - 127.5) * contrast + 127.5 + values.brightness;
            }
            output.data[offset + 3] = source.data[offset + 3];
        }
        return output;
    }

    static softenPortrait(source, width, height, values) {
        const output = this.boxBlur(source, width, height, values.softness);
        for (let offset = 0; offset < output.data.length; offset += 4) {
            output.data[offset] += values.lighting + values.warmth;
            output.data[offset + 1] += values.lighting;
            output.data[offset + 2] += values.lighting - values.warmth;
        }
        return output;
    }

    static rotate(source, width, height, angle) {
        const centerX = (width - 1) / 2, centerY = (height - 1) / 2;
        const radians = -angle * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
        return this.mapImage(source, width, height, (x, y, output) => {
            const dx = x - centerX, dy = y - centerY;
            output[0] = centerX + dx * cosine - dy * sine;
            output[1] = centerY + dx * sine + dy * cosine;
        });
    }

    static vignette(source, width, height, values) {
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const cx = width / 2, cy = height / 2;
        const maximum = Math.hypot(cx, cy) * values.radius;
        const start = maximum * .25;
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const amount = this.clamp01((Math.hypot(x - cx, y - cy) - start) / Math.max(1, maximum - start))
                * values.strength;
            const offset = (y * width + x) * 4;
            for (let channel = 0; channel < 3; ++channel) {
                output.data[offset + channel] = source.data[offset + channel] * (1 - amount);
            }
        }
        return output;
    }

    static oilPaint(source, width, height, values) {
        const radius = Math.max(1, Math.ceil(values.brush));
        const bins = Math.max(4, Math.min(256, Math.round(values.granularity * 252 + 4)));
        const output = new ImageData(width, height);
        const sourceData = source.data;
        const outputData = output.data;
        const pixelBins = new Uint16Array(width * height);
        for (let pixel = 0, offset = 0; pixel < pixelBins.length; ++pixel, offset += 4) {
            const intensity = (sourceData[offset] + sourceData[offset + 1]
                + sourceData[offset + 2]) / (3 * 256);
            pixelBins[pixel] = Math.min(bins - 1, Math.floor(intensity * bins));
        }

        const halfWidths = new Int32Array(radius * 2 + 1);
        const circleLimit = ((radius * 2 + 1) ** 2 + 2) / 4;
        for (let dy = -radius; dy <= radius; ++dy) {
            halfWidths[dy + radius] = values.kernel === "circle"
                ? Math.floor(Math.sqrt(Math.max(0, circleLimit - dy * dy)))
                : radius;
        }
        const counts = new Uint32Array(bins);
        const sums = new Float64Array(bins * 4);
        for (let y = 0; y < height; ++y) {
            counts.fill(0);
            sums.fill(0);
            for (let dy = -radius; dy <= radius; ++dy) {
                const sy = Math.max(0, Math.min(height - 1, y + dy));
                const halfWidth = halfWidths[dy + radius];
                for (let dx = -halfWidth; dx <= halfWidth; ++dx) {
                    const sx = Math.max(0, Math.min(width - 1, dx));
                    const pixel = sy * width + sx;
                    const offset = pixel * 4;
                    const bin = pixelBins[pixel];
                    ++counts[bin];
                    sums[bin * 4] += sourceData[offset];
                    sums[bin * 4 + 1] += sourceData[offset + 1];
                    sums[bin * 4 + 2] += sourceData[offset + 2];
                    sums[bin * 4 + 3] += sourceData[offset + 3];
                }
            }
            for (let x = 0; x < width; ++x) {
                let mode = 0;
                for (let bin = 1; bin < bins; ++bin) if (counts[bin] > counts[mode]) mode = bin;
                const destination = (y * width + x) * 4;
                const count = Math.max(1, counts[mode]);
                outputData[destination] = sums[mode * 4] / count;
                outputData[destination + 1] = sums[mode * 4 + 1] / count;
                outputData[destination + 2] = sums[mode * 4 + 2] / count;
                outputData[destination + 3] = sums[mode * 4 + 3] / count;

                if (x + 1 >= width) continue;
                for (let dy = -radius; dy <= radius; ++dy) {
                    const sy = Math.max(0, Math.min(height - 1, y + dy));
                    const halfWidth = halfWidths[dy + radius];
                    const removeX = Math.max(0, x - halfWidth);
                    const addX = Math.min(width - 1, x + halfWidth + 1);
                    const removePixel = sy * width + removeX;
                    const addPixel = sy * width + addX;
                    const removeOffset = removePixel * 4;
                    const addOffset = addPixel * 4;
                    const removeBin = pixelBins[removePixel];
                    const addBin = pixelBins[addPixel];
                    --counts[removeBin];
                    ++counts[addBin];
                    sums[removeBin * 4] -= sourceData[removeOffset];
                    sums[removeBin * 4 + 1] -= sourceData[removeOffset + 1];
                    sums[removeBin * 4 + 2] -= sourceData[removeOffset + 2];
                    sums[removeBin * 4 + 3] -= sourceData[removeOffset + 3];
                    sums[addBin * 4] += sourceData[addOffset];
                    sums[addBin * 4 + 1] += sourceData[addOffset + 1];
                    sums[addBin * 4 + 2] += sourceData[addOffset + 2];
                    sums[addBin * 4 + 3] += sourceData[addOffset + 3];
                }
            }
        }
        return output;
    }

    static inkSketch(source, width, height, values) {
        const kernel = [
            -1, -1, -5, -1, -1,
            -1, -1, -1, -1, -1,
            -1, -1, 30, -1, -1,
            -1, -1, -1, -1, -1,
            -1, -1, -1, -1, -1
        ];
        const edges = this.convolve(source, width, height, kernel, 0);
        const coloring = values.color / 100;
        const glow = this.glow(source, width, height, {
            radius: 6,
            brightness: -(coloring - .5) * 200,
            contrast: -(coloring - .5) * 200
        });
        const output = new ImageData(width, height);
        const threshold = values.ink / 100 * 255;
        for (let offset = 0; offset < source.data.length; offset += 4) {
            const edgeGray = edges.data[offset] * .299 + edges.data[offset + 1] * .587 + edges.data[offset + 2] * .114;
            const line = edgeGray > threshold ? 255 : 0;
            for (let channel = 0; channel < 3; ++channel) output.data[offset + channel] = Math.min(line, glow.data[offset + channel]);
            output.data[offset + 3] = source.data[offset + 3];
        }
        return output;
    }

    static pencilSketch(source, width, height, values) {
        const gray = new ImageData(width, height);
        for (let offset = 0; offset < source.data.length; offset += 4) {
            const value = source.data[offset] * .299 + source.data[offset + 1] * .587 + source.data[offset + 2] * .114;
            gray.data[offset] = gray.data[offset + 1] = gray.data[offset + 2] = value;
            gray.data[offset + 3] = source.data[offset + 3];
        }
        const blurred = this.gaussianBlur(source, width, height, values.tip * 1.5, 0);
        const output = new ImageData(width, height);
        for (let offset = 0; offset < source.data.length; offset += 4) {
            const blurredGray = blurred.data[offset] * .299 + blurred.data[offset + 1] * .587 + blurred.data[offset + 2] * .114;
            const adjusted = Math.max(0, Math.min(255, blurredGray + (values.range + 1) * 2.55));
            const inverted = 255 - adjusted;
            const base = gray.data[offset];
            const value = inverted >= 255 ? 255 : Math.min(255, base * 255 / (255 - inverted));
            output.data[offset] = output.data[offset + 1] = output.data[offset + 2] = value;
            output.data[offset + 3] = source.data[offset + 3];
        }
        return output;
    }

    static dropShadow(source, width, height, values) {
        const shadow = new ImageData(width, height);
        const radians = values.angle * Math.PI / 180;
        const offsetX = Math.cos(radians) * values.distance;
        const offsetY = -Math.sin(radians) * values.distance;
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const sx = x - offsetX, sy = y - offsetY;
            const offset = (y * width + x) * 4;
            shadow.data[offset + 3] = this.sampleLinear(source.data, width, height, sx, sy, 3) * values.opacity;
        }
        const blurred = this.gaussianBlur(shadow, width, height, values.blur, 0);
        if (values.shadowOnly) return blurred;
        const output = new ImageData(new Uint8ClampedArray(blurred.data), width, height);
        for (let offset = 0; offset < source.data.length; offset += 4) {
            const alpha = source.data[offset + 3] / 255;
            for (let channel = 0; channel < 3; ++channel) output.data[offset + channel] = source.data[offset + channel];
            output.data[offset + 3] = (alpha + output.data[offset + 3] / 255 * (1 - alpha)) * 255;
        }
        return output;
    }

    static morphology(source, width, height, values) {
        const output = new ImageData(width, height);
        const radiusX = Math.floor((values.width - 1) / 2);
        const radiusY = Math.floor(((values.linked ? values.width : values.height) - 1) / 2);
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const offset = (y * width + x) * 4;
            const results = values.mode === "dilate" ? [0, 0, 0, 0] : [255, 255, 255, 255];
            for (let dy = -radiusY; dy <= radiusY; ++dy) {
                const sy = Math.max(0, Math.min(height - 1, y + dy));
                for (let dx = -radiusX; dx <= radiusX; ++dx) {
                    const sx = Math.max(0, Math.min(width - 1, x + dx));
                    const sampleOffset = (sy * width + sx) * 4;
                    for (let channel = 0; channel < 4; ++channel) {
                        results[channel] = values.mode === "dilate"
                            ? Math.max(results[channel], source.data[sampleOffset + channel])
                            : Math.min(results[channel], source.data[sampleOffset + channel]);
                    }
                }
            }
            for (let channel = 0; channel < 4; ++channel) output.data[offset + channel] = results[channel];
        }
        return output;
    }

    static outline(source, width, height, values) {
        const edges = this.convolve(source, width, height, [-1,-1,-1,-1,8,-1,-1,-1,-1], 0);
        const output = values.thickness > 1 ? this.boxBlur(edges, width, height, values.thickness / 2) : edges;
        for (let offset = 0; offset < output.data.length; offset += 4) {
            for (let channel = 0; channel < 3; ++channel) output.data[offset + channel] *= values.intensity / 100;
        }
        return output;
    }

    static clouds(_source, width, height, values) {
        const output = new ImageData(width, height);
        const noise = new Float64Array(width * height);
        let amplitude = 1;
        let divisor = Math.floor(values.scale);
        for (let octave = 0; octave < 12 && amplitude > .03 && divisor > 0; ++octave) {
            this.accumulatePerlinOctave(noise, width, height, divisor,
                values.seed + octave, amplitude);
            divisor >>= 1;
            amplitude *= values.roughness;
        }
        for (let pixel = 0, offset = 0; pixel < noise.length; ++pixel, offset += 4) {
            const color = this.clamp01((noise[pixel] + 1) / 2) * 255;
            output.data[offset] = output.data[offset + 1] = output.data[offset + 2] = color;
            output.data[offset + 3] = 255;
        }
        return output;
    }

    static accumulatePerlinOctave(output, width, height, divisor, seed, amplitude) {
        // All pixels in an octave reuse a comparatively small lattice of
        // gradient vectors. Precompute those gradients once instead of hashing
        // and evaluating sin/cos four times per pixel.
        const xCells = new Int32Array(width);
        const xFractions = new Float64Array(width);
        const xFades = new Float64Array(width);
        const yCells = new Int32Array(height);
        const yFractions = new Float64Array(height);
        const yFades = new Float64Array(height);
        let minCellX = Infinity, maxCellX = -Infinity;
        let minCellY = Infinity, maxCellY = -Infinity;
        const fade = value => value * value * value * (value * (value * 6 - 15) + 10);
        for (let x = 0; x < width; ++x) {
            const coordinate = (2 * x - width) / divisor;
            const cell = Math.floor(coordinate);
            const fraction = coordinate - cell;
            xCells[x] = cell;
            xFractions[x] = fraction;
            xFades[x] = fade(fraction);
            minCellX = Math.min(minCellX, cell);
            maxCellX = Math.max(maxCellX, cell);
        }
        for (let y = 0; y < height; ++y) {
            const coordinate = (2 * y - height) / divisor;
            const cell = Math.floor(coordinate);
            const fraction = coordinate - cell;
            yCells[y] = cell;
            yFractions[y] = fraction;
            yFades[y] = fade(fraction);
            minCellY = Math.min(minCellY, cell);
            maxCellY = Math.max(maxCellY, cell);
        }

        const latticeWidth = maxCellX - minCellX + 2;
        const latticeHeight = maxCellY - minCellY + 2;
        const gradientX = new Float64Array(latticeWidth * latticeHeight);
        const gradientY = new Float64Array(latticeWidth * latticeHeight);
        for (let gy = 0; gy < latticeHeight; ++gy) for (let gx = 0; gx < latticeWidth; ++gx) {
            const cellX = minCellX + gx;
            const cellY = minCellY + gy;
            const hash = this.hash32((cellX & 0xffff)
                ^ Math.imul(cellY & 0xffff, 0x45d9f3b) ^ seed);
            const angle = hash / 4294967296 * Math.PI * 2;
            const index = gy * latticeWidth + gx;
            gradientX[index] = Math.cos(angle);
            gradientY[index] = Math.sin(angle);
        }

        const rootTwo = 1.41421356237;
        for (let y = 0, pixel = 0; y < height; ++y) {
            const gy = yCells[y] - minCellY;
            const ty = yFractions[y];
            const v = yFades[y];
            for (let x = 0; x < width; ++x, ++pixel) {
                const gx = xCells[x] - minCellX;
                const tx = xFractions[x];
                const u = xFades[x];
                const topLeft = gy * latticeWidth + gx;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + latticeWidth;
                const bottomRight = bottomLeft + 1;
                const top = (gradientX[topLeft] * tx + gradientY[topLeft] * ty) * (1 - u)
                    + (gradientX[topRight] * (tx - 1) + gradientY[topRight] * ty) * u;
                const bottom = (gradientX[bottomLeft] * tx + gradientY[bottomLeft] * (ty - 1)) * (1 - u)
                    + (gradientX[bottomRight] * (tx - 1) + gradientY[bottomRight] * (ty - 1)) * u;
                output[pixel] += (top * (1 - v) + bottom * v) * rootTwo * amplitude;
            }
        }
    }

    static perlin(x, y, seed) {
        const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
        const fade = value => value ** 3 * (value * (value * 6 - 15) + 10);
        const gradient = (gx, gy, dx, dy) => {
            const hash = this.hash32((gx & 0xffff) ^ Math.imul(gy & 0xffff, 0x45d9f3b) ^ seed);
            const angle = hash / 4294967296 * Math.PI * 2;
            return Math.cos(angle) * dx + Math.sin(angle) * dy;
        };
        const u = fade(tx), v = fade(ty);
        const top = gradient(x0, y0, tx, ty) * (1 - u) + gradient(x0 + 1, y0, tx - 1, ty) * u;
        const bottom = gradient(x0, y0 + 1, tx, ty - 1) * (1 - u)
            + gradient(x0 + 1, y0 + 1, tx - 1, ty - 1) * u;
        return (top * (1 - v) + bottom * v) * 1.41421356237;
    }

    static turbulence(width, height, values) {
        const output = new ImageData(width, height);
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            let sum = 0, amplitude = 1, normalization = 0, frequency = 1 / values.period;
            for (let octave = 0; octave < values.octaves; ++octave) {
                let noise = this.perlin(x * frequency, y * frequency, values.seed + octave);
                if (values.noise === "turbulence") noise = Math.abs(noise) * 2 - 1;
                sum += noise * amplitude;
                normalization += amplitude;
                amplitude *= .5;
                frequency *= 2;
            }
            const value = this.clamp01(sum / normalization * .5 + .5) * 255;
            const offset = (y * width + x) * 4;
            output.data[offset] = output.data[offset + 1] = output.data[offset + 2] = value;
            output.data[offset + 3] = 255;
        }
        return output;
    }

    static fractal(width, height, values, julia) {
        const output = new ImageData(width, height);
        const scale = 4 / values.zoom;
        const iterations = Math.min(300, values.iterations);
        for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
            const px = (x / width - .5) * scale;
            const py = (y / height - .5) * scale;
            let zx = julia ? px : 0, zy = julia ? py : 0;
            const cx = julia ? -.745 : px, cy = julia ? .113 : py;
            let count = 0;
            while (zx * zx + zy * zy <= 4 && count < iterations) {
                const nextX = zx * zx - zy * zy + cx;
                zy = 2 * zx * zy + cy; zx = nextX; ++count;
            }
            const value = count === iterations ? 0 : count / iterations * 255 * 8;
            const offset = (y * width + x) * 4;
            output.data[offset] = value;
            output.data[offset + 1] = value * .55;
            output.data[offset + 2] = 255 - value;
            output.data[offset + 3] = 255;
        }
        return output;
    }

    static clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > .5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h, s, l];
    }

    static hslToRgb(h, s, l) {
        if (s === 0) return [l * 255, l * 255, l * 255];
        const q = l < .5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue = t => {
            if (t < 0) ++t;
            if (t > 1) --t;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
    }
}
