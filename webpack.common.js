const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

var nodeExternals = require('webpack-node-externals');

module.exports = {
    target: "node",
    entry: {
        server: './bin/server.js',
    },
    externals: [nodeExternals()],
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new webpack.BannerPlugin({
            banner: "#!/usr/bin/env node",
            raw: true
        })
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$ /,
                loader: ['babel-loader'],
            },
        ]
    },
    resolve: {
        modules: ["node_modules"]
    }
}