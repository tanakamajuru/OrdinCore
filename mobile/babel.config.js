module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Reanimated 4 requires the worklets Babel plugin, and it MUST be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
