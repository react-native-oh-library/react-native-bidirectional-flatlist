> 文档模板：v0.4.2

<p align="center">
  <h1 align="center"> <code>react-native-bidirectional-flatlist</code> </h1>
</p>

本项目基于 [react-native-bidirectional-flatlist](https://github.com/steuerbot/react-native-bidirectional-flatlist) 开发。

该第三方库的仓库已迁移至 Gitcode，且支持直接从 npm 下载，新的包名为：`@react-native-ohos/react-native-bidirectional-flatlist` 版本所属关系如下：

| 三方库名称    | 三方库版本（npm地址）    | 发布信息     | 支持RN版本    | Autolink     | 编译API版本     | 社区基线版本    |  源码地址   |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-bidirectional-flatlist | [~0.6.0](https://www.npmjs.com/package/@react-native-ohos/react-native-bidirectional-flatlist) | [Gitcode Releases](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/releases) | 0.72.* / 0.77.* / 0.82.* / 0.84.* | 否 | API12+ | 0.6.0 | [master](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/tree/master) |

## 简介

`react-native-bidirectional-flatlist` 是一个用于 React Native 的双向列表组件库。<br/>
它解决聊天列表等场景下向头部插入（前插）/尾部追加数据时，滚动位置无法保持在当前条目的问题：新增项先离屏预渲染测高，提交数据时配合位移补偿，使可视区域条目不发生跳动。

## 下载安装

进入到工程目录并输入以下命令：

#### **npm**

```bash
npm install @react-native-ohos/react-native-bidirectional-flatlist
```

#### **yarn**

```bash
yarn add @react-native-ohos/react-native-bidirectional-flatlist
```

## 使用示例

下面的代码展示了这个库的基本使用场景：

> [!WARNING] 使用时 import 的库名不变。

```tsx
import React, {useState} from 'react';
import BidirectionalFlatList from 'react-native-bidirectional-flatlist';

const ChatList = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const prepend = () => {
    // 向头部插入 20 条历史消息，列表会自动测高并保持当前阅读位置
    setMessages((x) => [...generateMessages(20), ...x]);
  };

  return (
    <BidirectionalFlatList
      data={messages}
      // prerendering=true 表示本次渲染用于离屏测高，可渲染轻量占位
      renderItem={({item, prerendering}) => (
        <Message item={item} prerendering={prerendering} />
      )}
      keyExtractor={(item) => item.id}
      onUpdateData={({heights, offset, height}) => {
        // 数据提交 + 位移计算完成后回调（heights 为各项实测高度）
      }}
    />
  );
};
```

## Link

|                                      | 是否支持autolink | RN框架版本 |
|--------------------------------------|-----------------|------------|
| ~0.6.0                               |  否              |  0.72 / 0.77 / 0.82 / 0.84 |

本库为纯 JS 组件库，不含任何原生模块（无 C++ / ArkTS 侧代码），无需 Autolink / Manual Link，也无需在 `RNPackagesFactory.ets`、`PackageProvider.cpp` 中注册。Metro 会经包内 `harmony.alias` 配置，把社区包名 `react-native-bidirectional-flatlist` 自动重定向到本鸿蒙包，业务代码 `import 'react-native-bidirectional-flatlist'` 的写法保持不变。

## 约束与限制

### 兼容性

要使用此库，需要使用正确的 React-Native 和 RNOH 版本组合，同时使用配套的 DevEco Studio 以及手机 ROM。

以下版本验证通过：

1. RNOH: 0.72.5; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.0.858; ROM: 6.0.0.112;
2. RNOH: 0.77.1; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.0.858; ROM: 6.0.0.112;
3. RNOH: 0.82.1; SDK: HarmonyOS 6.0.1 Release SDK; IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0.328 SP26;
4. RNOH: 0.84.1; SDK: HarmonyOS 6.0.1 Release SDK; IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0.120 SP7;

## 接口说明

### API

> [!TIP] "平台"列表示该三方库在社区原本支持的平台。

> [!TIP] "OpenHarmony平台支持"值为 yes 表示 OpenHarmony平台支持 该功能；no 表示不支持；partially 表示部分支持。使用方法与所在平台一致，性能效果对比 iOS 和 Android 有所差异。

### 1. JS 层 API

以下为 @react-native-ohos/react-native-bidirectional-flatlist 鸿蒙化的基本属性，属性已验证，更多属性详情请查看 [react-native-bidirectional-flatlist](https://github.com/steuerbot/react-native-bidirectional-flatlist) 的文档介绍。

| 名称 | 描述 | 参数类型 | 返回值 | 必填 | 平台 | OpenHarmony平台支持 |
| ---- | ---- | -------- | ------ | ---- | ---- | ------------------- |
| `BidirectionalFlatList` | 前插/追加数据时保持滚动位置的 FlatList 组件（默认导出） | `FlatListProps` 及下方专有属性 | React 组件 | Yes | iOS / Android | Yes |
| `data` | 列表数据 | `readonly T[]` | / | Yes | iOS / Android | Yes |
| `renderItem` | 渲染单条内容 | `({item: T, prerendering?: boolean}) => ReactNode` | / | Yes | iOS / Android | Yes |
| `keyExtractor` | 取项稳定 key | `(item: T) => string` | / | No | iOS / Android | Yes |
| `getItemLayout` | 提供该项则跳过离屏测高，直接采用其 `length` 作为高度表 | `(data, index) => {index, length, offset}` | / | No | iOS / Android | Yes |
| `onUpdateData` | 数据提交与位移计算完成后的回调 | `({heights: Record<string, number>, offset: number, height: number}) => void` | / | No | iOS / Android | Yes |
| `maintainVisibleContentPosition` | 位置保持配置 | `{minIndexForVisible: number, autoscrollToTopThreshold?: number}` | / | No | iOS / Android | Yes |
| `ref.shift({offset, height})` | Android 原生位移纠正通道（物理像素） | `{offset: number, height: number}` | `void` | No | Android | No |

### 2. 依赖 Native 层 API

无。本库为纯 JS 实现，不依赖任何 TurboModule / Native API。

## 遗留问题

- `ref.shift()` 位移纠正通道在鸿蒙为 no-op：RNOH 下 `setNativeProps` 仅首次生效（RN 0.72.5 已废弃该通道），ArkUI 公开滚动 API 无速度接管能力，Android 原生 shift 无法移植。位置保持已由 `maintainVisibleContentPosition` 等价承担（与 iOS 路线一致）。

## 其他

- 平台路线：HarmonyOS 归入与 iOS 相同的「原生零实现」平台列，不渲染自定义 ScrollComponent，位置保持完全依赖 RNOH RNSScrollView 内建 `maintainVisibleContentPosition`（contentSize 变化时按首个可视项位移无动画纠正），Android 原生 ViewManager 不参与鸿蒙构建。

## 目录结构

```
/rntpc_bidirectional-flatlist    # 项目根目录
├── src                          # RN 层源码（纯 JS，四框架版本共用）
│   ├── FlatList.tsx             # 组件主体：预渲染编排、ref 组装、harmony 兜底边界
│   ├── ScrollView.tsx           # Android 专用自定义 ScrollComponent（shift 原生通道载体）
│   ├── BidirectionalFlatlist.ts # Android 原生视图组件定义
│   ├── hooks
│   │   └── usePrerenderedData.tsx   # 离屏测高、高度表/offset 前缀和维护、位移计算
│   ├── compat
│   │   └── patchRenderMask.ts    # render mask 越界 clamp 补丁（RNOH 0.72 专项，幂等）
│   ├── config.ts                # 常量（MIN_INDEX 等）
│   ├── types.ts                 # 类型定义
│   └── index.tsx                # 入口导出
├── example                      # 示例工程
│   └── jest                     # XTS 白盒单元测试（覆盖率 100%）
│       ├── __test__             # 测试用例
│       ├── mocks                # react-native 测试替身
│       └── jest.config.js       # 覆盖率阈值全 100%
├── package.json                 # 包信息（@react-native-ohos 作用域）
├── README.md                    # 中文说明
├── README_en.md                 # 英文说明
└── CHANGELOG.md                 # 鸿蒙化变更记录
```

## 贡献代码

使用过程中发现任何问题都可以提交 [Issue](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/issues) ，当然也非常欢迎提交 [PR](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/pulls) 。

## 开源协议

本项目基于 [The MIT License (MIT)](https://github.com/steuerbot/react-native-bidirectional-flatlist/blob/main/LICENSE) 授权，使用和修改请遵循该开源协议。
