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
 * The interface design and behavior target Paint.NET 5.2+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let context = vm.createContext({assert, console});
for (let file of [
    'lib/gpc.bundle.js',
    'js/src/engine/util/Point.js',
    'js/src/engine/util/Rectangle.js',
    'js/src/engine/document/selection/Matrix.js',
    'js/src/engine/util/UtilityEdge.js',
    'js/src/engine/util/Scanline.js',
    'js/src/engine/util/Utility.js',
    'js/src/engine/util/BitVector2D.js',
    'js/src/engine/document/selection/CombineMode.js',
    'js/src/engine/document/selection/VertexList.js',
    'js/src/engine/document/selection/GraphicsPath.js',
    'js/src/engine/document/selection/Polygon.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
vm.runInContext(`
window = {GPC};
let width = 12, height = 12;
let canvas = new GraphicsPath();
canvas.addRectangle(new Rectangle(0, 0, width, height));
let rasterize = path => {
    let pixels = new Uint8Array(width * height);
    for (let contour of path.getVertexLists()) {
        for (let scan of Utility.getScans(contour.getVertices())) {
            for (let x = scan.getX(); x < scan.getX() + scan.getLength(); ++x) {
                pixels[scan.getY() * width + x] ^= 1;
            }
        }
    }
    return pixels;
};
let cases = {
    'background surrounding an object': (x, y) => !(x >= 3 && x < 9 && y >= 3 && y < 9),
    'nested island inside a hole': (x, y) => x < 2 || x >= 10 || y < 2 || y >= 10
        || (x >= 4 && x < 8 && y >= 4 && y < 8),
    'disconnected islands': (x, y) => (x === 2 && y === 2) || (x === 8 && y === 8),
    'entire canvas': () => true,
    'empty selection': () => false
};
for (let [name, contains] of Object.entries(cases)) {
    let stencil = new BitVector2D(width, height);
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            stencil.set(x, y, contains(x, y));
        }
    }
    let expected = new Uint8Array(stencil.bitArray);
    let path = GraphicsPath.pathFromStencil(stencil, canvas.getBounds());
    assert.deepEqual(rasterize(path), expected, name + ': traced geometry');
    if (!path.isEmpty()) {
        assert.deepEqual(path.getPixelStencil(width, height).bitArray, expected, name + ': cached pixels');
    }
    let inverse = GraphicsPath.combine(canvas, CombineMode.EXCLUDE, path);
    assert.deepEqual(rasterize(inverse), expected.map(value => value ^ 1), name + ': inverse');
    let restored = GraphicsPath.combine(canvas, CombineMode.EXCLUDE, inverse);
    assert.deepEqual(rasterize(restored), expected, name + ': double inverse');
    console.log('PASS ' + name);
}
`, context);
