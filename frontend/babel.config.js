module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@redux': './src/redux',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@types': './src/types',
            '@constants': './src/constants',
            '@utils': './src/utils',
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
