import React, { MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { FlatListProps, LayoutChangeEvent, View } from 'react-native';
import type { FlatListType, KeyExtractor, OnUpdateData, RenderItem } from '../types';
import { MIN_INDEX } from '../config';

type OnLayout = (options: {id: string; height: number}) => void;

const Prerender = ({id, onLayout, children}: {id: string; onLayout: OnLayout; children: ReactNode}) => {
  const onLayoutView = useCallback((e: LayoutChangeEvent) => {
    onLayout({
      id,
      height: e.nativeEvent.layout.height,
    });
  }, [id, onLayout]);

  return <View onLayout={onLayoutView}>
    {children}
  </View>
}

export const usePrerenderedData = ({data, keyExtractor, renderItem, scrollRef, onUpdateData, getItemLayout}: {
  data: readonly any[];
  keyExtractor: KeyExtractor;
  renderItem: RenderItem
  scrollRef: MutableRefObject<FlatListType>;
  onUpdateData?: OnUpdateData;
  getItemLayout?: FlatListProps<any>['getItemLayout'];
}) => {
  const [finalData, setFinalData] = useState<readonly any[]>([]);
  const [newData, setNewData] = useState<any[]>([]);

  const heightsRef = useRef<Record<string, number>>({});
  // offsetsRef.current[i] = data[0..i-1] 高度前缀和（与 getHeight(data.slice(0, i)) 等值，查询 O(1)）
  const offsetsRef = useRef<number[]>([0]);
  const getHeight = useCallback((list: any[], heights = heightsRef.current) => {
    return list.reduce((p, c) => p + heights[keyExtractor(c)], 0)
  }, [keyExtractor]);

  const buildOffsets = useCallback((list: readonly any[], heights: Record<string, number>) => {
    const offsets = new Array<number>(list.length + 1);
    offsets[0] = 0;
    for(let i = 0; i < list.length; i++) {
      offsets[i + 1] = offsets[i] + heights[keyExtractor(list[i])];
    }
    return offsets;
  }, [keyExtractor]);

  const shift = useCallback((newData: any[], oldHeights: Record<string, number>) => {
    const removedData = [];
    for (const d of finalData) {
      if(heightsRef.current[keyExtractor(d)] === undefined) {
        removedData.push(d);
      } else {
        break;
      }
    }

    const shiftValue = {
      height: -getHeight(removedData, oldHeights),
      offset: 0,
    };
    const index = data.findIndex((d) => d === newData[0]);
    if(index >= 0 && index <= MIN_INDEX) {
      shiftValue.height += getHeight(newData);
      shiftValue.offset = getHeight(data.slice(0, index))
    }
    if(shiftValue.height !== 0) {
      scrollRef.current?.shift(shiftValue);
      onUpdateData?.({heights: {...heightsRef.current}, ...shiftValue});
    }
    setFinalData(data);
  }, [data, finalData, getHeight, keyExtractor, onUpdateData, scrollRef]);

  useEffect(() => {
    if(data === finalData) {
      return;
    }
    if(getItemLayout) {
      const newD = data.filter((d) => heightsRef.current[keyExtractor(d)] === undefined);
      const oldHeights = heightsRef.current;
      heightsRef.current = data.reduce((p,c,i) => {
        p[keyExtractor(c)] = getItemLayout(data as any[], i).length;
        return p;
      }, {});
      offsetsRef.current = buildOffsets(data, heightsRef.current);
      shift(newD, oldHeights);
      return;
    }
    const newD = data.filter((d) => heightsRef.current[keyExtractor(d)] === undefined);
    if(newD.length > 0) {
      setNewData(newD);
      return;
    }
    // 只删不增/纯重排（如 Reset）：所有项均已有测高记录，没有可预渲染的新项，
    // onLayout 提交链路不会触发。这里同步走与 onLayout 完成后相同的清理+提交，
    // 否则 finalData 永不更新（上游缺陷：Reset 后列表残留，下次变更才一次性补账）。
    const oldHeights = heightsRef.current;
    heightsRef.current = data.reduce((p,c) => {
      const id = keyExtractor(c);
      p[id] = oldHeights[id];
      return p;
    }, {});
    offsetsRef.current = buildOffsets(data, heightsRef.current);
    shift(newD, oldHeights);
  }, [buildOffsets, data, finalData, getHeight, getItemLayout, keyExtractor, onUpdateData, scrollRef, shift]);

  const onLayout = useCallback<OnLayout>(({id, height}) => {
    heightsRef.current[id] = height;
    // check if there are missing elements
    const missing = data.some((d) => heightsRef.current[keyExtractor(d)] === undefined);
    if(missing) {
      return;
    }
    const oldHeights = heightsRef.current;
    // clean current heights (=> remove old heights)
    heightsRef.current = data.reduce((p,c) => {
      const id = keyExtractor(c);
      p[id] = oldHeights[id];
      return p;
    }, {});
    offsetsRef.current = buildOffsets(data, heightsRef.current);
    shift(newData, oldHeights);
    setNewData([]);
  }, [buildOffsets, data, keyExtractor, newData, shift]);

  return {
    finalData,
    prerender: newData.length ? <View>
      {newData.map((d) => <Prerender key={keyExtractor(d)} id={keyExtractor(d)} onLayout={onLayout}>{renderItem({item: d, prerendering: true})}</Prerender>)}
    </View> : undefined,
    getItemLayoutCustom: useCallback((data: any, index: number) => {
      const d = data[index];
      const id = keyExtractor(d);
      const offsets = offsetsRef.current;
      return {
        index,
        length: heightsRef.current[id],
        offset: offsets.length === data.length + 1 ? offsets[index] : getHeight(data.slice(0, index)),
      }
    }, [getHeight, keyExtractor]),
  };
};
