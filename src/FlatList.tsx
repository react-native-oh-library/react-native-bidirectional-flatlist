import React, { forwardRef, MutableRefObject, useCallback, useRef, useState } from 'react';
import { FlatList as FlatListRN, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollViewProps, StyleSheet, View } from 'react-native';
import { ScrollView } from './ScrollView';
import { usePrerenderedData } from './hooks/usePrerenderedData';
import { patchRenderMask } from './compat/patchRenderMask';
import type { BidirectionalFlatListProps, FlatListType, KeyExtractor } from './types';
import { MIN_INDEX } from './config';

// RNOH 0.72：滚动中删头部数据会触发 render mask 越界断言（白屏），提前打补丁
patchRenderMask();

const maintainVisibleContentPosition = { minIndexForVisible: MIN_INDEX };

const EMPTY_DATA: readonly any[] = [];
const DEFAULT_KEY_EXTRACTOR: KeyExtractor = (item: any) => item.id ?? item.key ?? String(item);

const FlatListImpl = forwardRef<FlatListType, BidirectionalFlatListProps>((props, ref) => {
  const renderScrollComponent = useCallback((props: ScrollViewProps) => {
    return <ScrollView {...props} />;
  }, []);

  // harmony：跟踪最新滚动 offset，shift 时据此计算 scrollTo 目标
  const lastScrollOffsetRef = useRef(0);

  const capturedRef = useRef<FlatListType>();
  const captureRef = useCallback((r: any) => {
    const obj = r ? Object.assign(r, {
      shift: (options: {height: number; offset: number}) => {
        if(Platform.OS === 'android') {
          r.getNativeScrollRef()?.shift(options);
          return;
        }
        if(Platform.OS === 'harmony' && options.height < 0) {
          // RNOH 没有 native shift 组件，且 MVCP 仅在滚动 IDLE 时补偿 offset
          //（0.72.145 起）。滚动中删除头部数据后 native offset 会超出新数据
          // 的 getItemLayout offsets 表，VirtualizedList._createRenderMask 以
          // first=-1 断言崩溃（整树卸载 → 白屏）。这里在数据提交前用 scrollTo
          // 同步平移 offset，等价于 Android native shift；仅处理内容收缩
          //（height<0）：内容扩张时 offset 不会越界，由 MVCP 锚定即可。
          const target = lastScrollOffsetRef.current + options.height + options.offset;
          r.getNativeScrollRef()?.scrollTo({x: 0, y: Math.max(0, target), animated: false});
        }
      },
    }) : r;
    capturedRef.current = obj;
    if(!ref) {
      return;
    }
    if(typeof ref === 'function') {
      ref(obj);
    } else {
      (ref as MutableRefObject<FlatListType>).current = obj;
    }
  }, [ref]);

  // todo add hack to prevent flickering
  const {
    data = EMPTY_DATA,
    keyExtractor = DEFAULT_KEY_EXTRACTOR,
    renderItem,
    onUpdateData,
    getItemLayout,
    onLayout,
  } = props;
  const {finalData, prerender, getItemLayoutCustom} = usePrerenderedData({
    // 空数组兜底须用模块级常量：字面量 [] 每次渲染都是新引用，
    // 会让 usePrerenderedData 的 data !== finalData 判断永远成立（无限提交）
    data: (data ?? EMPTY_DATA) as readonly any[],
    keyExtractor,
    renderItem,
    scrollRef: capturedRef as MutableRefObject<FlatListType>,
    onUpdateData,
    getItemLayout,
  });

  const [width, setWidth] = useState<number>();
  const onLayoutFlatList = useCallback((e: LayoutChangeEvent) => {
    onLayout?.(e);
    setWidth(e.nativeEvent.layout.width);
  }, [onLayout]);

  const onScrollFlatList = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    props.onScroll?.(e);
  }, [props.onScroll]);

  const list = <>
    <FlatListRN
      maintainVisibleContentPosition={props.maintainVisibleContentPosition ?? maintainVisibleContentPosition}
      renderScrollComponent={Platform.OS === 'android' ? renderScrollComponent : undefined}
      getItemLayout={getItemLayoutCustom}
      {...props}
      onLayout={onLayoutFlatList}
      onScroll={onScrollFlatList}
      data={finalData}
      ref={captureRef} />
    {prerender && !!width && <View style={[styles.prerender, {width}]}>
      {prerender}
    </View>}
  </>;

  // RNOH 0.72：VirtualizedList render mask 断言的最后一道防线（与
  // patchRenderMask 配合）。真发生越界 fatal 时整树卸载会白屏，
  // 这里捕获后短暂卸载再重挂列表（重挂后的首次渲染从头开始，不依赖
  // 旧 scrollOffset，天然安全），代价是一次可感知的闪动。
  if (Platform.OS === 'harmony') {
    return <FlatListErrorBoundary>{list}</FlatListErrorBoundary>;
  }
  return list;
})

const styles = StyleSheet.create({
  prerender: {
    position: 'absolute',
    top: 0,
    left: -10000,
  }
});

// 见 FlatListImpl 返回处的说明：harmony 专属的 fatal 兜底
class FlatListErrorBoundary extends React.Component<{children: React.ReactNode}, {failed: boolean}> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch(error: Error) {
    console.log('[BDFL] boundary caught: %s', String(error).slice(0, 200));
  }

  componentDidUpdate() {
    // 捕获后短暂挂起（等 scrollTo/onScroll 事件到位），下一拍自动重挂
    if (this.state.failed) {
      setTimeout(() => this.setState({failed: false}), 50);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const FlatList = FlatListImpl as unknown as FlatListType
