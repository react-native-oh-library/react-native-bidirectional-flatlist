import React, { FC, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  Button,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BidirectionalFlatList from 'react-native-bidirectional-flatlist';
import type { OnUpdateData } from 'react-native-bidirectional-flatlist';
import Reanimated, { useAnimatedRef } from 'react-native-reanimated';

// reanimated 包裹 BidirectionalFlatList（鸿蒙侧为 @react-native-ohos 版，
// 经 harmony.alias 以原始包名导入）
const FlatListReanimated = Reanimated.createAnimatedComponent(BidirectionalFlatList);

interface MessageType {
  id: string;
  color: string;
  height: number;
}

let counter = 1;
const getIdNumber = () => counter++;
let block = 1;
const getBlockNumber = () => block++;

const generateData = (howMany = 20, height: number | undefined = undefined): MessageType[] => {
  const colors = [
    'red',
    'green',
    'blue',
    'yellow',
    'purple',
    'brown',
    'magenta',
    'cyan',
  ];
  const color = colors[getBlockNumber() % colors.length] as string;
  return Array.from(new Array(howMany)).map(() => {
    const id = getIdNumber();
    return {
      id: id.toString(),
      color,
      height: height ?? Math.floor(50 + Math.random() * 100),
    };
  });
};

// renderItem 的签名差异：带 prerendering 标志（离屏测高阶段的渲染）。
// 外层 View 为固定高度，因此测高结果不受标志分支影响；
// prerendering 时以等高轻量内容渲染，避免加载图片等重资源。
const Message = React.memo<FC<{ item: MessageType; prerendering?: boolean }>>(({ item, prerendering }) => {
  const { id, color, height } = item;
  if (!height) {
    return null;
  }
  return (
    <View
      style={{
        height,
        width: '100%',
        padding: 8,
        paddingHorizontal: 16,
        overflow: 'hidden',
      }}>
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 8,
          height: height - 8,
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 32, color: 'white' }}>{id}</Text>
        {prerendering && (
          <View style={styles.measuringBadge}>
            <Text style={styles.measuringText}>测高</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const types = ['FlatList', 'AnimatedFlatList', 'getItemLayout'] as const;
type Type = typeof types[number];

const typeDescriptions: Record<Type, string> = {
  FlatList: '默认：新数据离屏预渲染逐项测高后一次性提交',
  AnimatedFlatList: 'reanimated 包裹（@react-native-ohos 版）',
  getItemLayout: '用户提供 getItemLayout，跳过离屏测高',
};

interface ExampleContextValue {
  type: Type | undefined;
  back: () => unknown;
  setType: (type: Type) => unknown;
}

const ExampleContext = React.createContext<ExampleContextValue>({
  type: undefined,
  back: () => {/* placeholder */},
  setType: (_type) => {/* placeholder */},
});

const ExampleLink = ({ type }: { type: Type }) => {
  const { setType } = useContext(ExampleContext);
  const onPress = useCallback(() => {
    setType(type);
  }, [setType, type]);
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem}>
      <View>
        <Text style={styles.menuTitle}>{type}</Text>
        <Text style={styles.menuDesc}>{typeDescriptions[type]}</Text>
      </View>
    </TouchableOpacity>
  );
};

const Example = ({ children }: { children: (props: any) => ReactNode }) => {
  const [puffer] = useState(() => generateData(20, 0));
  const [data, setData] = useState<MessageType[]>([]);
  // onUpdateData 公开回调：数据提交 + 位移计算完成后触发，展示真实回调载荷
  const [lastUpdate, setLastUpdate] = useState<OnUpdateData | null>(null);

  const ref = useAnimatedRef<FlatList>();

  const renderItem = useCallback(({ item, prerendering }: { item: MessageType; prerendering?: boolean }) => {
    return <Message item={item} prerendering={prerendering} />;
  }, []);

  // keyExtractor 签名差异：无 index 参数（默认 item.id ?? item.key，这里显式提供）
  const keyExtractor = useCallback((item: MessageType) => item.id, []);

  const onUpdateData = useCallback((update: OnUpdateData) => {
    setLastUpdate(update);
  }, []);

  const removeFirst = useCallback(async () => {
    setData((x) => x.slice(1));
  }, []);

  const prependAndRemoveFirst = useCallback(async () => {
    const newData = generateData(5);
    setData((x) => [...newData, ...x.slice(1)]);
  }, []);

  const prepend = useCallback(async () => {
    const newData = generateData(20);
    setData((x) => [...newData, ...x]);
  }, []);

  const append = useCallback(async () => {
    const newData = generateData();
    setData((x) => [...x, ...newData]);
  }, []);

  const reset = useCallback(() => {
    setData([]);
  }, []);

  const finalData = useMemo(() => [...data, ...puffer], [data, puffer]);

  const props = {
    windowSize: 21,
    maxToRenderPerBatch: 20,
    initialNumToRender: 20,
    data: finalData,
    renderItem,
    keyExtractor,
    onUpdateData,
    ref,
  };

  const heightsCount = lastUpdate ? Object.keys(lastUpdate.heights).length : 0;

  return <ExampleContext.Consumer>
    {({ type, back }) => <>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} style={styles.backButton}>
          <Text style={styles.backText}>🔙 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data.length}</Text>
        </View>
      </View>
      <View style={styles.list}>
        {children(props)}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          onUpdateData: {lastUpdate
            ? `Δheight=${lastUpdate.height}  offset=${lastUpdate.offset}  已测 ${heightsCount} 项`
            : '暂无（触发数据操作后显示）'}
        </Text>
        {Platform.OS === 'harmony' && (
          <Text style={styles.panelNote}>
            HarmonyOS：位置保持由 maintainVisibleContentPosition 实现；ref.shift() 为 no-op（与 iOS 行为一致）。重点验证：快速滚动/惯性滚动中点 Prepend，注视条目应保持不动。
          </Text>
        )}
      </View>
      <View style={styles.controls}>
        <Button title="Remove First" onPress={removeFirst} />
        <Button title="Prepend And Remove First" onPress={prependAndRemoveFirst} />
        <Button title="Prepend (+20)" onPress={prepend} />
        <Button title="Append (+20)" onPress={append} />
        <Button title="Reset" onPress={reset} />
      </View>
    </>}
  </ExampleContext.Consumer>
};

const GetItemLayoutExample = (props: any) => {
  // 用户提供 getItemLayout：库直接采用其 length，跳过离屏测高
  const getItemLayout = (data: readonly MessageType[] | null, index: number) => {
    const list = (data ?? []) as MessageType[];
    return {
      index,
      length: list[index]?.height,
      offset: list.slice(0, index).reduce((p, c) => p + c.height, 0),
    };
  };

  return <FlatListReanimated {...props} getItemLayout={getItemLayout} />;
};

export default function App() {
  const [type, setType] = useState<Type>();

  const back = useCallback(() => setType(undefined), []);

  return (
    <ExampleContext.Provider value={{ type, setType, back }}>
      <View style={styles.root}>
        {!type && (
          <ScrollView>
            <Text style={styles.menuHeader}>BidirectionalFlatList 演示</Text>
            {types.map((t) => <ExampleLink key={t} type={t} />)}
          </ScrollView>
        )}
        {type === 'FlatList' && <Example>{(props: any) => <BidirectionalFlatList {...props} />}</Example>}
        {type === 'AnimatedFlatList' && <Example>{(props: any) => <FlatListReanimated {...props} />}</Example>}
        {type === 'getItemLayout' && <Example>{(props: any) => <GetItemLayoutExample {...props} />}</Example>}
      </View>
    </ExampleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'white',
    // 应用绘制延伸到状态栏底下，留出状态栏高度，避免顶部返回栏被遮挡
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  menuHeader: {
    fontSize: 22,
    fontWeight: '900',
    padding: 16,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  menuTitle: {
    fontSize: 18,
    color: '#0070f3',
  },
  menuDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'black',
    borderRadius: 4,
  },
  backText: {
    color: 'white',
    fontSize: 14,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: 'red',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    fontWeight: '900',
    color: 'white',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  panel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#f6f6f6',
  },
  panelTitle: {
    fontSize: 12,
    color: '#333',
  },
  panelNote: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 8,
  },
  measuringBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  measuringText: {
    fontSize: 11,
    color: '#333',
  },
});
