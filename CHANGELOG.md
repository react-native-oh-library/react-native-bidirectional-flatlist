# ChangeLog

## 鸿蒙化Log

### v0.6.0

- 基于社区基线 [react-native-bidirectional-flatlist@0.6.0](https://github.com/steuerbot/react-native-bidirectional-flatlist) 完成鸿蒙（OpenHarmony）适配，包名 `@react-native-ohos/react-native-bidirectional-flatlist`。
- 单分支覆盖 RNOH 0.72 / 0.77 / 0.82 / 0.84 四个框架版本，业务侧 `import 'react-native-bidirectional-flatlist'` 用法不变（Metro 经 `harmony.alias` 重定向）。
- HarmonyOS 走与 iOS 一致的纯 JS 路线：位置保持由 RNOH RNSScrollView 内建 `maintainVisibleContentPosition` 承担（默认 `{minIndexForVisible: 1}`）。
- RNOH 0.72 专项：`patchRenderMask` 对滚动中删头部数据导致的 render mask 越界断言做 clamp；`FlatListErrorBoundary` 兜底捕获越界 fatal 并自动重挂列表（修复 RemoveFirst 白屏）。
- `ref.shift()` 在鸿蒙为 no-op（与 iOS 行为一致），位置保持由 `maintainVisibleContentPosition` 等价承担。
- 新增 example 多框架版本一键切换（`node switch-rn.js <0.72|0.77|0.82|0.84>`）与 XTS 白盒单元测试（`example/jest`，覆盖率 100%）。
