const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const FileManagerPlugin = require('filemanager-webpack-plugin');

module.exports = {
  entry: {
    config: './src/configs.js',
    offscreen: './src/offscreen/script.js',
    background: './src/background.js',
    utilities: './src/utilities.js'
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  plugins: [
    new CleanWebpackPlugin({cleanStaleWebpackAssets: false}),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "offscreen", "index.html"),
      filename: "index.html",
      chunks: ["offscreen"]
    }),
    new CopyWebpackPlugin({
      patterns: [
        {from: './src/manifest.json'},
        {from: './src/content/', to: './content/'},
        {from: './src/images/', to: './images/'},
        {from: './src/sidepanel/prod/browser/', to: './sidepanel/'},
      ],
    })
    ,
    new FileManagerPlugin({
      events: {
        onEnd: {
          move: [
            {source: 'dist/index.html', destination: 'dist/offscreen/index.html'},
            {source: 'dist/script.js', destination: 'dist/offscreen/script.js'},
          ],
        }
      }
    })
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({extractComments: false, }),
    ],
  },
}