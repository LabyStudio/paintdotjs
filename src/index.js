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

import './languages'
import {deserialize as deserializeNrbf} from 'ms-nrbf-js'

let portableImageCodecPromise = null;
const getPortableImageCodec = () => {
    if (portableImageCodecPromise === null) {
        portableImageCodecPromise = import('./portableImageCodec');
    }
    return portableImageCodecPromise;
};

window.portableImageCodec = {
    decode: (...args) => getPortableImageCodec().then(codec => codec.decode(...args)),
    encode: (...args) => getPortableImageCodec().then(codec => codec.encode(...args))
};

window.PDJVERSION = PDJVERSION;
window.Nrbf = {
    deserialize: deserializeNrbf
};
