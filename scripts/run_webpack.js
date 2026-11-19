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

const webpack = spawn(process.execPath, [
    require.resolve('webpack/bin/webpack.js'),
    '--config',
    'webpack.config.js'
], {
    cwd: `${__dirname}/..`,
    env: environment,
    stdio: 'inherit'
});

webpack.once('error', error => {
    console.error(error);
    process.exitCode = 1;
});
webpack.once('exit', (code, signal) => {
    if (signal !== null) {
        process.kill(process.pid, signal);
        return;
    }
    process.exitCode = code ?? 1;
});
