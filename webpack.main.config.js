module.exports = {
  entry: "./src/main/main.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true
          }
        }
      },
      {
        test: /native_modules\/.+\.node$/,
        use: "node-loader"
      },
      {
        test: /\.(m?js|node)$/,
        parser: {
          amd: false
        },
        use: {
          loader: "@vercel/webpack-asset-relocator-loader",
          options: {
            outputAssetBase: "native_modules"
          }
        }
      }
    ]
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json"]
  }
};
