const {DefinePlugin} = require('webpack')

module.exports = {
    mode: 'production',
    target: 'node',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: __dirname
    },
    module: {
        rules: [
            {
                test: /\.(jpg|png)$/,
                use: {
                    loader: 'url-loader'
                }
            }
        ]
    },
    plugins: [
        new DefinePlugin({
            PDJVERSION: `"${require('./package.json').version}"`
        })
    ]
}