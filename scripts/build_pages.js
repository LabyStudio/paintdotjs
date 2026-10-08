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

const fs = require('fs');
const path = require('path');
const terser = require('terser');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'pages-dist');
const attributionBanner = `/*!
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 * Original Paint.NET source Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 * JavaScript port and port-specific changes Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 * Interface design and behavior target Paint.NET 5.1.12+.
 * See LICENSE.md and NOTICE.md.
 */`;
const requiredPaths = [
    'index.html',
    'LICENSE.md',
    'NOTICE.md',
    'robots.txt',
    'sitemap.xml',
    'build/web',
    'assets',
    'css',
    'run/test.png',
];

function readSource(relativePath) {
    const cleanPath = relativePath.replace(/^\.\//, '').replace(/[?#].*$/, '');
    const filename = path.resolve(root, cleanPath);
    if (!filename.startsWith(root + path.sep)) {
        throw new Error(`Invalid script path: ${relativePath}`);
    }
    return fs.readFileSync(filename, 'utf8');
}

async function build() {
    fs.rmSync(output, { recursive: true, force: true });
    fs.mkdirSync(output, { recursive: true });

    for (const relativePath of requiredPaths) {
        const source = path.join(root, relativePath);
        if (!fs.existsSync(source)) {
            throw new Error(`Missing required Pages asset: ${relativePath}`);
        }

        const destination = path.join(output, relativePath);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.cpSync(source, destination, { recursive: true });
    }

    const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sourceBlock = sourceHtml.match(/<!-- Sources\$start -->([\s\S]*?)<!-- Sources\$end -->/);
    if (sourceBlock === null) {
        throw new Error('Could not find the application source block in index.html');
    }

    const sourceScripts = Array.from(sourceBlock[1].matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g),
        match => match[1]);
    if (sourceScripts.length === 0) {
        throw new Error('No application scripts found in index.html');
    }

    // The debug page loads its platform adapter dynamically. The deployed build
    // is web-only, so compile that adapter directly into the production bundle.
    const environment = readSource('js/platform/environment.js')
        .replace("const isApp = typeof require !== 'undefined';", 'const isApp = false;')
        .replace(/loadScript\(isApp\s*\?[^;]+;/, '');
    const productionSources = [
        environment,
        readSource('js/platform/web/web.js'),
        readSource('js/platform/asset_guard.js'),
        readSource('lib/gpc.bundle.js'),
        ...sourceScripts.map(readSource),
        readSource('js/platform/boot_loader.js')
    ];
    const minified = await terser.minify(productionSources.join('\n;\n'), {
        compress: true,
        mangle: true,
        format: {comments: false, preamble: attributionBanner}
    });
    if (typeof minified.code !== 'string') {
        throw new Error('Terser did not produce an application bundle');
    }
    fs.writeFileSync(path.join(output, 'build/web/app.bundle.js'), minified.code + '\n');

    let productionHtml = sourceHtml.replace(
        /<!-- Environment -->[\s\S]*?<script src="\.\/js\/platform\/boot_loader\.js"><\/script>/,
        '<!-- Production bundles -->\n' +
        '<script src="./build/web/bundle.js"></script>\n' +
        '<script src="./build/web/app.bundle.js"></script>'
    );
    if (productionHtml === sourceHtml) {
        throw new Error('Could not replace debug scripts in production index.html');
    }

    const analyticsId = (process.env.GOOGLE_ANALYTICS_ID || '').trim();
    if (analyticsId !== '') {
        if (!/^G-[A-Z0-9]+$/.test(analyticsId)) {
            throw new Error('GOOGLE_ANALYTICS_ID must be a valid GA4 measurement ID beginning with G-');
        }

        const analyticsSource = readSource('scripts/web_analytics.js')
            .replace('__GOOGLE_ANALYTICS_ID__', JSON.stringify(analyticsId));
        const analyticsBundle = await terser.minify(analyticsSource, {
            compress: true,
            mangle: true,
            format: {comments: false}
        });
        if (typeof analyticsBundle.code !== 'string') {
            throw new Error('Terser did not produce the Google Analytics loader');
        }
        productionHtml = productionHtml.replace(
            '</head>',
            `    <script>${analyticsBundle.code}</script>\n</head>`
        );
    } else {
        console.warn('GOOGLE_ANALYTICS_ID is not set; the Pages build will not include Analytics.');
    }
    fs.writeFileSync(path.join(output, 'index.html'), productionHtml);

    // GitHub Pages should serve files exactly as generated, including underscore paths.
    fs.writeFileSync(path.join(output, '.nojekyll'), '');

    console.log(`Prepared minified GitHub Pages artifact in ${path.relative(root, output)}/`);
}

build().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
