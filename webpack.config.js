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
    library: "BugBattle",
    libraryTarget: "umd",
    clean: true,
  },
  optimization: {
    minimize: true,
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
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
          const nodeVersion = process.env.npm_package_version;

          exec(
            `mkdir -p published/v2/${nodeVersion} & cp ./build/index.js published/v2/${nodeVersion}/index.js`,
            (err, stdout, stderr) => {
              if (stdout) process.stdout.write(stdout);
              if (stderr) process.stderr.write(stderr);

              // Using UglifyJS
              minify({
                compressor: cleanCSS,
                input: "./src/css/index.css",
                output: `published/v2/${nodeVersion}/bugbattle.core.min.css`,
              });
            }
          );
        });
      },
    },
  ],
};
