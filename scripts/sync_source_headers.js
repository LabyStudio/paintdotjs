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

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const headerLines = [
    '/*',
    ' * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7',
    ' *',
    ' * Original Paint.NET source:',
    ' * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.',
    ' *',
    ' * JavaScript port and port-specific changes:',
    ' * Copyright (C) 2024-present LabyStudio.',
    ' * https://github.com/LabyStudio',
    ' *',
    ' * The interface design and behavior target Paint.NET 5.1.12+.',
    ' * Licensed under LICENSE.md. See NOTICE.md for full attribution.',
    ' */'
];
const managedHeaderPattern = /^\/\*\r?\n \* paint\.js, an unofficial JavaScript port of Paint\.NET[^\r\n]*\r?\n[\s\S]*?\r?\n \*\/\r?\n(?:\r?\n)?/;

function isFirstPartySource(filename) {
    if (!/\.(?:c?js)$/.test(filename)) return false;
    return filename === 'webpack.config.js'
        || filename.startsWith('js/')
        || filename.startsWith('src/')
        || filename.startsWith('scripts/')
        || filename.startsWith('.github/scripts/');
}

function trackedFiles() {
    const output = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'});
    const files = output.split('\0').filter(Boolean);
    if (!files.includes('scripts/sync_source_headers.js')) {
        files.push('scripts/sync_source_headers.js');
    }
    return files.filter(isFirstPartySource).sort();
}

function updateHeader(source) {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const header = headerLines.join(newline) + newline + newline;
    let prefix = '';
    let body = source;
    if (body.startsWith('#!')) {
        const lineEnd = body.indexOf('\n');
        if (lineEnd === -1) return body + newline + header;
        prefix = body.slice(0, lineEnd + 1);
        body = body.slice(lineEnd + 1).replace(/^\r?\n/, '');
    }
    body = body.replace(managedHeaderPattern, '');
    return prefix + header + body;
}

const outdated = [];
for (const filename of trackedFiles()) {
    const absolutePath = path.join(root, filename);
    const source = fs.readFileSync(absolutePath, 'utf8');
    const updated = updateHeader(source);
    if (updated === source) continue;
    outdated.push(filename);
    if (!checkOnly) fs.writeFileSync(absolutePath, updated);
}

if (checkOnly && outdated.length > 0) {
    console.error('Missing or outdated paint.js source headers:');
    for (const filename of outdated) console.error(`  ${filename}`);
    process.exitCode = 1;
} else if (checkOnly) {
    console.log('All first-party JavaScript files have the current paint.js source header.');
} else {
    console.log(`Updated paint.js source headers in ${outdated.length} file(s).`);
}
