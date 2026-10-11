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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/src/PdjInfo.js', 'utf8');

const readInfo = window => {
    const context = {window};
    vm.runInNewContext(`${source}\nresult = [PdjInfo.version(), PdjInfo.distribution()];`, context);
    return Array.from(context.result);
};

assert.deepEqual(readInfo({PDJVERSION: '1.2.3', PDJDISTRIBUTION: 'Web'}), ['1.2.3 (Web)', 'Web']);
assert.deepEqual(readInfo({PDJVERSION: '1.2.3'}), ['1.2.3', null]);
assert.deepEqual(readInfo({PDJVERSION: '1.2.3', PDJDISTRIBUTION: ''}), ['1.2.3', null]);
assert.deepEqual(readInfo({}), ['Unknown version', null]);

console.log('Version information fallbacks verified.');
