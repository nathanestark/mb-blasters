const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@web": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../shared")
    }
  },
  module: {
    rules: [
      // SASS modules
      {
        test: /\.module\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]___[hash:base64:5]"
              },
              esModule: false
            }
          },
          "sass-loader"
        ]
      },
      // Global SASS
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      // Typescript
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "public/index.html"
    })
  ],
  devServer: {
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true,
    proxy: [
      {
        context: ["/api/v1/stream"],
        target: "ws://localhost:4000/api/v1/stream",
        ws: true
      },
      {
        context: ["/api/v1"],
        target: "http://localhost:4000"
      }
    ]
  },
  mode: "development"
};
