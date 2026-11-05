/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// usePrerenderedData hook 白盒单元测试：
// 直连 hook 的纯删减 / 纯重排 / 头部前插边界（MIN_INDEX）/ 高度为 0 等
// 不经过（或难以稳定经过）FlatList 集成链路的分支。

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({Platform: {OS: 'ios'}}),
);

const React = require('react');
const TestRenderer = require('react-test-renderer');
const {usePrerenderedData} = require('../../../src/hooks/usePrerenderedData');

let latest = null;

function Harness(props) {
  latest = usePrerenderedData(props);
  return null;
}

function renderHarness(props) {
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, props));
  });
  return renderer;
}

function update(renderer, props) {
  TestRenderer.act(() => {
    renderer.update(React.createElement(Harness, props));
  });
}

const keyExtractor = (item) => item.id;

function baseProps(extra) {
  return {
    data: [],
    keyExtractor,
    renderItem: () => null,
    scrollRef: {current: null},
    ...extra,
  };
}

describe('usePrerenderedData', () => {
  it('SUB_RNOH_BDFL_JS_0901 纯头部删除：收缩高度经 shift 上报', () => {
    const shift = jest.fn();
    const onUpdateData = jest.fn();
    const scrollRef = {current: {shift}};
    const initial = [{id: 'a'}, {id: 'b'}];
    const renderer = renderHarness(baseProps({data: initial, onUpdateData, scrollRef}));

    // 模拟 a、b 已测高
    TestRenderer.act(() => {
      latest.prerender.props.children.forEach((prerenderItem, i) => {
        // Prerender 元素上的 onLayout 即 hook 的提交回调（{id, height}）
        prerenderItem.props.onLayout({id: prerenderItem.props.id, height: 10 + i});
      });
    });
    expect(latest.finalData).toBe(initial);

    // 删除头部 a：无新数据，走「只删不增」清理提交链路
    const removed = [{id: 'b'}];
    update(renderer, baseProps({data: removed, onUpdateData, scrollRef}));

    expect(shift).toHaveBeenCalledWith({height: -10, offset: 0});
    expect(onUpdateData).toHaveBeenLastCalledWith({
      heights: {b: 11},
      offset: 0,
      height: -10,
    });
    expect(latest.finalData).toBe(removed);
  });

  it('SUB_RNOH_BDFL_JS_0902 净高度为 0 时不上报（纯重排）', () => {
    const shift = jest.fn();
    const onUpdateData = jest.fn();
    const scrollRef = {current: {shift}};
    const initial = [{id: 'a'}, {id: 'b'}];
    const renderer = renderHarness(baseProps({data: initial, onUpdateData, scrollRef}));

    TestRenderer.act(() => {
      latest.prerender.props.children.forEach((p) => {
        p.props.onLayout({id: p.props.id, height: 10});
      });
    });

    // 重排且无新增：shiftValue.height === 0，不调 shift / onUpdateData
    const reordered = [{id: 'b'}, {id: 'a'}];
    update(renderer, baseProps({data: reordered, onUpdateData, scrollRef}));

    // 仅剩测高提交那一次 shift（重排提交不位移）；onUpdateData 同理只一次
    expect(shift).toHaveBeenCalledTimes(1);
    expect(shift).toHaveBeenNthCalledWith(1, {height: 20, offset: 0});
    expect(onUpdateData).toHaveBeenCalledTimes(1);
    expect(latest.finalData).toBe(reordered);
  });

  it('SUB_RNOH_BDFL_JS_0903 头部删除到空列表：遍历全部旧数据', () => {
    const shift = jest.fn();
    const scrollRef = {current: {shift}};
    const initial = [{id: 'a'}, {id: 'b'}];
    const renderer = renderHarness(baseProps({data: initial, scrollRef}));

    TestRenderer.act(() => {
      latest.prerender.props.children.forEach((p) => {
        p.props.onLayout({id: p.props.id, height: 10});
      });
    });

    const empty = [];
    update(renderer, baseProps({data: empty, scrollRef}));
    expect(shift).toHaveBeenCalledWith({height: -20, offset: 0});
    expect(latest.finalData).toBe(empty);
  });

  it('SUB_RNOH_BDFL_JS_0904 新数据位于 MIN_INDEX 边界内：前插补偿位移', () => {
    const shift = jest.fn();
    const onUpdateData = jest.fn();
    const scrollRef = {current: {shift}};
    const initial = [{id: 'b'}, {id: 'c'}];
    const renderer = renderHarness(baseProps({
      data: initial,
      onUpdateData,
      scrollRef,
      getItemLayout: (list, index) => ({length: 10, offset: index * 10, index}),
    }));
    // getItemLayout 通道：heights 直接来自 length
    expect(latest.finalData).toBe(initial);

    // 前插两条（index 0 <= MIN_INDEX=1）：height += 新增高度、offset 为前缀和
    const prepended = [{id: 'a1'}, {id: 'a2'}, {id: 'b'}, {id: 'c'}];
    update(
      renderer,
      baseProps({
        data: prepended,
        onUpdateData,
        scrollRef,
        getItemLayout: (list, index) => ({length: 10, offset: index * 10, index}),
      }),
    );
    expect(shift).toHaveBeenLastCalledWith({height: 20, offset: 0});
    expect(onUpdateData).toHaveBeenLastCalledWith({
      heights: {a1: 10, a2: 10, b: 10, c: 10},
      offset: 0,
      height: 20,
    });
  });

  it('SUB_RNOH_BDFL_JS_0905 新数据位于 MIN_INDEX 之外：只做删除收缩', () => {
    const shift = jest.fn();
    const scrollRef = {current: {shift}};
    const initial = [{id: 'a'}, {id: 'b'}];
    const renderer = renderHarness(baseProps({
      data: initial,
      scrollRef,
      getItemLayout: (list, index) => ({length: 10, offset: index * 10, index}),
    }));

    // 新项插到 index 2（> MIN_INDEX）：不加前插补偿
    const appended = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    update(
      renderer,
      baseProps({
        data: appended,
        scrollRef,
        getItemLayout: (list, index) => ({length: 10, offset: index * 10, index}),
      }),
    );
    // 无删除且 index>MIN_INDEX：追加提交不再调 shift（仅剩初始提交那一次）
    expect(shift).toHaveBeenCalledTimes(1);
    expect(shift).toHaveBeenNthCalledWith(1, {height: 20, offset: 0});
    expect(latest.finalData).toBe(appended);
  });

  it('SUB_RNOH_BDFL_JS_0906 同一 data 引用重复渲染：effect 直接返回', () => {
    const getItemLayout = (list, index) => ({length: 10, offset: index * 10, index});
    const data = [{id: 'a'}];
    const renderer = renderHarness(baseProps({data, getItemLayout}));
    expect(latest.finalData).toBe(data);
    update(renderer, baseProps({data, getItemLayout}));
    expect(latest.finalData).toBe(data);
  });

  it('SUB_RNOH_BDFL_JS_0907 getItemLayoutCustom 前缀和失效时回退实时求和', () => {
    const data = [{id: 'a'}, {id: 'b'}];
    renderHarness(baseProps({
      data,
      getItemLayout: (list, index) => ({length: 10, offset: index * 10, index}),
    }));

    // 长度匹配：直接命中 offsets 前缀和
    expect(latest.getItemLayoutCustom(data, 1)).toEqual({
      index: 1,
      length: 10,
      offset: 10,
    });
    // offsets 与传入 data 长度不匹配（列表刚变更、offsets 未重建）时回退实时求和
    const stale = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    expect(latest.getItemLayoutCustom(stale, 1)).toEqual({
      index: 1,
      length: 10,
      offset: 10,
    });
  });

  it('SUB_RNOH_BDFL_JS_0908 scrollRef 为空实例时安全跳过 shift', () => {
    const onUpdateData = jest.fn();
    const initial = [{id: 'a'}];
    const renderer = renderHarness(baseProps({data: initial, onUpdateData}));

    TestRenderer.act(() => {
      latest.prerender.props.children.forEach((p) => {
        p.props.onLayout({id: p.props.id, height: 7});
      });
    });

    const removed = [];
    update(renderer, baseProps({data: removed, onUpdateData}));
    // scrollRef.current 为 null：跳过 shift（?. 空侧），onUpdateData 与 finalData 照常
    expect(onUpdateData).toHaveBeenCalledTimes(2);
    expect(onUpdateData).toHaveBeenLastCalledWith({heights: {}, offset: 0, height: -7});
    expect(latest.finalData).toBe(removed);
  });
});
