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

const {spawn} = require('node:child_process');

const environment = {...process.env};
delete environment.NODE_OPTIONS;

const userArguments = process.argv.slice(2);
const hasOzonePlatformArgument = userArguments.some(argument => {
    return argument === '--ozone-platform' || argument.startsWith('--ozone-platform=');
});
const platformArguments = process.platform === 'linux'
    && process.env.XDG_SESSION_TYPE === 'wayland'
    && !hasOzonePlatformArgument
    ? ['--ozone-platform=x11']
    : [];

const electron = spawn(require('electron'), [
    ...platformArguments,
    ...userArguments,
    '.'
], {
    cwd: `${__dirname}/..`,
    env: environment,
    stdio: 'inherit'
});

electron.once('error', error => {
    console.error(error);
    process.exitCode = 1;
});
electron.once('exit', (code, signal) => {
    if (signal !== null) {
        process.kill(process.pid, signal);
        return;
    }
    process.exitCode = code ?? 1;
});
