const path = require("path");
const webpack = require("webpack");
const exec = require("child_process").exec;
const TerserPlugin = require("terser-webpack-plugin");

const copyBuildPlugin = {
  apply: (compiler) => {
    compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
      const nodeVersion = process.env.npm_package_version;
      return exec(
        `mkdir -p published/${nodeVersion} & mkdir -p published/latest & cp ./build/cjs/index.js published/${nodeVersion}/index.js & cp ./build/cjs/index.js published/latest/index.js`,
        (err, stdout, stderr) => {
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
          console.log("DONE 🎉");
        }
      );
    });
  },
};

// Common configuration
const commonConfig = (isDevelopment, plugins = []) => {
  var config = {
    mode: "production",
    entry: {
      index: "./src/index.js",
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            mangle: true,
            sourceMap: true,
            safari10: true,
            output: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
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
      ...plugins,
    ],
  };

  if (isDevelopment) {
    config.mode = "development";
    config.devServer = {
      compress: true,
      open: true,
      hot: true,
      host: '0.0.0.0',
      static: [
        {
          directory: path.join(__dirname, 'demo'),
        },
        {
          directory: path.join(__dirname, 'build'),
          publicPath: '/build',
        },
      ],
      port: 4444,
    };
  }

  return config;
};

// Configuration for ESM
const esmConfig = {
  ...commonConfig(false, []),
  output: {
    filename: "[name].mjs",
    path: path.resolve(__dirname, "build/esm"),
    library: {
      type: "module",
    },
    globalObject: "this",
    clean: true,
  },
  experiments: {
    outputModule: true,
  },
};

// Configuration for CJS
const cjsConfig = {
  ...commonConfig(false, [copyBuildPlugin]),
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build/cjs"),
    libraryTarget: "umd",
    library: "Gleap",
    libraryExport: "default",
    globalObject: "this",
    clean: true,
  },
};

const developmentConfig = {
  ...commonConfig(true, []),
  // ... additional development-specific settings ...
};

module.exports = (env) => {
  if (env && env.development) {
    return developmentConfig;
  } else {
    return [esmConfig, cjsConfig];
  }
};