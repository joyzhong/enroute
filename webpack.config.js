const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const APP_DIR = path.resolve(__dirname, 'src/client/app');
const BUILD_DIR = path.resolve(__dirname, 'src/client/public');
const MAIN_DIR = path.resolve(__dirname, 'src/client');
const PROD = process.env.NODE_ENV === 'production';

const commonPlugins = [
  new HtmlWebpackPlugin({
    filename: "index.html", // Writes to `config.out.path`.
    inject: 'body',
    template: MAIN_DIR + '/index.html',
  })
];

const config = {
  entry: APP_DIR + '/index.jsx',
  output: {
    path: BUILD_DIR,
    filename: PROD ? 'bundle.min.js' : 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        include: APP_DIR,
        loader: 'babel'
      }
    ]
  },
  plugins:
    PROD ? [
      new webpack.optimize.UglifyJsPlugin({
        compress: { warnings: false }
      }),
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      })
    ].concat(commonPlugins) : commonPlugins
};

module.exports = config;
