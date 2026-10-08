#!/usr/bin/env node
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

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageInfo = require(path.join(projectRoot, 'package.json'));
const architecture = {x64: 'x86_64', arm64: 'arm64'}[process.arch];

function run(command, args, options = {}) {
    console.log(`> ${command} ${args.join(' ')}`);
    const result = childProcess.spawnSync(command, args, {
        cwd: projectRoot,
        env: {...process.env, ...(options.env || {})},
        stdio: 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}

function hasCommand(command) {
    const result = childProcess.spawnSync('sh', ['-c', `command -v "$1" >/dev/null 2>&1`, 'sh', command]);
    return result.status === 0;
}

if (process.platform !== 'linux') {
    console.error('The local installer currently supports Linux only.');
    process.exit(1);
}
if (!architecture) {
    console.error(`Unsupported Linux architecture: ${process.arch}`);
    process.exit(1);
}

run('npm', ['run', 'dist:linux']);

const artifact = path.join(projectRoot, 'dist',
    `paintdotjs-${packageInfo.version}-linux-${architecture}.AppImage`);
const installDirectory = '/opt/paintdotjs';
const destination = path.join(installDirectory, 'paintdotjs.AppImage');
const existingBackups = fs.existsSync(installDirectory)
    ? fs.readdirSync(installDirectory).filter(name => name.startsWith('paintdotjs.AppImage.') && name.includes('backup'))
    : [];
const backup = `${destination}.package-backup`;
const sudoEnvironment = fs.existsSync('/usr/bin/ksshaskpass')
    ? {SUDO_ASKPASS: '/usr/bin/ksshaskpass'}
    : {};
const sudoArguments = fs.existsSync('/usr/bin/ksshaskpass') ? ['-A'] : [];

if (!fs.existsSync(artifact)) {
    console.error(`Build completed without producing ${artifact}`);
    process.exit(1);
}

run('sudo', [...sudoArguments, 'install', '-d', '-o', 'root', '-g', 'root', '-m', '755', installDirectory], {
    env: sudoEnvironment
});
if (fs.existsSync(destination) && existingBackups.length === 0) {
    run('sudo', [...sudoArguments, 'cp', '--preserve=mode,timestamps', destination, backup], {
        env: sudoEnvironment
    });
    console.log(`Saved the previous package binary as ${backup}`);
}
run('sudo', [...sudoArguments, 'install', '-o', 'root', '-g', 'root', '-m', '755', artifact, destination], {
    env: sudoEnvironment
});

if (hasCommand('xdg-mime') && fs.existsSync('/usr/share/applications/paintdotjs.desktop')) {
    run('xdg-mime', ['default', 'paintdotjs.desktop', 'application/x-paintdotnet']);
    if (hasCommand('kbuildsycoca6')) {
        run('kbuildsycoca6', ['--noincremental']);
    } else if (hasCommand('update-desktop-database')) {
        run('update-desktop-database', ['/usr/share/applications']);
    }
}

console.log(`Installed paint.js ${packageInfo.version} to ${destination}`);
console.log('Close any running paint.js windows before testing the new build.');
