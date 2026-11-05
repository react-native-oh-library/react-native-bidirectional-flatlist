/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// patchRenderMask（harmony 平台）降级路径：
// 非 0.72 结构（无 _createRenderMask）与 require 异常时静默跳过。

jest.mock('react-native', () => ({
  Platform: {
    OS: 'harmony',
    select: (spec) => ('ios' in spec ? spec.ios : spec.default),
  },
}));

const {patchRenderMask} = require('../../../src/compat/patchRenderMask');

describe('patchRenderMask（harmony 降级路径）', () => {
  let consoleLogSpy;
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('SUB_RNOH_BDFL_JS_0501 VirtualizedList 无 _createRenderMask 时不打补丁', () => {
    // 每个 jest 文件独立模块注册表，此处未注册 virtual mock 时
    // require 的模块由下方 doMock 提供（空对象）
    jest.doMock('@react-native/virtualized-lists/Lists/VirtualizedList', () => ({}), {
      virtual: true,
    });
    jest.resetModules();
    const fresh = require('../../../src/compat/patchRenderMask');
    expect(() => fresh.patchRenderMask()).not.toThrow();
  });

  it('SUB_RNOH_BDFL_JS_0502 require 异常时静默跳过', () => {
    jest.doMock(
      '@react-native/virtualized-lists/Lists/VirtualizedList',
      () => {
        throw new Error('require boom');
      },
      {virtual: true},
    );
    jest.resetModules();
    const fresh = require('../../../src/compat/patchRenderMask');
    expect(() => fresh.patchRenderMask()).not.toThrow();
    expect(
      consoleLogSpy.mock.calls.some((c) =>
        String(c[0]).includes('[BDFL] patch failed'),
      ),
    ).toBe(true);
  });
});
