const path = require('path');

module.exports = {
    mode: 'development',
    entry: './client/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'client.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }, {
  test: /\.css$/,
  loader: 'style-loader'
}, {
  test: /\.css$/,
  loader: 'css-loader',
}
        ]
    },
    resolve: {
        alias: {
            react: 'camunda-modeler-plugin-helpers/react'
        }
    },
    devtool: 'cheap-module-source-map',
    resolve: {
        fallback: {
            "fs": false,
            "crypto": require.resolve("crypto-js")
        },
    }
};