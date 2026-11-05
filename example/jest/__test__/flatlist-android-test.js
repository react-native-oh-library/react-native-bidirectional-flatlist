/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// FlatList 组件（android 平台路径）白盒单元测试：
// 覆盖自定义 ScrollComponent 注入与 shift 的原生通道转发。

jest.mock('react-native', () =>
  require('../mocks/rn-shim').createReactNativeMock({Platform: {OS: 'android'}}),
);

const React = require('react');
const TestRenderer = require('react-test-renderer');
const {FlatList} = require('../../../src/FlatList');
const {ScrollView} = require('../../../src/ScrollView');

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

describe('BidirectionalFlatList（android 平台路径）', () => {
  it('SUB_RNOH_BDFL_JS_0301 android 注入自定义 ScrollComponent', () => {
    const renderer = renderFlatList({data: [{id: 'a'}], renderItem: () => null});
    const renderScrollComponent = flatHost(renderer).props.renderScrollComponent;
    expect(typeof renderScrollComponent).toBe('function');

    // renderScrollComponent 返回库内 ScrollView（Android 的原生位移通道载体）
    const element = renderScrollComponent({horizontal: true});
    expect(element.type).toBe(ScrollView);
    expect(element.props.horizontal).toBe(true);
  });

  it('SUB_RNOH_BDFL_JS_0302 shift 转发到原生 shift 通道', () => {
    const ref = React.createRef();
    renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    const nativeShift = jest.fn();
    ref.current.getNativeScrollRef = () => ({shift: nativeShift});
    const options = {height: 100, offset: 12};
    ref.current.shift(options);

    expect(nativeShift).toHaveBeenCalledWith(options);
  });

  it('SUB_RNOH_BDFL_JS_0303 shift 在原生 ref 缺失时安全 no-op', () => {
    const ref = React.createRef();
    renderFlatList({data: [{id: 'a'}], renderItem: () => null, ref});

    ref.current.getNativeScrollRef = () => null;
    expect(() => ref.current.shift({height: 5, offset: 0})).not.toThrow();
  });
});
