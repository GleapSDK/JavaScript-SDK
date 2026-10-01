module.exports = {
  presets: [
    ["@babel/env"]
  ],
  plugins: [
    ["@babel/plugin-transform-class-properties"]
  ],
  overrides: [
    {
      // The capture request modules only run where the rest of the bundle does: its untranspiled
      // dependencies (modern-screenshot, rrweb) already need ES2020 (?. and ??). Compiled for those
      // browsers they stay smaller (no ES5 classes, arrows, spread or destructuring helpers).
      test: /[\\/]src[\\/](GleapCapture(Api|Manager|Recorder|Screenshot|Settings|Tasks|UI|Veil)|GleapWebmDuration)\.js$/,
      presets: [
        [
          "@babel/env",
          { targets: { chrome: "80", edge: "80", firefox: "74", safari: "13.1", ios: "13.4", samsung: "13" } }
        ]
      ]
    }
  ]
};
