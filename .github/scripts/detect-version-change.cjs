'use strict';

const fs = require('fs');
const {execFileSync} = require('child_process');

const current = require('../../package.json');
const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
let previousVersion = null;

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
}

const changed = manual || current.version !== previousVersion;
fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `changed=${changed}\n` +
    `version=${current.version}\n` +
    `paintdotnet=${current.paintdotjs.paintDotNetVersion}\n` +
    `paintdotnet_sha256=${current.paintdotjs.paintDotNetSha256}\n`
);

console.log(manual
    ? `Manual run requested for version ${current.version}`
    : `Version on master: ${previousVersion} -> ${current.version} (changed: ${changed})`);
