const path = require("path");
const webpack = require("webpack");
const exec = require("child_process").exec;
const TerserPlugin = require("terser-webpack-plugin");
const minify = require("@node-minify/core");
const cleanCSS = require("@node-minify/clean-css");

module.exports = {
  mode: "production",
  entry: {
    index: "./src/index.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
    library: "Gleap",
    libraryTarget: "umd",
    libraryExport: "default",
    globalObject: "this",
    clean: true,
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: true,
          sourceMap: false,
          safari10: true,
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  devServer: {
    open: true,
    hot: true,
    host: "localhost",
    static: path.join(__dirname, "demo"),
    port: 4444,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/,
        use: ["url-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      SDK_VERSION: JSON.stringify(process.env.npm_package_version),
    }),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
          const nodeVersion = process.env.npm_package_version;
          return exec(
            `mkdir -p published/${nodeVersion} & mkdir -p published/latest & cp ./build/index.js published/${nodeVersion}/index.js & cp ./build/index.js published/latest/index.js`,
            (err, stdout, stderr) => {
              if (stdout) process.stdout.write(stdout);
              if (stderr) process.stderr.write(stderr);

              console.log("DONE 🎉");
            }
          );
        });
      },
    },
  ],
};
