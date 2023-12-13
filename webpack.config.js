// import path from 'path'
// import { fileURLToPath } from 'url'
// import webpack from 'webpack'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {/*
  mode: 'production',
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    sourceMapFilename: '[name].bundle.map',
    chunkFormat: 'commonjs',
    library: {
      type: 'module'
    }
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, '')
    })
  ],
  experiments: {
    outputModule: true
  }
  */
}
