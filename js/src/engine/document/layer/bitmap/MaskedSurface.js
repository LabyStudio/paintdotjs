class MaskedSurface {

    constructor(surface, path, deferMaskUntilRender = false, sourceOrigin = null) {
        if (!(surface instanceof Surface) || !(path instanceof GraphicsPath)) {
            throw new Error("MaskedSurface requires a Surface and GraphicsPath");
        }

        this.path = path.clone();
        this.shadowPath = path.clone();
        this.disposed = false;
        this.linearSurface = null;
        this.sourcePixels = null;
        this.gpuTexture = null;
        this.deferMaskUntilRender = deferMaskUntilRender;
        this.compositeCanvas = null;

        const originX = sourceOrigin === null ? 0 : sourceOrigin.x;
        const originY = sourceOrigin === null ? 0 : sourceOrigin.y;
        const pathBounds = path.getBounds();
        this.bounds = Rectangle.intersect(
            Rectangle.absolute(
                Math.floor(pathBounds.getLeft()),
                Math.floor(pathBounds.getTop()),
                Math.ceil(pathBounds.getRight()),
                Math.ceil(pathBounds.getBottom())
            ),
            new Rectangle(originX, originY, surface.getWidth(), surface.getHeight())
        );
        this.rectangleMaskBounds = deferMaskUntilRender
            ? this.getRectangleMaskBounds(path) : null;
        this.rectangularMask = this.rectangleMaskBounds !== null;
        this.sampleMinimumX = this.rectangularMask
            ? Math.ceil(this.rectangleMaskBounds.getLeft() - this.bounds.x - 0.5) : 0;
        this.sampleMinimumY = this.rectangularMask
            ? Math.ceil(this.rectangleMaskBounds.getTop() - this.bounds.y - 0.5) : 0;
        this.sampleMaximumX = this.rectangularMask
            ? Math.floor(this.rectangleMaskBounds.getRight() - this.bounds.x - 0.5)
            : this.bounds.width - 1;
        this.sampleMaximumY = this.rectangularMask
            ? Math.floor(this.rectangleMaskBounds.getBottom() - this.bounds.y - 0.5)
            : this.bounds.height - 1;

        if (this.bounds.isEmpty()) {
            this.surface = null;
            return;
        }

        this.surface = Surface.create(this.bounds.width, this.bounds.height);
        const context = this.surface.context;
        if (deferMaskUntilRender) {
            // Paint.NET resamples the rectangular source extent first and applies
            // the transformed selection coverage afterwards. Baking transparency
            // into this bitmap would make rotation interpolate transparent edge
            // texels and produce a visible halo around a moved selection.
            context.drawImage(surface.canvas, originX - this.bounds.x, originY - this.bounds.y);
        } else {
            context.save();
            context.translate(-this.bounds.x, -this.bounds.y);
            this.tracePath(context, path);
            context.clip("evenodd");
            context.drawImage(surface.canvas, originX, originY);
            context.restore();
        }
    }

    tracePath(context, path) {
        context.beginPath();
        for (const vertexList of path.getVertexLists()) {
            const vertices = vertexList.getVertices();
            if (vertices.length === 0) continue;
            context.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; ++i) {
                context.lineTo(vertices[i].x, vertices[i].y);
            }
            context.closePath();
        }
    }

    getRectangleMaskBounds(path) {
        const lists = path.getVertexLists();
        if (lists.length !== 1) return null;
        const vertices = lists[0].getVertices();
        const points = vertices.length > 1
            && vertices[0].x === vertices[vertices.length - 1].x
            && vertices[0].y === vertices[vertices.length - 1].y
            ? vertices.slice(0, -1) : vertices;
        if (points.length !== 4) return null;
        const pathBounds = path.getBounds();
        const left = pathBounds.getLeft();
        const top = pathBounds.getTop();
        const right = pathBounds.getRight();
        const bottom = pathBounds.getBottom();
        const isRectangle = points.every(point => (point.x === left || point.x === right)
            && (point.y === top || point.y === bottom))
            && new Set(points.map(point => `${point.x},${point.y}`)).size === 4;
        return isRectangle ? pathBounds : null;
    }

    eraseFrom(targetSurface) {
        if (this.surface === null) return;
        if (typeof targetSurface.getSurface === "function") targetSurface = targetSurface.getSurface();

        // Erase with the selection mask, not with the lifted bitmap. Using the
        // bitmap's alpha as an eraser only removes part of an anti-aliased pixel
        // (for example, 50% alpha becomes 25%) and leaves a ghost at the source.
        const context = targetSurface.context;
        context.save();
        context.globalCompositeOperation = "destination-out";
        context.globalAlpha = 1;
        context.fillStyle = "#000";
        this.tracePath(context, this.path);
        context.fill("evenodd");
        context.restore();
    }

    render(targetSurface, transform, sampling, gammaCorrected = false, fullQuality = true,
           renderingQuality = "high") {
        if (this.disposed) throw new Error("MaskedSurface has been disposed");
        if (this.surface === null || !transform.isInvertible()) return;

        if (typeof targetSurface.getSurface === "function") targetSurface = targetSurface.getSurface();
        const m = transform.getElements();
        const integerTranslation = m[0][0] === 1 && m[0][1] === 0
            && m[1][0] === 0 && m[1][1] === 1
            && Number.isInteger(m[0][2]) && Number.isInteger(m[1][2]);
        if (integerTranslation) sampling = ResamplingAlgorithm.NEAREST_NEIGHBOR;

        if (sampling !== ResamplingAlgorithm.NEAREST_NEIGHBOR
            && this.renderResampledGpu(targetSurface, transform, sampling, gammaCorrected,
                renderingQuality)) {
            return;
        }

        // Keep the synchronous software implementation only as a final-frame
        // fallback for systems where WebGL2 is unavailable.
        if (sampling !== ResamplingAlgorithm.NEAREST_NEIGHBOR && fullQuality) {
            this.renderResampled(targetSurface, transform, sampling, gammaCorrected,
                renderingQuality);
            return;
        }
        const context = targetSurface.context;
        context.save();
        context.imageSmoothingEnabled = sampling !== ResamplingAlgorithm.NEAREST_NEIGHBOR;
        context.imageSmoothingQuality = this.getCanvasSmoothingQuality(sampling);
        context.setTransform(m[0][0], m[1][0], m[0][1], m[1][1], m[0][2], m[1][2]);
        if (this.deferMaskUntilRender) {
            this.tracePath(context, this.path);
            context.clip("evenodd");
        }
        context.drawImage(this.surface.canvas, this.bounds.x, this.bounds.y);
        context.restore();
    }

    renderResampledGpu(targetSurface, transform, sampling, gammaCorrected, renderingQuality) {
        const renderer = MaskedSurface.getGpuRenderer();
        if (renderer === null) return false;

        const destinationBounds = this.getTransformedBounds(transform, targetSurface);
        if (destinationBounds.isEmpty()) return true;
        const gl = renderer.gl;
        const maximumSize = renderer.maximumTextureSize;
        if (this.surface.width > maximumSize || this.surface.height > maximumSize
            || destinationBounds.width > maximumSize || destinationBounds.height > maximumSize) {
            return false;
        }

        if (this.gpuTexture === null) {
            this.gpuTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.gpuTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            // Source coordinates throughout the editor are top-down. Canvas
            // uploads already place their first row at texel row 0 for
            // texelFetch(), so an unpack flip would invert moved content.
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
                this.surface.canvas);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.gpuTexture);
        }

        const canvas = renderer.canvas;
        if (canvas.width !== destinationBounds.width) canvas.width = destinationBounds.width;
        if (canvas.height !== destinationBounds.height) canvas.height = destinationBounds.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(renderer.program);
        gl.bindVertexArray(renderer.vertexArray);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.gpuTexture);

        const m = transform.getElements();
        const determinant = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        const inverseA = m[1][1] / determinant;
        const inverseC = -m[0][1] / determinant;
        const inverseB = -m[1][0] / determinant;
        const inverseD = m[0][0] / determinant;
        const footprintXLength = Math.hypot(inverseA, inverseB);
        const footprintYLength = Math.hypot(inverseC, inverseD);
        const anisotropicX = footprintXLength >= footprintYLength ? inverseA : inverseC;
        const anisotropicY = footprintXLength >= footprintYLength ? inverseB : inverseD;
        const anisotropicSamples = Utility.clamp(
            Math.ceil(Math.max(footprintXLength, footprintYLength)), 1, 16);

        gl.uniform1i(renderer.uniforms.source, 0);
        gl.uniform2f(renderer.uniforms.sourceSize, this.surface.width, this.surface.height);
        gl.uniform2f(renderer.uniforms.sourceOrigin, this.bounds.x, this.bounds.y);
        gl.uniform2f(renderer.uniforms.destinationOrigin, destinationBounds.x, destinationBounds.y);
        gl.uniform2f(renderer.uniforms.destinationSize, destinationBounds.width, destinationBounds.height);
        gl.uniform2f(renderer.uniforms.translation, m[0][2], m[1][2]);
        renderer.inverseValues[0] = inverseA;
        renderer.inverseValues[1] = inverseB;
        renderer.inverseValues[2] = inverseC;
        renderer.inverseValues[3] = inverseD;
        gl.uniformMatrix2fv(renderer.uniforms.inverse, false, renderer.inverseValues);
        gl.uniform1i(renderer.uniforms.mode, sampling);
        gl.uniform1i(renderer.uniforms.gammaCorrected, gammaCorrected ? 1 : 0);
        gl.uniform1i(renderer.uniforms.anisotropicSamples, anisotropicSamples);
        gl.uniform2f(renderer.uniforms.anisotropicVector, anisotropicX, anisotropicY);
        gl.uniform1i(renderer.uniforms.rectangleMask, this.rectangularMask
            ? (renderingQuality === "aliased" ? 2 : 1)
            : (this.deferMaskUntilRender ? 3 : 0));
        if (this.rectangleMaskBounds !== null) {
            gl.uniform2f(renderer.uniforms.maskMinimum,
                this.rectangleMaskBounds.getLeft() - this.bounds.x - 0.5,
                this.rectangleMaskBounds.getTop() - this.bounds.y - 0.5);
            gl.uniform2f(renderer.uniforms.maskMaximum,
                this.rectangleMaskBounds.getRight() - this.bounds.x - 0.5,
                this.rectangleMaskBounds.getBottom() - this.bounds.y - 0.5);
        } else {
            gl.uniform2f(renderer.uniforms.maskMinimum, -0.5, -0.5);
            gl.uniform2f(renderer.uniforms.maskMaximum,
                this.surface.width - 0.5, this.surface.height - 0.5);
        }
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.drawRenderedCanvas(targetSurface, canvas, destinationBounds, transform,
            this.rectangularMask);
        return true;
    }

    drawRenderedCanvas(targetSurface, renderedCanvas, destinationBounds, transform,
                       maskAlreadyApplied = false) {
        if (!this.deferMaskUntilRender || maskAlreadyApplied) {
            const targetContext = targetSurface.context;
            targetContext.save();
            // The renderer canvas is transparent outside the rotated shape.
            // It must be composited over the layer; using (or inheriting)
            // source-copy clears the complete axis-aligned render bounds.
            targetContext.globalCompositeOperation = "source-over";
            targetContext.globalAlpha = 1;
            targetContext.drawImage(renderedCanvas, destinationBounds.x, destinationBounds.y);
            targetContext.restore();
            return;
        }

        if (this.compositeCanvas === null) this.compositeCanvas = document.createElement("canvas");
        const canvas = this.compositeCanvas;
        if (canvas.width !== destinationBounds.width) canvas.width = destinationBounds.width;
        if (canvas.height !== destinationBounds.height) canvas.height = destinationBounds.height;
        const context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "copy";
        context.drawImage(renderedCanvas, 0, 0);

        // Remove everything outside the transformed selection. This is a final
        // coverage operation, separate from image interpolation, matching the
        // source-content + coverage-mask pipeline used by Paint.NET.
        context.globalCompositeOperation = "destination-out";
        context.beginPath();
        context.rect(0, 0, canvas.width, canvas.height);
        const m = transform.getElements();
        context.setTransform(
            m[0][0], m[1][0], m[0][1], m[1][1],
            m[0][2] - destinationBounds.x, m[1][2] - destinationBounds.y
        );
        for (const vertexList of this.path.getVertexLists()) {
            const vertices = vertexList.getVertices();
            if (vertices.length === 0) continue;
            context.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; ++i) {
                context.lineTo(vertices[i].x, vertices[i].y);
            }
            context.closePath();
        }
        context.fill("evenodd");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "source-over";

        const targetContext = targetSurface.context;
        targetContext.save();
        targetContext.globalCompositeOperation = "source-over";
        targetContext.globalAlpha = 1;
        targetContext.drawImage(canvas, destinationBounds.x, destinationBounds.y);
        targetContext.restore();
    }

    static getGpuRenderer() {
        if (MaskedSurface.gpuRenderer !== undefined) return MaskedSurface.gpuRenderer;
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl2", {
                alpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                desynchronized: true
            });
            if (gl === null) {
                MaskedSurface.gpuRenderer = null;
                return null;
            }

            const vertexSource = `#version 300 es
                const vec2 positions[3] = vec2[3](
                    vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
                void main() {
                    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
                }`;
            const fragmentSource = `#version 300 es
                precision highp float;
                precision highp int;

                uniform sampler2D uSource;
                uniform vec2 uSourceSize;
                uniform vec2 uSourceOrigin;
                uniform vec2 uDestinationOrigin;
                uniform vec2 uDestinationSize;
                uniform vec2 uTranslation;
                uniform mat2 uInverse;
                uniform int uMode;
                uniform bool uGammaCorrected;
                uniform int uAnisotropicSamples;
                uniform vec2 uAnisotropicVector;
                uniform int uRectangleMask;
                uniform vec2 uMaskMinimum;
                uniform vec2 uMaskMaximum;
                out vec4 outputColor;

                vec3 toLinear(vec3 value) {
                    bvec3 low = lessThanEqual(value, vec3(0.04045));
                    vec3 lower = value / 12.92;
                    vec3 upper = pow((value + 0.055) / 1.055, vec3(2.4));
                    return mix(upper, lower, low);
                }

                vec3 toSrgb(vec3 value) {
                    bvec3 low = lessThanEqual(value, vec3(0.0031308));
                    vec3 lower = value * 12.92;
                    vec3 upper = 1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
                    return mix(upper, lower, low);
                }

                vec4 texel(ivec2 position) {
                    ivec2 minimum = ivec2(0);
                    ivec2 maximum = ivec2(uSourceSize) - 1;
                    if (uRectangleMask == 1 || uRectangleMask == 2) {
                        // A fractional selection may make the backing crop one
                        // texel larger than the actual selected pixel extent.
                        // Clamp interpolation to the selected texels so cubic
                        // and linear taps cannot pull transparent crop padding
                        // into the rotated edge.
                        minimum = max(minimum, ivec2(ceil(uMaskMinimum)));
                        maximum = min(maximum, ivec2(floor(uMaskMaximum)));
                    }
                    position = clamp(position, minimum, maximum);
                    vec4 value = texelFetch(uSource, position, 0);
                    if (uGammaCorrected) value.rgb = toLinear(value.rgb);
                    value.rgb *= value.a;
                    return value;
                }

                vec4 bilinear(vec2 position) {
                    ivec2 base = ivec2(floor(position));
                    vec2 fraction = fract(position);
                    return mix(
                        mix(texel(base), texel(base + ivec2(1, 0)), fraction.x),
                        mix(texel(base + ivec2(0, 1)), texel(base + ivec2(1, 1)), fraction.x),
                        fraction.y);
                }

                float cubicWeight(float value) {
                    float x = abs(value);
                    if (x <= 1.0) return 1.5 * x * x * x - 2.5 * x * x + 1.0;
                    if (x < 2.0) return -0.5 * x * x * x + 2.5 * x * x - 4.0 * x + 2.0;
                    return 0.0;
                }

                vec4 bicubic(vec2 position) {
                    ivec2 center = ivec2(floor(position));
                    vec4 result = vec4(0.0);
                    for (int y = -1; y <= 2; ++y) {
                        float weightY = cubicWeight(position.y - float(center.y + y));
                        for (int x = -1; x <= 2; ++x) {
                            float weightX = cubicWeight(position.x - float(center.x + x));
                            result += texel(center + ivec2(x, y)) * weightX * weightY;
                        }
                    }
                    return result;
                }

                void main() {
                    vec2 destination = vec2(
                        uDestinationOrigin.x + gl_FragCoord.x,
                        uDestinationOrigin.y + uDestinationSize.y - gl_FragCoord.y);
                    vec2 source = uInverse * (destination - uTranslation) - uSourceOrigin - 0.5;
                    float coverage = 1.0;
                    if (uRectangleMask == 1) {
                        coverage = 0.0;
                        for (int coverageY = 0; coverageY < 4; ++coverageY) {
                            for (int coverageX = 0; coverageX < 4; ++coverageX) {
                                vec2 offset = vec2(
                                    (float(coverageX) + 0.5) * 0.25 - 0.5,
                                    (float(coverageY) + 0.5) * 0.25 - 0.5);
                                vec2 coverageSource = source + uInverse * offset;
                                if (coverageSource.x >= uMaskMinimum.x
                                    && coverageSource.y >= uMaskMinimum.y
                                    && coverageSource.x <= uMaskMaximum.x
                                    && coverageSource.y <= uMaskMaximum.y) {
                                    coverage += 1.0 / 16.0;
                                }
                            }
                        }
                    } else if (uRectangleMask == 2
                        && (source.x < uMaskMinimum.x || source.y < uMaskMinimum.y
                            || source.x > uMaskMaximum.x || source.y > uMaskMaximum.y)) {
                        outputColor = vec4(0.0);
                        return;
                    } else if (uRectangleMask == 0
                        && (source.x < -0.5 || source.y < -0.5
                            || source.x > uSourceSize.x - 0.5
                            || source.y > uSourceSize.y - 0.5)) {
                        outputColor = vec4(0.0);
                        return;
                    }
                    if (coverage == 0.0) {
                        outputColor = vec4(0.0);
                        return;
                    }

                    vec4 value = vec4(0.0);
                    if (uMode == 5) {
                        value = bicubic(source);
                    } else if (uMode == 3) {
                        for (int y = 0; y < 2; ++y) {
                            for (int x = 0; x < 2; ++x) {
                                vec2 offset = vec2(float(x), float(y)) * 0.5 - 0.25;
                                value += bilinear(source + uInverse * offset) * 0.25;
                            }
                        }
                    } else if (uMode == 4) {
                        for (int sampleIndex = 0; sampleIndex < 16; ++sampleIndex) {
                            if (sampleIndex >= uAnisotropicSamples) break;
                            float offset = (float(sampleIndex) + 0.5)
                                / float(uAnisotropicSamples) - 0.5;
                            value += bilinear(source + uAnisotropicVector * offset)
                                / float(uAnisotropicSamples);
                        }
                    } else {
                        value = bilinear(source);
                    }

                    float alpha = clamp(value.a, 0.0, 1.0) * coverage;
                    if (alpha <= 1.0 / 65535.0) {
                        outputColor = vec4(0.0);
                        return;
                    }
                    vec3 color = clamp(value.rgb / value.a, 0.0, 1.0);
                    if (uGammaCorrected) color = toSrgb(color);
                    outputColor = vec4(clamp(color, 0.0, 1.0), alpha);
                }`;

            const compileShader = (type, source) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    throw new Error(gl.getShaderInfoLog(shader));
                }
                return shader;
            };
            const program = gl.createProgram();
            gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
            gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program));
            }
            const uniform = name => gl.getUniformLocation(program, name);
            MaskedSurface.gpuRenderer = {
                canvas,
                gl,
                program,
                vertexArray: gl.createVertexArray(),
                maximumTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                inverseValues: new Float32Array(4),
                uniforms: {
                    source: uniform("uSource"),
                    sourceSize: uniform("uSourceSize"),
                    sourceOrigin: uniform("uSourceOrigin"),
                    destinationOrigin: uniform("uDestinationOrigin"),
                    destinationSize: uniform("uDestinationSize"),
                    translation: uniform("uTranslation"),
                    inverse: uniform("uInverse"),
                    mode: uniform("uMode"),
                    gammaCorrected: uniform("uGammaCorrected"),
                    anisotropicSamples: uniform("uAnisotropicSamples"),
                    anisotropicVector: uniform("uAnisotropicVector"),
                    rectangleMask: uniform("uRectangleMask"),
                    maskMinimum: uniform("uMaskMinimum"),
                    maskMaximum: uniform("uMaskMaximum")
                }
            };
        } catch (error) {
            console.warn("GPU resampling is unavailable; using the software fallback.", error);
            MaskedSurface.gpuRenderer = null;
        }
        return MaskedSurface.gpuRenderer;
    }

    getTransformedBounds(transform, targetSurface) {
        const m = transform.getElements();
        const left = this.bounds.getLeft();
        const top = this.bounds.getTop();
        const right = this.bounds.getRight();
        const bottom = this.bounds.getBottom();
        const x1 = m[0][0] * left + m[0][1] * top + m[0][2];
        const y1 = m[1][0] * left + m[1][1] * top + m[1][2];
        const x2 = m[0][0] * right + m[0][1] * top + m[0][2];
        const y2 = m[1][0] * right + m[1][1] * top + m[1][2];
        const x3 = m[0][0] * right + m[0][1] * bottom + m[0][2];
        const y3 = m[1][0] * right + m[1][1] * bottom + m[1][2];
        const x4 = m[0][0] * left + m[0][1] * bottom + m[0][2];
        const y4 = m[1][0] * left + m[1][1] * bottom + m[1][2];
        const bounds = Rectangle.intersect(Utility.roundRectangle(Rectangle.absolute(
            Math.min(x1, x2, x3, x4) - 2,
            Math.min(y1, y2, y3, y4) - 2,
            Math.max(x1, x2, x3, x4) + 2,
            Math.max(y1, y2, y3, y4) + 2
        )), targetSurface.getBounds());
        return bounds;
    }

    renderResampled(targetSurface, transform, sampling, gammaCorrected, renderingQuality) {
        const destinationBounds = this.getTransformedBounds(transform, targetSurface);
        if (destinationBounds.isEmpty()) return;

        const rendered = Surface.create(destinationBounds.width, destinationBounds.height);
        const output = rendered.context.createImageData(rendered.width, rendered.height);
        const source = this.getSourcePixels();
        const m = transform.getElements();
        const determinant = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        const inverseA = m[1][1] / determinant;
        const inverseC = -m[0][1] / determinant;
        const inverseB = -m[1][0] / determinant;
        const inverseD = m[0][0] / determinant;
        const footprintXLength = Math.hypot(inverseA, inverseB);
        const footprintYLength = Math.hypot(inverseC, inverseD);
        const anisotropicX = footprintXLength >= footprintYLength ? inverseA : inverseC;
        const anisotropicY = footprintXLength >= footprintYLength ? inverseB : inverseD;
        const anisotropicSamples = Utility.clamp(
            Math.ceil(Math.max(footprintXLength, footprintYLength)), 1, 16);
        const toLinear = gammaCorrected ? MaskedSurface.getToLinearLut() : null;
        const accumulator = new Float64Array(4);
        let outputOffset = 0;

        for (let y = 0; y < rendered.height; ++y) {
            const destinationY = destinationBounds.y + y + 0.5;
            for (let x = 0; x < rendered.width; ++x) {
                const destinationX = destinationBounds.x + x + 0.5;
                const translatedX = destinationX - m[0][2];
                const translatedY = destinationY - m[1][2];
                const sourceX = inverseA * translatedX + inverseC * translatedY
                    - this.bounds.x - 0.5;
                const sourceY = inverseB * translatedX + inverseD * translatedY
                    - this.bounds.y - 0.5;
                accumulator.fill(0);

                // Direct2D's hard border keeps interpolation inside the input
                // extent, but does not paint outside the transformed image.
                if (!this.deferMaskUntilRender
                    && (sourceX < -0.5 || sourceY < -0.5
                    || sourceX > source.width - 0.5 || sourceY > source.height - 0.5)) {
                    outputOffset += 4;
                    continue;
                }

                if (sampling === ResamplingAlgorithm.HIGH_QUALITY_CUBIC) {
                    this.sampleBicubic(source, sourceX, sourceY, toLinear, accumulator, 1);
                } else if (sampling === ResamplingAlgorithm.MULTISAMPLE_LINEAR) {
                    // Direct2D's multisample-linear mode evaluates four evenly
                    // distributed points in each destination pixel.
                    for (let sampleY = 0; sampleY < 2; ++sampleY) {
                        const offsetY = sampleY * 0.5 - 0.25;
                        for (let sampleX = 0; sampleX < 2; ++sampleX) {
                            const offsetX = sampleX * 0.5 - 0.25;
                            this.sampleBilinear(source,
                                sourceX + inverseA * offsetX + inverseC * offsetY,
                                sourceY + inverseB * offsetX + inverseD * offsetY,
                                toLinear, accumulator, 0.25);
                        }
                    }
                } else if (sampling === ResamplingAlgorithm.ANISOTROPIC) {
                    // Follow the longest axis of the transformed pixel
                    // footprint. Upscaling needs one bilinear sample; strong
                    // or non-uniform downscaling receives up to 16 taps.
                    for (let sample = 0; sample < anisotropicSamples; ++sample) {
                        const offset = (sample + 0.5) / anisotropicSamples - 0.5;
                        this.sampleBilinear(source,
                            sourceX + anisotropicX * offset,
                            sourceY + anisotropicY * offset,
                            toLinear, accumulator, 1 / anisotropicSamples);
                    }
                } else {
                    this.sampleBilinear(source, sourceX, sourceY, toLinear, accumulator, 1);
                }

                this.writeSample(output.data, outputOffset, accumulator, gammaCorrected);
                outputOffset += 4;
            }
        }
        rendered.context.putImageData(output, 0, 0);
        this.drawRenderedCanvas(targetSurface, rendered.canvas, destinationBounds, transform);
        rendered.dispose();
    }

    getSourcePixels() {
        if (this.sourcePixels === null) {
            this.sourcePixels = this.surface.context.getImageData(
                0, 0, this.surface.width, this.surface.height);
        }
        return this.sourcePixels;
    }

    addTexel(source, x, y, toLinear, accumulator, weight) {
        if (weight === 0) return;
        x = Utility.clamp(x, this.sampleMinimumX,
            Math.min(this.sampleMaximumX, source.width - 1));
        y = Utility.clamp(y, this.sampleMinimumY,
            Math.min(this.sampleMaximumY, source.height - 1));
        const offset = (y * source.width + x) * 4;
        const alpha = source.data[offset + 3] / 255;
        if (alpha === 0) return;
        accumulator[0] += (toLinear === null ? source.data[offset] : toLinear[source.data[offset]])
            * alpha * weight;
        accumulator[1] += (toLinear === null ? source.data[offset + 1] : toLinear[source.data[offset + 1]])
            * alpha * weight;
        accumulator[2] += (toLinear === null ? source.data[offset + 2] : toLinear[source.data[offset + 2]])
            * alpha * weight;
        accumulator[3] += alpha * weight;
    }

    sampleBilinear(source, x, y, toLinear, accumulator, weight) {
        const left = Math.floor(x);
        const top = Math.floor(y);
        const fractionX = x - left;
        const fractionY = y - top;
        this.addTexel(source, left, top, toLinear, accumulator,
            (1 - fractionX) * (1 - fractionY) * weight);
        this.addTexel(source, left + 1, top, toLinear, accumulator,
            fractionX * (1 - fractionY) * weight);
        this.addTexel(source, left, top + 1, toLinear, accumulator,
            (1 - fractionX) * fractionY * weight);
        this.addTexel(source, left + 1, top + 1, toLinear, accumulator,
            fractionX * fractionY * weight);
    }

    sampleBicubic(source, x, y, toLinear, accumulator, weight) {
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        for (let sampleY = centerY - 1; sampleY <= centerY + 2; ++sampleY) {
            const weightY = MaskedSurface.cubicWeight(y - sampleY);
            for (let sampleX = centerX - 1; sampleX <= centerX + 2; ++sampleX) {
                const sampleWeight = MaskedSurface.cubicWeight(x - sampleX) * weightY * weight;
                this.addTexel(source, sampleX, sampleY, toLinear, accumulator, sampleWeight);
            }
        }
    }

    writeSample(destination, offset, accumulator, gammaCorrected) {
        const alpha = Utility.clamp(accumulator[3], 0, 1);
        if (alpha <= 1 / 65535) return;
        for (let channel = 0; channel < 3; ++channel) {
            let value = Utility.clamp(accumulator[channel] / accumulator[3], 0, 255);
            if (gammaCorrected) value = MaskedSurface.linearToSrgb(value / 255) * 255;
            destination[offset + channel] = Math.round(value);
        }
        destination[offset + 3] = Math.round(alpha * 255);
    }

    static cubicWeight(value) {
        // Catmull-Rom cubic convolution. Its small amount of controlled
        // overshoot is what gives Paint.NET's high-quality cubic mode its
        // visibly sharper result than the three linear families.
        const x = Math.abs(value);
        if (x <= 1) return 1.5 * x * x * x - 2.5 * x * x + 1;
        if (x < 2) return -0.5 * x * x * x + 2.5 * x * x - 4 * x + 2;
        return 0;
    }

    static linearToSrgb(value) {
        return value <= 0.0031308
            ? value * 12.92
            : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }

    getLinearSurface() {
        if (this.linearSurface !== null) return this.linearSurface;
        this.linearSurface = this.surface.clone();
        const pixels = this.linearSurface.context.getImageData(
            0, 0, this.linearSurface.width, this.linearSurface.height
        );
        const toLinear = MaskedSurface.getToLinearLut();
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = toLinear[pixels.data[i]];
            pixels.data[i + 1] = toLinear[pixels.data[i + 1]];
            pixels.data[i + 2] = toLinear[pixels.data[i + 2]];
        }
        this.linearSurface.context.putImageData(pixels, 0, 0);
        return this.linearSurface;
    }

    static getToLinearLut() {
        if (MaskedSurface.toLinearLut === undefined) {
            MaskedSurface.toLinearLut = Uint8ClampedArray.from({length: 256}, (_, value) => {
                const normalized = value / 255;
                const linear = normalized <= 0.04045
                    ? normalized / 12.92
                    : Math.pow((normalized + 0.055) / 1.055, 2.4);
                return Math.round(linear * 255);
            });
        }
        return MaskedSurface.toLinearLut;
    }

    static getToSrgbLut() {
        if (MaskedSurface.toSrgbLut === undefined) {
            MaskedSurface.toSrgbLut = Uint8ClampedArray.from({length: 256}, (_, value) => {
                const normalized = value / 255;
                const srgb = normalized <= 0.0031308
                    ? normalized * 12.92
                    : 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
                return Math.round(srgb * 255);
            });
        }
        return MaskedSurface.toSrgbLut;
    }

    getCanvasSmoothingQuality(sampling) {
        // Canvas 2D exposes the same nearest/linear family through its native
        // resampler, with three quality tiers. Map Paint.NET's Direct2D modes
        // onto those tiers while retaining every user-facing v5 mode.
        switch (sampling) {
            case ResamplingAlgorithm.LINEAR:
                return "low";
            case ResamplingAlgorithm.MULTISAMPLE_LINEAR:
                return "medium";
            case ResamplingAlgorithm.ANISOTROPIC:
            case ResamplingAlgorithm.HIGH_QUALITY_CUBIC:
                return "high";
            default:
                return "low";
        }
    }

    clone() {
        const clone = Object.create(MaskedSurface.prototype);
        clone.path = this.path === null ? null : this.path.clone();
        clone.shadowPath = this.shadowPath === null ? null : this.shadowPath.clone();
        clone.bounds = this.bounds.clone();
        clone.surface = this.surface === null ? null : this.surface.clone();
        clone.linearSurface = this.linearSurface === null ? null : this.linearSurface.clone();
        clone.sourcePixels = null;
        clone.gpuTexture = null;
        clone.deferMaskUntilRender = this.deferMaskUntilRender;
        clone.rectangularMask = this.rectangularMask;
        clone.rectangleMaskBounds = this.rectangleMaskBounds === null
            ? null : this.rectangleMaskBounds.clone();
        clone.sampleMinimumX = this.sampleMinimumX;
        clone.sampleMinimumY = this.sampleMinimumY;
        clone.sampleMaximumX = this.sampleMaximumX;
        clone.sampleMaximumY = this.sampleMaximumY;
        clone.compositeCanvas = null;
        clone.disposed = false;
        return clone;
    }

    dispose() {
        const renderer = MaskedSurface.gpuRenderer;
        if (this.gpuTexture !== null && renderer !== undefined && renderer !== null) {
            renderer.gl.deleteTexture(this.gpuTexture);
        }
        if (this.surface !== null) this.surface.dispose();
        if (this.linearSurface !== null) this.linearSurface.dispose();
        if (this.path !== null) this.path.dispose();
        if (this.shadowPath !== null) this.shadowPath.dispose();
        this.surface = null;
        this.linearSurface = null;
        this.sourcePixels = null;
        this.gpuTexture = null;
        this.compositeCanvas = null;
        this.path = null;
        this.shadowPath = null;
        this.disposed = true;
    }
}
