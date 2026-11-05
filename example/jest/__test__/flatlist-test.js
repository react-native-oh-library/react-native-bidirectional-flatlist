/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// FlatList 组件（默认 iOS 平台路径）白盒单元测试：
// 覆盖预渲染测高链路、keyExtractor 默认兜底、getItemLayout 通道、
// ref 三种形态、onLayout/onScroll 透传、prerender 离屏蒙层等分支。

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({Platform: {OS: 'ios'}}),
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

function prerenderViews(renderer) {
  // Prerender 包裹层：带 onLayout 的 view-host（蒙层外层 View 无 onLayout）
  return renderer.root
    .findAll((n) => n.type === 'view-host')
    .filter((n) => typeof n.props.onLayout === 'function');
}

// prerender 离屏树只在宽度就绪后渲染（prerender && !!width），
// 先派发 FlatListRN 宿主的 onLayout 设置宽度
function enableWidth(renderer, width = 375) {
  TestRenderer.act(() => {
    flatHost(renderer).props.onLayout({
      nativeEvent: {layout: {width, height: 600}},
    });
  });
}

function layout(inst, layout) {
  TestRenderer.act(() => {
    inst.props.onLayout({nativeEvent: {layout}});
  });
}

describe('BidirectionalFlatList（iOS 平台路径）', () => {
  let consoleLogSpy;
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('SUB_RNOH_BDFL_JS_0101 初始渲染使用默认配置并渲染预渲染树', () => {
    const data = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    const renderer = renderFlatList({data, renderItem: () => null});
    const host = flatHost(renderer);

    expect(host.props.maintainVisibleContentPosition).toEqual({
      minIndexForVisible: 1,
    });
    expect(host.props.renderScrollComponent).toBeUndefined();
    expect(typeof host.props.getItemLayout).toBe('function');
    // 全部是新数据：先进入预渲染测高，finalData 仍是 []
    expect(host.props.data).toEqual([]);
    // 宽度未定：prerender 蒙层不渲染
    expect(prerenderViews(renderer)).toHaveLength(0);

    enableWidth(renderer);
    expect(prerenderViews(renderer)).toHaveLength(3);
  });

  it('SUB_RNOH_BDFL_JS_0102 自定义 maintainVisibleContentPosition 原样透传', () => {
    const mvcp = {minIndexForVisible: 3};
    const renderer = renderFlatList({
      data: [{id: 'a'}],
      renderItem: () => null,
      maintainVisibleContentPosition: mvcp,
    });
    expect(flatHost(renderer).props.maintainVisibleContentPosition).toBe(mvcp);
  });

  it('SUB_RNOH_BDFL_JS_0103 测高完成后提交数据并回调 onUpdateData', () => {
    const data = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    const onUpdateData = jest.fn();
    const ref = React.createRef();
    const renderer = renderFlatList({data, renderItem: () => null, onUpdateData, ref});

    enableWidth(renderer);
    prerenderViews(renderer).forEach((v) => layout(v, {height: 10, width: 100}));

    const host = flatHost(renderer);
    expect(host.props.data).toBe(data);
    expect(onUpdateData).toHaveBeenCalledTimes(1);
    expect(onUpdateData).toHaveBeenCalledWith({
      heights: {a: 10, b: 10, c: 10},
      offset: 0,
      height: 30,
    });
    // 提交后预渲染树清空
    expect(prerenderViews(renderer)).toHaveLength(0);
    // ref 上挂了 shift 通道（iOS 为 no-op，调用不报错）
    expect(typeof ref.current.shift).toBe('function');
    expect(() => ref.current.shift({height: -30, offset: 0})).not.toThrow();
  });

  it('SUB_RNOH_BDFL_JS_0104 部分测高未完成时不提前提交', () => {
    const data = [{id: 'a'}, {id: 'b'}];
    const onUpdateData = jest.fn();
    const renderer = renderFlatList({data, renderItem: () => null, onUpdateData});

    enableWidth(renderer);
    const views = prerenderViews(renderer);
    layout(views[0], {height: 10, width: 100});
    expect(onUpdateData).not.toHaveBeenCalled();
    expect(flatHost(renderer).props.data).toEqual([]);

    layout(views[1], {height: 20, width: 100});
    expect(onUpdateData).toHaveBeenCalledTimes(1);
    expect(onUpdateData).toHaveBeenCalledWith({
      heights: {a: 10, b: 20},
      offset: 0,
      height: 30,
    });
  });

  it('SUB_RNOH_BDFL_JS_0105 默认 keyExtractor 依次兜底 id / key / String', () => {
    const data = [{id: 'x'}, {key: 'y'}, 'z'];
    const onUpdateData = jest.fn();
    const renderer = renderFlatList({data, renderItem: () => null, onUpdateData});

    enableWidth(renderer);
    prerenderViews(renderer).forEach((v) => layout(v, {height: 5, width: 100}));

    expect(onUpdateData).toHaveBeenCalledWith({
      heights: {x: 5, y: 5, z: 5},
      offset: 0,
      height: 15,
    });
  });

  it('SUB_RNOH_BDFL_JS_0106 自定义 keyExtractor 决定高度表键名', () => {
    const data = [{k: 'n1'}, {k: 'n2'}];
    const onUpdateData = jest.fn();
    const renderer = renderFlatList({
      data,
      renderItem: () => null,
      onUpdateData,
      keyExtractor: (item) => item.k,
    });

    enableWidth(renderer);
    prerenderViews(renderer).forEach((v) => layout(v, {height: 8, width: 100}));

    expect(onUpdateData).toHaveBeenCalledWith({
      heights: {n1: 8, n2: 8},
      offset: 0,
      height: 16,
    });
  });

  it('SUB_RNOH_BDFL_JS_0107 提供 getItemLayout 时跳过离屏测高直接提交', () => {
    const data = [{id: 'a'}, {id: 'b'}];
    const onUpdateData = jest.fn();
    const renderer = renderFlatList({
      data,
      renderItem: () => null,
      onUpdateData,
      getItemLayout: (list, index) => ({length: 5 + index, offset: 0, index}),
    });
    const host = flatHost(renderer);

    expect(host.props.data).toBe(data);
    expect(prerenderViews(renderer)).toHaveLength(0);
    expect(onUpdateData).toHaveBeenCalledWith({
      heights: {a: 5, b: 6},
      offset: 0,
      height: 11,
    });
    // 用户提供 getItemLayout 时经 {...props} 后置覆盖（使用方全权接管布局，
    // hook 侧仅用其 length 维护高度表）——断言透传的是原函数
    expect(host.props.getItemLayout(data, 1)).toEqual({
      index: 1,
      length: 6,
      offset: 0,
    });
  });

  it('SUB_RNOH_BDFL_JS_0108 data 为 null 时兜底空数组', () => {
    const renderer = renderFlatList({data: null, renderItem: () => null});
    expect(flatHost(renderer).props.data).toEqual([]);
    expect(prerenderViews(renderer)).toHaveLength(0);
  });

  it('SUB_RNOH_BDFL_JS_0109 data 缺省时使用模块级空数组', () => {
    const onUpdateData = jest.fn();
    const renderer = renderFlatList({renderItem: () => null, onUpdateData});
    expect(flatHost(renderer).props.data).toEqual([]);
    expect(onUpdateData).not.toHaveBeenCalled();
  });

  it('SUB_RNOH_BDFL_JS_0110 onLayout 透传并设置蒙层宽度', () => {
    const onLayout = jest.fn();
    const data = [{id: 'a'}];
    const renderer = renderFlatList({data, renderItem: () => null, onLayout});

    // 宽度未定：有 prerender 但不渲染蒙层
    expect(
      renderer.root
        .findAll((n) => n.type === 'view-host')
        .some((n) => Array.isArray(n.props.style)),
    ).toBe(false);

    TestRenderer.act(() => {
      flatHost(renderer).props.onLayout({
        nativeEvent: {layout: {width: 375, height: 600}},
      });
    });
    expect(onLayout).toHaveBeenCalledTimes(1);

    // 宽度就绪：prerender 移入离屏蒙层（style = [styles.prerender, {width}]）
    const overlay = renderer.root
      .findAll((n) => n.type === 'view-host')
      .find((n) => Array.isArray(n.props.style) && n.props.style[1].width === 375);
    expect(overlay).toBeDefined();
    // 离屏定位（left: -10000）+ 动态宽度
    expect(overlay.props.style[0]).toMatchObject({
      position: 'absolute',
      top: 0,
      left: -10000,
    });
  });

  it('SUB_RNOH_BDFL_JS_0111 onScroll 透传', () => {
    const onScroll = jest.fn();
    const renderer = renderFlatList({
      data: [{id: 'a'}],
      renderItem: () => null,
      onScroll,
    });
    const event = {nativeEvent: {contentOffset: {y: 123}}};
    TestRenderer.act(() => {
      flatHost(renderer).props.onScroll(event);
    });
    expect(onScroll).toHaveBeenCalledWith(event);
  });

  it('SUB_RNOH_BDFL_JS_0112 function ref / object ref / 无 ref 三种形态', () => {
    // function ref
    const fnRef = jest.fn();
    let renderer = renderFlatList({data: [], renderItem: () => null, ref: fnRef});
    expect(fnRef).toHaveBeenCalledTimes(1);
    expect(typeof fnRef.mock.calls[0][0].shift).toBe('function');
    TestRenderer.act(() => {
      renderer.unmount();
    });
    // 卸载时 ref 回调收到 null（captureRef 的 r 为空分支）
    expect(fnRef).toHaveBeenLastCalledWith(null);

    // 无 ref
    renderer = renderFlatList({data: [], renderItem: () => null});
    expect(flatHost(renderer)).toBeDefined();
    TestRenderer.act(() => {
      renderer.unmount();
    });
  });

  it('SUB_RNOH_BDFL_JS_0113 renderItem 收到 prerendering 标记', () => {
    const renderItem = jest.fn(() => null);
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem});
    // 预渲染阶段 prerendering = true
    expect(renderItem).toHaveBeenCalledWith({item: {id: 'a'}, prerendering: true});
    prerenderViews(renderer).forEach((v) => layout(v, {height: 9, width: 100}));
    // 提交后由 FlatListRN 用 finalData 渲染（本测试里为替身，不再回调 renderItem）
    expect(renderItem).toHaveBeenCalledTimes(1);
  });
});
