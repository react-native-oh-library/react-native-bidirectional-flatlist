> Doc Template: v0.4.2

<p align="center">
  <h1 align="center"> <code>react-native-bidirectional-flatlist</code> </h1>
</p>

This project is developed based on [react-native-bidirectional-flatlist](https://github.com/steuerbot/react-native-bidirectional-flatlist).

The repository of this third-party library has been migrated to Gitcode and can be downloaded directly from npm. The new package name is `@react-native-ohos/react-native-bidirectional-flatlist`. The version mapping is as follows:

| Package Name    | Version (npm)    | Release     | RN Version Supported    | Autolink     | API Version     | Community Baseline    |  Source   |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-bidirectional-flatlist | [~0.6.0](https://www.npmjs.com/package/@react-native-ohos/react-native-bidirectional-flatlist) | [Gitcode Releases](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/releases) | 0.72.* / 0.77.* / 0.82.* / 0.84.* | No | API12+ | 0.6.0 | [master](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/tree/master) |


## Introduction

`react-native-bidirectional-flatlist` is a bidirectional list component library for React Native.<br/>
It solves the problem that the scroll position cannot stay on the current item when data is prepended/appended in scenarios such as chat lists: new items are first pre-rendered offscreen for height measurement, and the data commit is accompanied by offset compensation so that the visible items do not jump.

## Installation

Enter the project directory and run:

#### **npm**

```bash
npm install @react-native-ohos/react-native-bidirectional-flatlist
```

#### **yarn**

```bash
yarn add @react-native-ohos/react-native-bidirectional-flatlist
```

## Usage

The following code shows the basic usage:

> [!WARNING] The import name stays unchanged.

```tsx
import React, {useState} from 'react';
import BidirectionalFlatList from 'react-native-bidirectional-flatlist';

const ChatList = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const prepend = () => {
    // Prepend 20 history messages; the list measures heights and keeps the reading position
    setMessages((x) => [...generateMessages(20), ...x]);
  };

  return (
    <BidirectionalFlatList
      data={messages}
      // prerendering=true means this render is for offscreen measurement; a lightweight placeholder is fine
      renderItem={({item, prerendering}) => (
        <Message item={item} prerendering={prerendering} />
      )}
      keyExtractor={(item) => item.id}
      onUpdateData={({heights, offset, height}) => {
        // Called after data commit + shift calculation (heights = measured item heights)
      }}
    />
  );
};
```

## Link

|                                      | Autolink Supported | RN Version |
|--------------------------------------|-----------------|------------|
| ~0.6.0                               |  No              |  0.72 / 0.77 / 0.82 / 0.84 |

This library is a pure JS component library without any native module (no C++ / ArkTS code). Autolink / Manual Link is not required, and no registration in `RNPackagesFactory.ets` or `PackageProvider.cpp` is needed. Metro redirects the community package name `react-native-bidirectional-flatlist` to this package via the built-in `harmony.alias` config, so `import 'react-native-bidirectional-flatlist'` keeps working.

## Constraints

### Compatibility

To use this library, you need to use the correct combination of React Native and RNOH versions, together with the matching DevEco Studio and phone ROM.

The following versions have been verified:

1. RNOH: 0.72.5; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.0.858; ROM: 6.0.0.112;
2. RNOH: 0.77.1; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.0.858; ROM: 6.0.0.112;
3. RNOH: 0.82.1; SDK: HarmonyOS 6.0.1 Release SDK; IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0.328 SP26;
4. RNOH: 0.84.1; SDK: HarmonyOS 6.0.1 Release SDK; IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0.120 SP7;

## Interface Description

### API

> [!TIP] The "Platform" column indicates the platforms originally supported by the community library.

> [!TIP] "OpenHarmony Support" value yes means OpenHarmony supports this feature; no means not supported; partially means partially supported. The usage is the same as on other platforms, while the performance may differ from iOS and Android.

### 1. JS Layer API

The following are the basic properties of @react-native-ohos/react-native-bidirectional-flatlist adapted for HarmonyOS. The properties have been verified. For more details, see the documentation of [react-native-bidirectional-flatlist](https://github.com/steuerbot/react-native-bidirectional-flatlist).

| Name | Description | Type | Return | Required | Platform | OpenHarmony Support |
| ---- | ---- | -------- | ------ | ---- | ---- | ------------------- |
| `BidirectionalFlatList` | FlatList component that keeps the scroll position on prepend/append (default export) | `FlatListProps` plus the props below | React component | Yes | iOS / Android | Yes |
| `data` | List data | `readonly T[]` | / | Yes | iOS / Android | Yes |
| `renderItem` | Render one item | `({item: T, prerendering?: boolean}) => ReactNode` | / | Yes | iOS / Android | Yes |
| `keyExtractor` | Stable key of an item | `(item: T) => string` | / | No | iOS / Android | Yes |
| `getItemLayout` | When provided, offscreen measuring is skipped and `length` is used as the height table | `(data, index) => {index, length, offset}` | / | No | iOS / Android | Yes |
| `onUpdateData` | Callback after data commit and shift calculation | `({heights: Record<string, number>, offset: number, height: number}) => void` | / | No | iOS / Android | Yes |
| `maintainVisibleContentPosition` | Position keeping config | `{minIndexForVisible: number, autoscrollToTopThreshold?: number}` | / | No | iOS / Android | Yes |
| `ref.shift({offset, height})` | Native shift channel on Android (physical pixels) | `{offset: number, height: number}` | `void` | No | Android | No |

### 2. HarmonyOS Native-side API

None. This library is pure JS and does not depend on any TurboModule / Native API.

## Legacy Issues

- `ref.shift()` is a no-op on OpenHarmony: under RNOH `setNativeProps` only takes effect the first time (deprecated since RN 0.72.5), and ArkUI public scroll APIs cannot take over fling velocity, so the Android native shift cannot be ported. Position keeping is equivalently provided by `maintainVisibleContentPosition` (same route as iOS).

## Others

- Platform route: HarmonyOS belongs to the same "zero native implementation" column as iOS. The custom ScrollComponent is not rendered; position keeping fully relies on the RNOH RNSScrollView built-in `maintainVisibleContentPosition` (non-animated correction anchored to the first visible item when contentSize changes). The Android native ViewManager does not participate in the HarmonyOS build.

## Directory Structure

```
/rntpc_bidirectional-flatlist    # project root
├── src                          # RN layer source (pure JS, shared by all four versions)
│   ├── FlatList.tsx             # component body: prerender orchestration, ref composition, harmony boundary
│   ├── ScrollView.tsx           # Android-only custom ScrollComponent (carrier of the native shift channel)
│   ├── BidirectionalFlatlist.ts # Android native view component definition
│   ├── hooks
│   │   └── usePrerenderedData.tsx   # offscreen measuring, height table / offset prefix sums, shift calculation
│   ├── compat
│   │   └── patchRenderMask.ts    # render mask clamp patch for RNOH 0.72 (idempotent)
│   ├── config.ts                # constants (MIN_INDEX, etc.)
│   ├── types.ts                 # type definitions
│   └── index.tsx                # entry exports
├── example                      # example project
│   └── jest                     # XTS white-box unit tests (100% coverage)
│       ├── __test__             # test cases
│       ├── mocks                # react-native test doubles
│       └── jest.config.js       # coverage threshold 100% for all metrics
├── package.json                 # package info (@react-native-ohos scope)
├── README.md                    # Chinese docs
├── README_en.md                 # English docs
└── CHANGELOG.md                 # adaptation changelog
```

## How to Contribute

If you find any problems during use, feel free to submit an [Issue](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/issues) . Pull requests are also very welcome at [PR](https://gitcode.com/liuyihai2002/rntpc_bidirectional-flatlist/pulls) .

## License

This project is licensed under [The MIT License (MIT)](https://github.com/steuerbot/react-native-bidirectional-flatlist/blob/main/LICENSE) .
