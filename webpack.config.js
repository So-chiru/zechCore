const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const dev = process.env.NODE_ENV !== 'production'

module.exports = {
  mode: dev ? 'development' : 'production',
  entry: {
    app: ['babel-polyfill', path.resolve('src', 'index.js')],
    zechworker: ['babel-polyfill', path.resolve('src', 'zech.core.sw.js')]
  },
  output: {
    path: path.resolve(__dirname, '../proxy', 'statics')
  },
  module: {
    rules: [
      {
        exclude: /(node_modules|_old_src|(sa|sc|c)ss)/,
        test: /\.js|\.ts$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        exclude: /\.js|\.ts|\.woff2/,
        test: /\.(sa|sc|c)ss$/
      },
      {
        test: /\.pug$/,
        use: ['pug-loader']
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        terserOptions: {
          mangle: true,
          beautify: false,
          comments: false,
          output: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      DEBUG: JSON.stringify(dev),
      VERSION: JSON.stringify(require('./package.json').version),
    }),
    new HtmlWebpackPlugin({
      template: './src/views/index.pug',
      filename: 'index.html',
      inject: false
    })
  ],
  resolve: {
    extensions: ['.js', '.css'],
    modules: ['node_modules']
  }
}
