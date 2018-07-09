
const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
    mode: "production",
    devtool: "cheap-module-source-map",
    plugins: [
        new UglifyJSPlugin({
            sourceMap: true,
        }),
        new webpack.DefinePlugin({
            minimize: true,
            compress: {
                warnings: false
            },
            'ENV': JSON.stringify('production')
        })
    ],
});