/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// FlatList 组件（harmony 平台路径）白盒单元测试：
// 覆盖 FlatListErrorBoundary 兜底、shift 的 RNOH scrollTo 纠偏通道。

// FlatList.tsx 模块加载时会执行 patchRenderMask()（harmony 生效），
// 必须先虚拟 mock 掉 @react-native/virtualized-lists
jest.mock(
  '@react-native/virtualized-lists/Lists/VirtualizedList',
  () => ({
    _createRenderMask: jest.fn((props, cells) => cells),
  }),
  {virtual: true},
);

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({Platform: {OS: 'harmony'}}),
);

const React = require('react');
const TestRenderer = require('react-test-renderer');
const {FlatList} = require('../../../src/FlatList');

function renderFlatList(props) {
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(React.createElement(FlatList, props));
  });
  return renderer;
}

function flatHost(renderer) {
  return renderer.root.findAll((n) => n.type === 'flatlist-host')[0];
}

describe('BidirectionalFlatList（harmony 平台路径）', () => {
  let consoleLogSpy;
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  it('SUB_RNOH_BDFL_JS_0201 harmony 不注入自定义 ScrollComponent', () => {
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null});
    expect(flatHost(renderer).props.renderScrollComponent).toBeUndefined();
  });

  it('SUB_RNOH_BDFL_JS_0202 shift 在内容收缩时经 scrollTo 平移 offset', () => {
    const ref = React.createRef();
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    // 记录最新滚动位置（onScrollFlatList 写入 lastScrollOffsetRef）
    TestRenderer.act(() => {
      flatHost(renderer).props.onScroll({
        nativeEvent: {contentOffset: {y: 200}},
      });
    });

    const scrollTo = jest.fn();
    ref.current.getNativeScrollRef = () => ({scrollTo});
    ref.current.shift({height: -40, offset: -5});

    // target = 200 + (-40) + (-5) = 155
    expect(scrollTo).toHaveBeenCalledWith({x: 0, y: 155, animated: false});
  });

  it('SUB_RNOH_BDFL_JS_0203 shift 目标为负时钳制到 0', () => {
    const ref = React.createRef();
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    TestRenderer.act(() => {
      flatHost(renderer).props.onScroll({
        nativeEvent: {contentOffset: {y: 10}},
      });
    });

    const scrollTo = jest.fn();
    ref.current.getNativeScrollRef = () => ({scrollTo});
    ref.current.shift({height: -40, offset: -5});

    // target = 10 - 40 - 5 = -35 -> 0
    expect(scrollTo).toHaveBeenCalledWith({x: 0, y: 0, animated: false});
  });

  it('SUB_RNOH_BDFL_JS_0204 shift 内容扩张时不做位移纠正', () => {
    const ref = React.createRef();
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    const scrollTo = jest.fn();
    ref.current.getNativeScrollRef = () => ({scrollTo});
    ref.current.shift({height: 30, offset: 0});

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('SUB_RNOH_BDFL_JS_0205 shift 在原生 ref 缺失时安全 no-op', () => {
    const ref = React.createRef();
    renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    // getNativeScrollRef 返回 null（?. 空侧）
    ref.current.getNativeScrollRef = () => null;
    expect(() => ref.current.shift({height: -10, offset: 0})).not.toThrow();
  });

  it('SUB_RNOH_BDFL_JS_0206 ErrorBoundary 捕获渲染异常并自动重挂', () => {
    // 说明：React 19 的 act 会重抛 boundary 捕获的错误并中断后续 commit
    // 回调（react-test-renderer 下 componentDidCatch 等不可稳定驱动），
    // 这里直接驱动 boundary 实例的生命周期：getDerivedStateFromError ->
    // failed 渲染 null -> componentDidCatch -> componentDidUpdate 定时
    // 50ms -> setState 恢复重挂。
    jest.useFakeTimers();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null});
    expect(renderer.toJSON()).not.toBeNull();

    const boundary = renderer.root
      .findAll(
        (n) => n.instance && typeof n.instance.componentDidCatch === 'function',
      )
      .pop();
    expect(boundary).toBeDefined();

    // getDerivedStateFromError：切换 failed 态
    const derived = boundary.instance.constructor.getDerivedStateFromError(
      new Error('render boom'),
    );
    expect(derived).toEqual({failed: true});

    // 进入 failed：整树渲染 null，componentDidCatch 上报日志
    TestRenderer.act(() => {
      boundary.instance.setState({failed: true});
    });
    boundary.instance.componentDidCatch(new Error('render boom'), {
      componentStack: '',
    });
    expect(renderer.toJSON()).toBeNull();
    expect(
      consoleLogSpy.mock.calls.some((c) =>
        String(c[0]).includes('[BDFL] boundary caught'),
      ),
    ).toBe(true);

    // 50ms 后自动重挂
    TestRenderer.act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(renderer.toJSON()).not.toBeNull();
    consoleErrorSpy.mockRestore();
  });

  it('SUB_RNOH_BDFL_JS_0207 正常更新不触发 boundary 兜底重挂', () => {
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null});
    TestRenderer.act(() => {
      renderer.update(
        React.createElement(FlatList, {data: [{id: 'a'}], renderItem: () => null}),
      );
    });
    expect(flatHost(renderer)).toBeDefined();
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('boundary caught'),
    );
  });
});
