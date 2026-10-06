class ToolMenu extends StripPanel {

    constructor() {
        super("toolMenu", {
            items: [
                new ToolSelector(),
                new HorizontalSeparator(),
            ]
        });

        this.optionsElement = null;
        this.app.on("app:active_tool_updated", tool => this.renderOptions(tool));
    }

    initialize(parent) {
        super.initialize(parent);
        this.optionsElement = document.createElement("div");
        this.optionsElement.className = "tool-options";
        this.element.appendChild(this.optionsElement);
        this.renderOptions(this.app.getActiveTool());
    }

    getOptionDefinitions(type) {
        const choices = (label, key, values, width = null, toolbar = false, split = false) => (
            {kind: "select", label, key, values, width, toolbar, split}
        );
        const number = (label, key, min, max, step = 1, suffix = "") => (
            {kind: "number", label, key, min, max, step, suffix}
        );
        const size = (label, key, min, max, step = 1) => ({kind: "size", label, key, min, max, step});
        const slider = (label, key, min, max, step = 1) => ({kind: "slider", label, key, min, max, step});
        const iconChoice = (label, key, values, width = 35, showText = false) => (
            {kind: "iconChoice", label, key, values, width, showText}
        );
        const iconGroup = (label, key, values) => ({kind: "iconGroup", label, key, values});
        const toggle = (label, key) => ({kind: "toggle", label, key});
        const section = definition => Object.assign(definition, {section: true});
        const combine = iconGroup("", "combineMode", [
            ["replace", "Replace", "enum_selection_combine_mode_replace.png"],
            ["union", "Add (union)", "enum_selection_combine_mode_union.png"],
            ["exclude", "Subtract", "enum_selection_combine_mode_exclude.png"],
            ["intersect", "Intersect", "enum_selection_combine_mode_intersect.png"],
            ["xor", "Invert (xor)", "enum_selection_combine_mode_xor.png"]
        ]);
        const quality = iconChoice("", "renderingQuality", [
            ["high", "Antialiased selection quality", "enum_selection_rendering_quality_high_quality_antialiased.png"],
            ["aliased", "Pixelated selection quality", "enum_selection_rendering_quality_aliased.png"]
        ]);
        const antialias = iconChoice("", "antialias", [
            [true, "Antialiased rendering", "anti_aliasing_true.png"],
            [false, "Aliased rendering", "anti_aliasing_false.png"]
        ]);
        const smoothing = iconChoice("", "smoothing", [
            [true, "Smoothed path", "enum_input_path_smoothing_enabled.png"],
            [false, "Unsmoothed path", "enum_input_path_smoothing_disabled.png"]
        ]);
        const alphaMode = iconChoice("", "alphaMode", [
            ["premultiplied", "Premultiplied", "enum_tolerance_alpha_mode_premultiplied.png"],
            ["straight", "Straight", "enum_tolerance_alpha_mode_straight.png"]
        ]);
        const sampleScope = iconChoice("Sampling:", "sampleMode", [
            ["layer", "Layer", "sample_all_layers_false.png"],
            ["image", "Image", "sample_all_layers_true.png"]
        ], 70, true);
        const blend = {
            kind: "select", label: "", key: "blendMode", icon: "alpha_blending_true.png", width: 82,
            toolbar: true,
            values: [
                ["normal", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"],
                ["overlay", "Overlay"], ["darken", "Darken"], ["lighten", "Lighten"],
                ["colorDodge", "Color Dodge"], ["colorBurn", "Color Burn"],
                ["hardLight", "Hard Light"], ["softLight", "Soft Light"],
                ["difference", "Difference"], ["exclusion", "Exclusion"],
                ["hue", "Hue"], ["saturation", "Saturation"],
                ["color", "Color"], ["luminosity", "Luminosity"]
            ]
        };
        const finish = {kind: "action", label: "Finish", icon: "tool_strip_checked.png"};
        const fillStyles = [
            ["solid", "Solid Color"],
            ["backwardDiagonal", "Backward Diagonal"],
            ["forwardDiagonal", "Forward Diagonal"],
            ["horizontal", "Horizontal"],
            ["vertical", "Vertical"],
            ["cross", "Cross"],
            ["diagonalCross", "Diagonal Cross"],
            ...[5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]
                .map(value => ["percent" + String(value).padStart(2, "0"), value + "%"]),
            ["lightDownwardDiagonal", "Light Downward Diagonal"],
            ["lightUpwardDiagonal", "Light Upward Diagonal"],
            ["darkDownwardDiagonal", "Dark Downward Diagonal"],
            ["darkUpwardDiagonal", "Dark Upward Diagonal"],
            ["wideDownwardDiagonal", "Wide Downward Diagonal"],
            ["wideUpwardDiagonal", "Wide Upward Diagonal"],
            ["lightHorizontal", "Light Horizontal"], ["lightVertical", "Light Vertical"],
            ["narrowHorizontal", "Narrow Horizontal"], ["narrowVertical", "Narrow Vertical"],
            ["darkHorizontal", "Dark Horizontal"], ["darkVertical", "Dark Vertical"],
            ["dashedDownwardDiagonal", "Dashed Downward Diagonal"],
            ["dashedUpwardDiagonal", "Dashed Upward Diagonal"],
            ["dashedHorizontal", "Dashed Horizontal"],
            ["dashedVertical", "Dashed Vertical"],
            ["smallConfetti", "Small Confetti"], ["largeConfetti", "Large Confetti"],
            ["zigZag", "Zig Zag"], ["wave", "Wave"], ["diagonalBrick", "Diagonal Brick"],
            ["horizontalBrick", "Horizontal Brick"], ["weave", "Weave"], ["plaid", "Plaid"],
            ["divot", "Divot"], ["dottedGrid", "Dotted Grid"], ["dottedDiamond", "Dotted Diamond"],
            ["shingle", "Shingle"], ["trellis", "Trellis"], ["sphere", "Sphere"],
            ["smallGrid", "Small Grid"], ["smallCheckerBoard", "Small Checker Board"],
            ["largeCheckerBoard", "Large Checker Board"], ["outlinedDiamond", "Outlined Diamond"],
            ["solidDiamond", "Solid Diamond"]
        ];
        const brushControls = (fill = false, blending = false) => {
            const result = [
                choices("Brush:", "brushType", [["circle", "Circle"], ["square", "Square"]], 86, true),
                size("Brush size:", "width", 1, 500, 1),
                iconChoice("", "pressure", [
                    [false, "Pressure sensitivity disabled", "tool_config_strip_brush_enable_pressure_sensitivity_false.png"],
                    [true, "Pressure sensitivity enabled", "tool_config_strip_brush_enable_pressure_sensitivity_true.png"]
                ]),
                slider("Hardness:", "hardness", 0, 100, 1),
                slider("Spacing:", "spacing", 1, 200, 1)
            ];
            if (fill) result.push(section(choices("Fill:", "fillStyle", fillStyles, 150)));
            result.push(section(smoothing), antialias);
            if (blending) result.push(blend);
            result.push(quality);
            return result;
        };

        switch (type.getId()) {
            case "rectangleSelectTool":
                const rectangleOptions = [
                    combine,
                    section(iconChoice("", "selectionMode", [
                        ["normal", "Any Size", "enum_selection_draw_mode_normal.png"],
                        ["fixedSize", "Fixed Size", "enum_selection_draw_mode_fixed_size.png"],
                        ["fixedRatio", "Fixed Ratio", "enum_selection_draw_mode_fixed_ratio.png"]
                    ], 86, true))
                ];
                if (type.getSetting("selectionMode") !== "normal") {
                    rectangleOptions.push(number("Width:", "selectionWidth", 1, 100000, 1));
                    rectangleOptions.push(number("Height:", "selectionHeight", 1, 100000, 1));
                }
                return rectangleOptions;
            case "lassoSelectTool":
            case "ellipseSelectTool":
                return [combine];
            case "moveSelectionTool":
                return [finish];
            case "moveTool":
                return [
                    choices("Sampling:", "resampling", [
                        ["nearest", "Nearest Neighbor"],
                        ["linear", "Bilinear"],
                        ["multisampleLinear", "Multisample Bilinear"],
                        ["anisotropic", "Anisotropic"],
                        ["highQualityCubic", "Bicubic"]
                    ], 166, true, true),
                    section(iconChoice("", "gammaCorrected", [
                        [true, "Gamma Corrected", "enum_tool_gamma_mode_linear.png"],
                        [false, "Companded", "enum_tool_gamma_mode_companded.png"]
                    ])),
                    section(finish)
                ];
            case "zoomTool":
            case "panTool":
                return [];
            case "paintBrushTool":
                return brushControls(true, true);
            case "eraserTool":
                return brushControls(false, false);
            case "cloneStampTool":
                return brushControls(false, true);
            case "pencilTool":
                return [blend];
            case "paintBucketTool":
                return [
                    iconChoice("Flood Mode:", "floodMode", [
                        ["contiguous", "Contiguous", "enum_flood_mode_local.png"],
                        ["global", "Global", "enum_flood_mode_global.png"]
                    ]),
                    section(choices("Fill:", "fillStyle", fillStyles, 150)),
                    section(slider("Tolerance:", "tolerance", 0, 100, 1)),
                    alphaMode, section(sampleScope), section(antialias), blend, quality, section(finish)
                ];
            case "magicWandTool":
                return [
                    combine,
                    section(iconChoice("Flood Mode:", "floodMode", [
                        ["contiguous", "Contiguous", "enum_flood_mode_local.png"],
                        ["global", "Global", "enum_flood_mode_global.png"]
                    ])),
                    section(slider("Tolerance:", "tolerance", 0, 100, 1)),
                    alphaMode, section(sampleScope), section(finish)
                ];
            case "colorPickerTool":
                return [
                    sampleScope,
                    iconChoice("", "sampleSize", [
                        [1, "Single Pixel", "enum_pixel_sample_mode_point_sample.png"],
                        [3, "3 x 3 Average", "enum_pixel_sample_mode_average3x3.png"],
                        [5, "5 x 5 Average", "enum_pixel_sample_mode_average5x5.png"],
                        [11, "11 x 11 Average", "enum_pixel_sample_mode_average11x11.png"],
                        [31, "31 x 31 Average", "enum_pixel_sample_mode_average31x31.png"],
                        [51, "51 x 51 Average", "enum_pixel_sample_mode_average51x51.png"]
                    ], 101, true),
                    section(iconChoice("After click:", "afterClick", [
                        ["none", "Do not switch tool", "enum_color_picker_click_behavior_no_tool_switch.png"],
                        ["previous", "Switch to previous tool", "enum_color_picker_click_behavior_switch_to_last_tool.png"],
                        ["pencil", "Switch to Pencil tool", "enum_color_picker_click_behavior_switch_to_pencil_tool.png"]
                    ], 139, true))
                ];
            case "gradientTool":
                return [
                    iconGroup("", "gradientType", [
                        ["linear", "Linear", "enum_gradient_type_linear_clamped.png"],
                        ["reflected", "Linear (Reflected)", "enum_gradient_type_linear_reflected.png"],
                        ["diamond", "Diamond", "enum_gradient_type_linear_diamond.png"],
                        ["radial", "Radial", "enum_gradient_type_radial.png"],
                        ["conical", "Conical", "enum_gradient_type_conical.png"],
                        ["spiral", "Spiral (Clockwise)", "enum_gradient_type_spiral.png"],
                        ["spiralCounter", "Spiral (Counter Clockwise)", "enum_gradient_type_spiral_counter_clockwise.png"]
                    ]),
                    section(iconChoice("", "gradientMode", [
                        ["color", "Color Mode", "gradient_is_alpha_only_false.png"],
                        ["transparency", "Transparency Mode", "gradient_is_alpha_only_true.png"]
                    ])),
                    iconChoice("", "repeatMode", [
                        ["none", "No Repeat", "enum_gradient_repeat_type_no_repeat.png"],
                        ["wrapped", "Repeat Wrapped", "enum_gradient_repeat_type_repeat_wrapped.png"],
                        ["reflected", "Repeat Reflected", "enum_gradient_repeat_type_repeat_reflected.png"]
                    ], 97, true),
                    section(antialias), blend, quality, section(finish)
                ];
            case "recolorTool":
                return [
                    size("Brush size:", "width", 1, 500),
                    slider("Hardness:", "hardness", 0, 100, 1),
                    slider("Spacing:", "spacing", 1, 200, 1),
                    section(slider("Tolerance:", "tolerance", 0, 100, 1)),
                    alphaMode,
                    section(iconGroup("", "recolorSampling", [
                        ["once", "Sampling: Once", "enum_recolor_tool_sampling_mode_once.png"],
                        ["secondary", "Sampling: Secondary Color", "enum_recolor_tool_sampling_mode_secondary_color.png"]
                    ])),
                    section(smoothing), antialias, quality
                ];
            case "lineTool":
                return [
                    iconGroup("", "curveType", [
                        ["straight", "Straight line", "enum_curve_type_straight.png"],
                        ["spline", "Spline", "enum_curve_type_spline.png"],
                        ["bezier", "Bézier", "enum_curve_type_bezier.png"]
                    ]),
                    section(size("Brush size:", "width", 1, 500)),
                    iconChoice("Style:", "startCap", [
                        ["flat", "Flat", "enum_line_curve_cap_flat_start.png"],
                        ["arrow", "Arrow", "enum_line_curve_cap_arrow_start.png"],
                        ["filledArrow", "Filled Arrow", "enum_line_curve_cap_arrow_filled_start.png"],
                        ["round", "Rounded", "enum_line_curve_cap_rounded_start.png"]
                    ]),
                    iconChoice("", "dash", [
                        ["solid", "Solid", "enum_dash_style_solid.png"],
                        ["dash", "Dash", "enum_dash_style_dash.png"],
                        ["dot", "Dot", "enum_dash_style_dot.png"],
                        ["dashDot", "Dash Dot", "enum_dash_style_dash_dot.png"],
                        ["dashDotDot", "Dash Dot Dot", "enum_dash_style_dash_dot_dot.png"]
                    ], 47),
                    iconChoice("", "endCap", [
                        ["flat", "Flat", "enum_line_curve_cap_flat_end.png"],
                        ["arrow", "Arrow", "enum_line_curve_cap_arrow_end.png"],
                        ["filledArrow", "Filled Arrow", "enum_line_curve_cap_arrow_filled_end.png"],
                        ["round", "Rounded", "enum_line_curve_cap_rounded_end.png"]
                    ]),
                    section(choices("Fill:", "fillStyle", fillStyles, 150)),
                    section(antialias), blend, quality, section(finish)
                ];
            case "shapesTool": {
                const shapeOptions = [
                    choices("", "shape", [
                        ["rectangle", "Rectangle"], ["roundedRectangle", "Rounded rectangle"],
                        ["ellipse", "Ellipse"], ["triangle", "Triangle"],
                        ["rightTriangle", "Right triangle"], ["diamond", "Diamond"],
                        ["trapezoid", "Trapezoid"], ["parallelogram", "Parallelogram"],
                        ["pentagon", "Pentagon"], ["hexagon", "Hexagon"],
                        ["heptagon", "Heptagon"], ["octagon", "Octagon"],
                        ["star3", "3-point star"], ["star4", "4-point star"],
                        ["star5", "5-point star"], ["star6", "6-point star"],
                        ["blockArrow", "Block arrow"], ["notchedArrow", "Notched arrow"],
                        ["pentagonArrow", "Pentagon arrow"], ["chevronArrow", "Chevron arrow"],
                        ["checkMark", "Check mark"], ["multiply", "Multiply"],
                        ["heart", "Heart"], ["lightningBolt", "Lightning bolt"],
                        ["gear", "Gear"], ["rectangularCallout", "Rectangular callout"],
                        ["roundedCallout", "Rounded rectangular callout"],
                        ["ellipticalCallout", "Elliptical callout"], ["cloudCallout", "Cloud callout"]
                    ], 126, true),
                    iconChoice("", "drawType", [
                        ["outline", "Draw Shape Outline", "enum_shape_draw_type_outline.png"],
                        ["fill", "Draw Filled Shape", "enum_shape_draw_type_interior.png"],
                        ["both", "Draw Filled Shape with Outline", "enum_shape_draw_type_both.png"]
                    ]),
                    section(size("Brush size:", "width", 1, 500)),
                    iconChoice("Style:", "dash", [
                        ["solid", "Solid", "enum_dash_style_solid.png"],
                        ["dash", "Dash", "enum_dash_style_dash.png"],
                        ["dot", "Dot", "enum_dash_style_dot.png"],
                        ["dashDot", "Dash Dot", "enum_dash_style_dash_dot.png"],
                        ["dashDotDot", "Dash Dot Dot", "enum_dash_style_dash_dot_dot.png"]
                    ], 47),
                ];
                if (type.getSetting("shape") === "roundedRectangle") {
                    shapeOptions.push(number("Radius:", "radius", 0, 2000, 1));
                }
                shapeOptions.push(
                    section(choices("Fill:", "fillStyle", fillStyles, 150)),
                    section(antialias), blend, quality, section(finish)
                );
                return shapeOptions;
            }
            case "textTool":
                return [
                    choices("Font:", "fontFamily", [["Calibri", "Calibri"], ["Segoe UI", "Segoe UI"], ["Arial", "Arial"], ["serif", "Serif"], ["monospace", "Monospace"]], 140),
                    size("", "fontSize", 1, 500, 1),
                    iconChoice("", "fontUnit", [
                        ["points", "Points (image DPI)", "enum_font_size_metric_points.png"],
                        ["pixels", "Pixels", "enum_font_size_metric_fixed96_dpi.png"]
                    ]),
                    section(toggle("B", "bold")), toggle("I", "italic"), toggle("U", "underline"), toggle("S", "strikeout"),
                    choices("", "textRendering", [["smooth", "Smooth"], ["sharp", "Sharp"], ["aliased", "Aliased"]], 68, true),
                    section(iconGroup("", "align", [
                        ["left", "Align Left", "enum_text_alignment_left.png"],
                        ["center", "Center Align", "enum_text_alignment_center.png"],
                        ["right", "Align Right", "enum_text_alignment_right.png"]
                    ])),
                    section(antialias), blend, quality, section(finish)
                ];
            default:
                return [];
        }
    }

    renderOptions(tool) {
        if (this.optionsElement === null) return;
        ToolOptionDropdown.closeActive();
        this.optionsElement.innerHTML = "";
        if (tool === null) return;

        const type = tool.getType();
        for (const definition of this.getOptionDefinitions(type)) {
            const group = document.createElement("label");
            group.className = "tool-option";
            if (definition.section) {
                group.classList.add("tool-option-section");
            }
            if (definition.key) group.dataset.optionKey = definition.key;

            const label = document.createElement("span");
            label.textContent = definition.label;
            group.appendChild(label);

            let control;
            if (definition.kind === "select") {
                control = new ToolOptionDropdown({
                    values: definition.values,
                    value: type.getSetting(definition.key),
                    width: definition.width || 130,
                    toolbar: definition.toolbar,
                    leadingIcon: definition.icon,
                    menuIcons: false,
                    cycleOnMainClick: definition.split,
                    menuCheckmarks: definition.split,
                    onChange: value => this.updateSetting(type, definition.key, value)
                }).getElement();
            } else if (definition.kind === "size") {
                control = document.createElement("div");
                control.className = "tool-size-control";

                const input = document.createElement("input");
                input.type = "number";
                input.min = definition.min;
                input.max = definition.max;
                input.step = definition.step;
                input.value = type.getSetting(definition.key);

                const change = value => {
                    value = Utility.clamp(Number(value), definition.min, definition.max);
                    input.value = value;
                    this.updateSetting(type, definition.key, value);
                };
                input.oninput = () => {
                    if (input.value !== "" && Number.isFinite(Number(input.value))) {
                        this.updateSetting(type, definition.key,
                            Utility.clamp(Number(input.value), definition.min, definition.max));
                    }
                };
                input.onchange = () => change(input.value || definition.min);
                control.appendChild(this.createImageButton("minus_button_icon.png", "Decrease " + definition.label,
                    () => change(Number(type.getSetting(definition.key)) - definition.step)));
                control.appendChild(input);
                control.appendChild(this.createImageButton("plus_button_icon.png", "Increase " + definition.label,
                    () => change(Number(type.getSetting(definition.key)) + definition.step)));
            } else if (definition.kind === "slider") {
                control = document.createElement("div");
                control.className = "tool-slider-control";
                const meter = document.createElement("div");
                meter.className = "tool-slider-meter";
                const fill = document.createElement("div");
                fill.className = "tool-slider-fill";
                const valueLabel = document.createElement("span");
                valueLabel.className = "tool-slider-value";
                const input = document.createElement("input");
                input.type = "range";
                input.min = definition.min;
                input.max = definition.max;
                input.step = definition.step;
                input.value = type.getSetting(definition.key);
                input.title = `${definition.label} ${input.value}`;
                const updateMeter = value => {
                    const progress = (value - definition.min) / (definition.max - definition.min) * 100;
                    fill.style.width = Utility.clamp(progress, 0, 100) + "%";
                    valueLabel.textContent = value + "%";
                };
                const change = value => {
                    value = Utility.clamp(Number(value), definition.min, definition.max);
                    input.value = value;
                    input.title = `${definition.label} ${value}`;
                    updateMeter(value);
                    this.updateSetting(type, definition.key, value);
                };
                input.oninput = () => change(input.value);
                control.appendChild(this.createImageButton("minus_button_icon.png", "Decrease " + definition.label,
                    () => change(Number(type.getSetting(definition.key)) - definition.step)));
                meter.appendChild(fill);
                meter.appendChild(valueLabel);
                meter.appendChild(input);
                control.appendChild(meter);
                control.appendChild(this.createImageButton("plus_button_icon.png", "Increase " + definition.label,
                    () => change(Number(type.getSetting(definition.key)) + definition.step)));
                updateMeter(Number(input.value));
            } else if (definition.kind === "iconGroup") {
                control = document.createElement("div");
                control.className = "tool-icon-group";
                const update = () => {
                    for (let i = 0; i < control.children.length; ++i) {
                        control.children[i].toggleAttribute("active",
                            definition.values[i][0] === type.getSetting(definition.key));
                    }
                };
                for (const [value, text, iconName] of definition.values) {
                    const button = this.createImageButton(iconName, text, () => {
                        this.updateSetting(type, definition.key, value);
                        update();
                    });
                    control.appendChild(button);
                }
                update();
            } else if (definition.kind === "iconChoice") {
                control = new ToolOptionDropdown({
                    values: definition.values,
                    value: type.getSetting(definition.key),
                    width: definition.width,
                    toolbar: true,
                    iconOnly: !definition.showText,
                    menuIcons: true,
                    menuWidth: 174,
                    cycleOnMainClick: definition.split,
                    menuCheckmarks: definition.split,
                    onChange: value => this.updateSetting(type, definition.key, value)
                }).getElement();
            } else if (definition.kind === "action") {
                control = this.createImageButton(definition.icon, definition.label, () => {
                    const activeTool = this.app.getActiveTool();
                    if (activeTool !== null && typeof activeTool.commitPending === "function"
                        && (activeTool.pending || activeTool.tracking)) {
                        activeTool.commitPending();
                    } else if (activeTool !== null && activeTool.tracking && typeof activeTool.commitStroke === "function") {
                        activeTool.commitStroke();
                    } else if (activeTool !== null && activeTool.context?.lifted
                        && typeof activeTool.drop === "function") {
                        activeTool.drop();
                    }
                });
                control.classList.add("tool-finish-button");
                const text = document.createElement("span");
                text.textContent = definition.label;
                control.appendChild(text);
                label.textContent = "";
            } else if (definition.kind === "number") {
                control = document.createElement("input");
                control.type = "number";
                control.min = definition.min;
                control.max = definition.max;
                control.step = definition.step;
                control.value = type.getSetting(definition.key);
                control.oninput = () => {
                    if (control.value === "") return;
                    const value = Number(control.value);
                    if (Number.isFinite(value)) {
                        this.updateSetting(type, definition.key,
                            Utility.clamp(value, definition.min, definition.max));
                    }
                };
                control.onchange = () => {
                    const entered = Number(control.value);
                    const value = Utility.clamp(Number.isFinite(entered) ? entered : definition.min,
                        definition.min, definition.max);
                    control.value = value;
                    this.updateSetting(type, definition.key, value);
                };
            } else {
                control = document.createElement("button");
                control.type = "button";
                control.className = "tool-option-toggle";
                control.textContent = definition.label;
                label.textContent = "";
                const updatePressed = () => control.toggleAttribute("active", !!type.getSetting(definition.key));
                updatePressed();
                control.onclick = () => {
                    this.updateSetting(type, definition.key, !type.getSetting(definition.key));
                    updatePressed();
                };
            }
            if (definition.width !== null && definition.width !== undefined) {
                control.style.width = definition.width + "px";
                control.style.minWidth = definition.width + "px";
            }
            if (!control.title) control.title = definition.label;
            group.appendChild(control);

            if (definition.suffix) {
                const suffix = document.createElement("span");
                suffix.textContent = definition.suffix;
                group.appendChild(suffix);
            }
            this.optionsElement.appendChild(group);
        }
    }

    updateSetting(type, key, value) {
        type.setSetting(key, value);
        this.app.fire("app:tool_setting_changed", type, key, value);
        const activeTool = this.app.getActiveTool();
        if (activeTool !== null && activeTool.getType() === type
            && typeof activeTool.onSettingChanged === "function") {
            activeTool.onSettingChanged(key, value);
        }
        if (key === "selectionMode" || key === "shape") this.renderOptions(activeTool);
    }

    createImageButton(iconName, title, callback) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-image-button";
        button.title = title;
        const icon = document.createElement("img");
        icon.src = "assets/icons/" + iconName;
        button.appendChild(icon);
        button.onclick = callback;
        return button;
    }

}
