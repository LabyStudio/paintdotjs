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

'use strict';

const fs = require('fs');
const {execFileSync} = require('child_process');

const current = require('../../package.json');
const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
let previousVersion = null;
let previousSha = '';

if (!manual) {
    const before = process.env.BEFORE_SHA;
    if (!/^[0-9a-f]{40}$/i.test(before) || /^0+$/.test(before)) {
        throw new Error(`Invalid previous master SHA: ${before}`);
    }

    const previousPackage = execFileSync(
        'git',
        ['show', `${before}:package.json`],
        {encoding: 'utf8'}
    );
    previousVersion = JSON.parse(previousPackage).version;
    previousSha = before;
}

const changed = manual || current.version !== previousVersion;
fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `changed=${changed}\n` +
    `previous_sha=${previousSha}\n` +
    `version=${current.version}\n` +
    `paintdotnet=${current.paintdotjs.paintDotNetVersion}\n` +
    `paintdotnet_sha256=${current.paintdotjs.paintDotNetSha256}\n`
);

console.log(manual
    ? `Manual run requested for version ${current.version}`
    : `Version on master: ${previousVersion} -> ${current.version} (changed: ${changed})`);
