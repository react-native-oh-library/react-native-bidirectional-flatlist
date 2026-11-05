module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    // reanimated worklet 插件必须位于 plugins 数组末尾
    'react-native-reanimated/plugin',
  ],
};
