/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// patchRenderMask（harmony 平台）白盒单元测试：
// 覆盖越界 clamp、透传、幂等、空数据等分支。

jest.mock('react-native', () => ({
  Platform: {
    OS: 'harmony',
    select: (spec) => ('ios' in spec ? spec.ios : spec.default),
  },
}));

const mockOriginalMask = jest.fn(function (props, cells, regions) {
  return {props, cells, regions};
});

jest.mock(
  '@react-native/virtualized-lists/Lists/VirtualizedList',
  () => ({_createRenderMask: mockOriginalMask}),
  {virtual: true},
);

const {patchRenderMask} = require('../../../src/compat/patchRenderMask');
const VirtualizedList = require('@react-native/virtualized-lists/Lists/VirtualizedList');

function propsWithCount(count) {
  return {getItemCount: () => count, data: new Array(count)};
}

describe('patchRenderMask（harmony）', () => {
  let consoleLogSpy;
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockOriginalMask.mockClear();
  });
  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('SUB_RNOH_BDFL_JS_0401 打补丁并透传合法区间', () => {
    patchRenderMask();
    expect(typeof VirtualizedList._createRenderMask).toBe('function');
    expect(VirtualizedList._createRenderMask).not.toBe(mockOriginalMask);

    const cells = {first: 0, last: 2};
    const regions = [{first: 0, last: 1}];
    const props = propsWithCount(5);
    VirtualizedList._createRenderMask(props, cells, regions);

    expect(mockOriginalMask).toHaveBeenCalledTimes(1);
    expect(mockOriginalMask).toHaveBeenCalledWith(props, cells, regions);
  });

  it('SUB_RNOH_BDFL_JS_0402 first 为负时钳制到 0', () => {
    patchRenderMask();
    VirtualizedList._createRenderMask(propsWithCount(5), {first: -1, last: 1});
    expect(mockOriginalMask).toHaveBeenCalledWith(
      expect.anything(),
      {first: 0, last: 1},
      undefined,
    );
  });

  it('SUB_RNOH_BDFL_JS_0403 first 越界时钳制到 itemCount-1', () => {
    patchRenderMask();
    VirtualizedList._createRenderMask(propsWithCount(3), {first: 7, last: 2});
    // first 钳到 2；last 以原始 first-1 为下限（保持 first<=last+1 的窗口约束）
    expect(mockOriginalMask).toHaveBeenCalledWith(
      expect.anything(),
      {first: 2, last: 6},
      undefined,
    );
  });

  it('SUB_RNOH_BDFL_JS_0404 last 越界时钳制到 itemCount-1', () => {
    patchRenderMask();
    VirtualizedList._createRenderMask(propsWithCount(3), {first: 0, last: 9});
    expect(mockOriginalMask).toHaveBeenCalledWith(
      expect.anything(),
      {first: 0, last: 2},
      undefined,
    );
  });

  it('SUB_RNOH_BDFL_JS_0405 last 小于 first-1 时抬升到 first-1', () => {
    patchRenderMask();
    VirtualizedList._createRenderMask(propsWithCount(5), {first: 2, last: 0});
    expect(mockOriginalMask).toHaveBeenCalledWith(
      expect.anything(),
      {first: 2, last: 1},
      undefined,
    );
  });

  it('SUB_RNOH_BDFL_JS_0406 itemCount 为 0 时不钳制直接透传', () => {
    patchRenderMask();
    const cells = {first: -1, last: -1};
    VirtualizedList._createRenderMask(propsWithCount(0), cells);
    expect(mockOriginalMask).toHaveBeenCalledWith(
      expect.anything(),
      cells,
      undefined,
    );
  });

  it('SUB_RNOH_BDFL_JS_0407 补丁幂等：二次调用不再包裹', () => {
    patchRenderMask();
    const wrapped = VirtualizedList._createRenderMask;
    patchRenderMask();
    expect(VirtualizedList._createRenderMask).toBe(wrapped);
  });

  it('SUB_RNOH_BDFL_JS_0408 original 的 this 与返回值保持原语义', () => {
    patchRenderMask();
    const props = propsWithCount(5);
    const ctx = {marker: 'VL_INSTANCE'};
    const ret = VirtualizedList._createRenderMask.call(ctx, props, {first: 0, last: 1});
    expect(mockOriginalMask.mock.instances[0]).toBe(ctx);
    expect(ret.cells).toEqual({first: 0, last: 1});
  });
});
