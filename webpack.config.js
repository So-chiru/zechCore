const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const dev = process.env.NODE_ENV !== 'production'

module.exports = {
  mode: dev ? 'development' : 'production',
  entry: {
    app: ['babel-polyfill', path.resolve('src', 'index.js')]
  },
  output: {
    path: path.resolve(__dirname, '../proxy', 'statics')
  },
  optimization: {
    minimizer: []
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
        test: /\.(sa|sc|c)ss$/,
      },
      {
        test: /\.pug$/,
        use: ['pug-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/views/index.pug',
      filename: 'index.html'
    }),
    new UglifyJsPlugin({
      uglifyOptions: {
        mangle: true,
        beautify: false,
        comments: false,
        output: {
          comments: false
        }
      }
    })
  ],
  resolve: {
    extensions: ['.js', '.css'],
    modules: ['node_modules']
  }
}
