module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // reanimated 4.x：worklet 插件独立为 react-native-worklets/plugin，必须位于数组末尾
    'react-native-worklets/plugin',
  ],
};
