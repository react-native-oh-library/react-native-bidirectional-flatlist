/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// react-native 测试替身：本库为纯 JS 组件库，测试重点在库自身逻辑，
// FlatList / ScrollView / View 用纯 React + 字符串宿主替换，StyleSheet /
// PixelRatio 等用纯 JS stub，保证 react-test-renderer 下渲染路径完全确定
// （不 require 真实 react-native，避免触碰 TurboModule / 原生层）。
//
// 源码运行时实际引用的 react-native 值导出只有：
// FlatList / ScrollView / View / Platform / StyleSheet / PixelRatio /
// UIManager / requireNativeComponent，类型导出会被 TS 转换剥除。

const React = require('react');

// src/ScrollView.tsx 在模块加载时会执行 `ScrollViewRN.render().type` 挖
// RN 内部类型并继承之；这里提供一个 forwardRef 形状一致、render() 返回
// {type: 可继承基类} 的替身，基类补齐 ScrollViewComponent.render() 里
// 引用到的 RN ScrollView 原型方法（全部 no-op）。
class RNScrollViewBaseShim extends React.Component {
  _scrollView = {getForwardingRef: (ref) => ref};

  getNativeScrollRef() {
    return null;
  }

  _setInnerViewRef() {}
  _handleContentOnLayout() {}
  _handleLayout() {}
  _handleMomentumScrollBegin() {}
  _handleMomentumScrollEnd() {}
  _handleResponderGrant() {}
  _handleResponderReject() {}
  _handleResponderRelease() {}
  _handleResponderTerminationRequest() {}
  _handleScrollBeginDrag() {}
  _handleScrollEndDrag() {}
  _handleScrollShouldSetResponder() {}
  _handleStartShouldSetResponder() {}
  _handleStartShouldSetResponderCapture() {}
  _handleTouchEnd() {}
  _handleTouchMove() {}
  _handleTouchStart() {}
  _handleTouchCancel() {}
  _handleScroll() {}

  render() {
    return null;
  }
}

const FakeScrollViewRN = React.forwardRef(function FakeScrollViewRN() {
  // 只被 `ScrollViewRN.render()` 挖类型，从不被真正渲染
  return {type: RNScrollViewBaseShim};
});

const FakeView = React.forwardRef(function FakeView(props, ref) {
  return React.createElement('view-host', {...props, ref});
});

// 替身 FlatList：把全部 props 透传到字符串宿主上，便于断言与派发事件；
// 类形式保证 ref 拿到实例（captureRef 会往实例上 Object.assign shift）。
class FakeFlatListRN extends React.Component {
  getNativeScrollRef() {
    return null;
  }

  render() {
    return React.createElement('flatlist-host', this.props);
  }
}

function createReactNativeMock(overrides = {}) {
  const {Platform: platformOverride, ...rest} = overrides;
  const OS = (platformOverride && platformOverride.OS) || 'ios';
  return {
    Platform: {
      OS,
      Version: 0,
      isTV: false,
      // 读 this.OS 以支持测试中途翻转平台（闭包捕获创建时的 OS 会失效）
      select: function (spec) {
        const currentOS = (this && this.OS) || OS;
        return spec && currentOS in spec
          ? spec[currentOS]
          : spec && spec.default;
      },
      ...platformOverride,
    },
    StyleSheet: {
      create: (styles) => styles,
      compose: (prev, next) =>
        prev == null ? next : next == null ? prev : [prev, next],
      flatten: (styles) =>
        Array.isArray(styles) ? styles[styles.length - 1] : styles,
    },
    PixelRatio: {
      get: () => 2,
      getPixelSizeForLayoutSize: (layoutSize) => layoutSize,
      getFontScale: () => 1,
      roundToNearestPixel: (layoutSize) => layoutSize,
      start: () => {},
    },
    UIManager: {getViewManagerConfig: () => null},
    requireNativeComponent: () => null,
    ScrollView: FakeScrollViewRN,
    View: FakeView,
    FlatList: FakeFlatListRN,
    ...rest,
  };
}

module.exports = {
  RNScrollViewBaseShim,
  FakeScrollViewRN,
  FakeView,
  FakeFlatListRN,
  createReactNativeMock,
};
