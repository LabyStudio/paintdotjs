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

const {BannerPlugin, DefinePlugin, ProvidePlugin} = require('webpack')
const path = require('node:path')

const attributionBanner = [
    'paint.js, an unofficial JavaScript port of Paint.NET 3.36.7',
    'Original Paint.NET source Copyright (C) dotPDN LLC, Rick Brewster, and contributors.',
    'JavaScript port and port-specific changes Copyright (C) 2024-present LabyStudio.',
    'https://github.com/LabyStudio',
    'Interface design and behavior target Paint.NET 5.1.12+.',
    'See LICENSE.md and NOTICE.md.'
].join('\n')

module.exports = {
    mode: 'production',
    target: 'web',
    entry: './src/index.js',
    devtool: 'eval-source-map',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build/web'),
        clean: true
    },
    resolve: {
        fallback: {
            fs: false,
            path: false
        }
    },
    module: {
        rules: [
            {
                test: /\.(jpg|png)$/,
                use: {
                    loader: 'url-loader'
                }
            },
            {
                test: /magick\.wasm$/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/codecs/[name][ext]'
                }
            }
        ]
    },
    plugins: [
        new BannerPlugin({banner: attributionBanner}),
        new ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new DefinePlugin({
            PDJVERSION: `"${require('./package.json').version}"`
        })
    ]
}
