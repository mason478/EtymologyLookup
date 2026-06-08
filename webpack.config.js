const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const resolve = (...parts) => path.resolve(__dirname, ...parts);

module.exports = {
  entry: {
    background: resolve('src/background.ts'),
    content: resolve('src/content.ts'),
    popup: resolve('src/popup/index.tsx'),
    options: resolve('src/options/index.tsx'),
  },
  output: {
    path: resolve('dist'),
    filename: 'js/[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'css/[name].css' }),
    new CopyWebpackPlugin({
      patterns: [{ from: resolve('public'), to: resolve('dist') }],
    }),
    new HtmlWebpackPlugin({
      template: resolve('src/popup/popup.html'),
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: resolve('src/options/options.html'),
      filename: 'options.html',
      chunks: ['options'],
    }),
  ],
};
