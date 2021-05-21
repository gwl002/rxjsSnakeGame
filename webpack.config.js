const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require("webpack");

const port = process.env.PORT || 3000;

module.exports = {
    // Webpack configuration goes here
    mode: 'development',
    entry: './index.js',
    output: {
        path: __dirname + "/dist",
        filename: 'bundle.[hash].js',
        clean: true,
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    resolve: {
        alias: {
            "react-dom": "@hot-loader/react-dom",
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'public/index.html',
        }),
        new webpack.HotModuleReplacementPlugin(),
    ],
    devServer: {
        host: 'localhost',
        port: port,
        historyApiFallback: true,
        open: true,
        hot: true
    }
};