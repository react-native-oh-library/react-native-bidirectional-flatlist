/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// ScrollView 自定义滚动组件（android 平台路径）白盒单元测试：
// 覆盖 props 归一化、sticky 头部联动、shift 原生位移通道。

// 用替身替换 android 侧才渲染的 BidirectionalFlatlist 原生组件
jest.mock('../../../src/BidirectionalFlatlist', () => ({
  BidirectionalFlatlist: (props) =>
    require('react').createElement('native-bidi-host', props),
}));

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({
    Platform: {OS: 'android'},
    PixelRatio: {getPixelSizeForLayoutSize: (size) => size * 2},
  }),
);

const React = require('react');
const TestRenderer = require('react-test-renderer');
const {ScrollView} = require('../../../src/ScrollView');

function renderScrollView(props) {
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(React.createElement(ScrollView, props));
  });
  return renderer;
}

function nativeHost(renderer) {
  return renderer.root.findAll((n) => n.type === 'native-bidi-host')[0];
}

// 内容容器（removeClippedSubviews / contentContainerStyle 挂在这里）
function contentView(renderer) {
  return renderer.root
    .findAll((n) => n.type === 'view-host')
    .find((n) => n.props.collapsable === false);
}

describe('ScrollViewComponent（android 平台路径）', () => {
  it('SUB_RNOH_BDFL_JS_0701 基础 props 归一化透传', () => {
    const renderer = renderScrollView({children: 'CONTENT'});
    const props = nativeHost(renderer).props;

    expect(props.children).toBeDefined();
    expect(props.maintainVisibleContentPosition).toBeUndefined();
    expect(props.onContentSizeChange).toBeNull();
    expect(props.alwaysBounceHorizontal).toBeUndefined(); // horizontal 缺省
    expect(props.alwaysBounceVertical).toBe(true);
    expect(props.sendMomentumEvents).toBe(false);
    expect(props.snapToStart).toBe(true);
    expect(props.snapToEnd).toBe(true);
    expect(props.style).toBeDefined();
  });

  it('SUB_RNOH_BDFL_JS_0702 horizontal / 覆盖项 / snap 关闭', () => {
    const renderer = renderScrollView({
      horizontal: true,
      alwaysBounceHorizontal: false,
      alwaysBounceVertical: false,
      snapToStart: false,
      snapToEnd: false,
      removeClippedSubviews: true,
      children: null,
    });
    const props = nativeHost(renderer).props;

    expect(props.alwaysBounceHorizontal).toBe(false);
    expect(props.alwaysBounceVertical).toBe(false);
    expect(props.snapToStart).toBe(false);
    expect(props.snapToEnd).toBe(false);
    // 无 sticky 头：removeClippedSubviews 原样透传到内容容器
    expect(contentView(renderer).props.removeClippedSubviews).toBe(true);
  });

  it('SUB_RNOH_BDFL_JS_0703 sticky 头部：禁裁剪 + scrollEventThrottle=1', () => {
    const renderer = renderScrollView({
      stickyHeaderIndices: [0],
      scrollEventThrottle: 16,
      children: 'CONTENT',
    });
    const props = nativeHost(renderer).props;

    // 有 sticky 头：内容容器禁裁剪，滚动事件节流提为 1
    expect(contentView(renderer).props.removeClippedSubviews).toBe(false);
    expect(props.scrollEventThrottle).toBe(1);
  });

  it('SUB_RNOH_BDFL_JS_0704 空 stickyHeaderIndices 数组按无 sticky 处理', () => {
    const renderer = renderScrollView({
      stickyHeaderIndices: [],
      scrollEventThrottle: 16,
      children: 'CONTENT',
    });
    const props = nativeHost(renderer).props;

    expect(contentView(renderer).props.removeClippedSubviews).toBeUndefined();
    expect(props.scrollEventThrottle).toBe(16);
  });

  it('SUB_RNOH_BDFL_JS_0704b pagingEnabled / snap 配置的各操作数分支', () => {
    // android：pagingEnabled===true || snapToInterval!=null || snapToOffsets!=null
    const withPaging = renderScrollView({
      pagingEnabled: true,
      snapToInterval: 5,
      snapToOffsets: [0, 50],
      children: null,
    });
    const props = nativeHost(withPaging).props;
    expect(props.pagingEnabled).toBe(true);

    // ios（翻转 Platform）：pagingEnabled===true && snapToInterval==null && snapToOffsets==null
    const rnMock = require('react-native');
    rnMock.Platform.OS = 'ios';
    try {
      const iosFull = renderScrollView({pagingEnabled: true, children: null});
      expect(nativeHost(iosFull).props.pagingEnabled).toBe(true);
      // snapToInterval 提供时 ios 侧为 false（&& 短路到第三操作数的两种取值）
      const iosSnapped = renderScrollView({
        pagingEnabled: true,
        snapToInterval: 5,
        children: null,
      });
      expect(nativeHost(iosSnapped).props.pagingEnabled).toBe(false);
    } finally {
      rnMock.Platform.OS = 'android';
    }
  });

  it('SUB_RNOH_BDFL_JS_0705 动量事件回调开启 sendMomentumEvents', () => {
    const renderer = renderScrollView({
      onMomentumScrollBegin: () => {},
      children: null,
    });
    expect(nativeHost(renderer).props.sendMomentumEvents).toBe(true);
  });

  it('SUB_RNOH_BDFL_JS_0706 onContentSizeChange 映射为内容容器 onLayout', () => {
    const renderer = renderScrollView({
      onContentSizeChange: () => {},
      contentContainerStyle: {padding: 4},
      children: 'CONTENT',
    });
    // 内容容器上的 onLayout 来自 contentSizeChangeProps
    const contentHost = renderer.root
      .findAll((n) => n.type === 'view-host')
      .find((n) => typeof n.props.onLayout === 'function');
    expect(contentHost).toBeDefined();
    expect(contentHost.props.style).toEqual([{padding: 4}]);
    // 原生层收到的 onContentSizeChange 置空（防 TextInput 事件冒泡）
    expect(nativeHost(renderer).props.onContentSizeChange).toBeNull();
  });

  it('SUB_RNOH_BDFL_JS_0706b 未提供 onContentSizeChange 时内容容器无 onLayout', () => {
    const renderer = renderScrollView({children: 'CONTENT'});
    const contentHost = renderer.root
      .findAll((n) => n.type === 'view-host')
      .find((n) => typeof n.props.onLayout === 'function');
    expect(contentHost).toBeUndefined();
  });

  it('SUB_RNOH_BDFL_JS_0706c 非 android 平台：sticky 头也不强制禁裁剪', () => {
    // ScrollViewRNRaw 在模块加载时按 android 解析（shim 基类），
    // 渲染期的平台分支由 Platform.OS 实时决定——加载后翻转为 harmony 覆盖
    const rnMock = require('react-native');
    rnMock.Platform.OS = 'harmony';
    try {
      const renderer = renderScrollView({
        stickyHeaderIndices: [0],
        removeClippedSubviews: true,
        children: 'CONTENT',
      });
      expect(contentView(renderer).props.removeClippedSubviews).toBe(true);
    } finally {
      rnMock.Platform.OS = 'android';
    }
  });

  it('SUB_RNOH_BDFL_JS_0707 shift 经 PixelRatio 换算后 setNativeProps', () => {
    const ref = React.createRef();
    renderScrollView({ref, children: null});

    const setNativeProps = jest.fn();
    ref.current.getNativeScrollRef = () => ({setNativeProps});
    ref.current.shift({offset: 2, height: 3});

    expect(setNativeProps).toHaveBeenCalledWith({
      shiftOffset: 4,
      shiftHeight: 6,
    });
  });
});
