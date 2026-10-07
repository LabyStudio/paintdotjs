const {DefinePlugin, ProvidePlugin} = require('webpack')
const path = require('node:path')

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
        new ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new DefinePlugin({
            PDJVERSION: `"${require('./package.json').version}"`
        })
    ]
}
