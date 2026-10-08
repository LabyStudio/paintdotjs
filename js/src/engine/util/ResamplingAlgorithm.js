/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class ResamplingAlgorithm {
    static NEAREST_NEIGHBOR = 0;
    static LINEAR = 1;
    static BILINEAR = ResamplingAlgorithm.LINEAR;
    static MULTISAMPLE_LINEAR = 3;
    static SUPER_SAMPLING = ResamplingAlgorithm.MULTISAMPLE_LINEAR;
    static ANISOTROPIC = 4;
    static HIGH_QUALITY_CUBIC = 5;
    static BICUBIC = ResamplingAlgorithm.HIGH_QUALITY_CUBIC;
}
