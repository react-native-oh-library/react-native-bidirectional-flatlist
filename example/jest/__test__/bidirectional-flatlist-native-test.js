/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// BidirectionalFlatlist 原生组件（src/BidirectionalFlatlist.ts）白盒单元测试：
// android 下按 ViewManagerConfig 有无走 requireNativeComponent / 报错兜底，
// 非 android 平台导出 null（鸿蒙与 iOS 同为「原生零实现」路线）。

describe('BidirectionalFlatlist 原生组件导出', () => {
  const mockSelect = (spec) => ('ios' in spec ? spec.ios : spec.default);

  function loadWithReactNative(rnStub) {
    jest.resetModules();
    jest.doMock('react-native', () => rnStub);
    return require('../../../src/BidirectionalFlatlist');
  }

  afterEach(() => {
    jest.dontMock('react-native');
  });

  it('SUB_RNOH_BDFL_JS_0601 android 已注册 ViewManager 时导出原生组件', () => {
    const requireNativeComponent = jest.fn(() => 'NATIVE_BIDIRECTIONAL_LIST');
    const getViewManagerConfig = jest.fn(() => ({Commands: {}}));
    const mod = loadWithReactNative({
      Platform: {OS: 'android', select: mockSelect},
      UIManager: {getViewManagerConfig},
      requireNativeComponent,
    });

    expect(getViewManagerConfig).toHaveBeenCalledWith('BidirectionalFlatlist');
    expect(requireNativeComponent).toHaveBeenCalledWith('BidirectionalFlatlist');
    expect(mod.BidirectionalFlatlist).toBe('NATIVE_BIDIRECTIONAL_LIST');
  });

  it('SUB_RNOH_BDFL_JS_0602 android 未注册 ViewManager 时渲染即报链接错误', () => {
    const mod = loadWithReactNative({
      Platform: {OS: 'android', select: mockSelect},
      UIManager: {getViewManagerConfig: () => null},
      requireNativeComponent: jest.fn(),
    });

    expect(typeof mod.BidirectionalFlatlist).toBe('function');
    expect(() => mod.BidirectionalFlatlist()).toThrow(
      /react-native-bidirectional-flatlist.*doesn't seem to be linked/s,
    );
  });

  it('SUB_RNOH_BDFL_JS_0603 非 android 平台导出 null（harmony / iOS 同路线）', () => {
    const harmony = loadWithReactNative({
      Platform: {OS: 'harmony', select: mockSelect},
      UIManager: {getViewManagerConfig: jest.fn()},
      requireNativeComponent: jest.fn(),
    });
    expect(harmony.BidirectionalFlatlist).toBeNull();

    const ios = loadWithReactNative({
      Platform: {OS: 'ios', select: mockSelect},
      UIManager: {getViewManagerConfig: jest.fn()},
      requireNativeComponent: jest.fn(),
    });
    expect(ios.BidirectionalFlatlist).toBeNull();
  });
});
