/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// 入口导出（src/index.tsx）白盒单元测试

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({Platform: {OS: 'ios'}}),
);

describe('index.tsx 入口导出', () => {
  it('SUB_RNOH_BDFL_JS_0101 默认导出为 FlatList 组件', () => {
    const index = require('../../../src/index');
    const {FlatList} = require('../../../src/FlatList');
    expect(index.default).toBe(FlatList);
  });
});
