import { Platform } from 'react-native';

// RNOH 0.72：滚动中删除头部数据时 native offset 可能超出新数据的
// offsets 表，VirtualizedList._createRenderMask 会以 first=-1 断言崩溃
// （整树卸载 → 白屏）。这里对越界区间做 clamp 贴边渲染，待 scrollTo /
// onScroll 事件到位后自然恢复；RN 0.74 起 render mask 机制已移除，
// 补丁自动不生效。
let patched = false;

export function patchRenderMask(): void {
  if (patched || Platform.OS !== 'harmony') {
    return;
  }
  patched = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native/virtualized-lists/Lists/VirtualizedList');
    // 该模块是 CJS 导出（module.exports = VirtualizedList），非 .default 形状
    const VL = mod?.default ?? mod;
    const original = VL?._createRenderMask;
    if (typeof original !== 'function') {
      return;
    }
    VL._createRenderMask = function(
      props: any,
      cellsAroundViewport: {first: number; last: number},
      additionalRegions?: ReadonlyArray<{first: number; last: number}> | undefined,
    ) {
      const itemCount = props.getItemCount(props.data);
      if (itemCount > 0) {
        const first = cellsAroundViewport.first;
        const last = cellsAroundViewport.last;
        if (
          first < 0 ||
          first >= itemCount ||
          last >= itemCount ||
          last < first - 1
        ) {
          cellsAroundViewport = {
            first: Math.max(0, Math.min(first, itemCount - 1)),
            last: Math.max(first - 1, Math.min(last, itemCount - 1)),
          };
        }
      }
      return original.call(this, props, cellsAroundViewport, additionalRegions);
    };
  } catch (e) {
    console.log('[BDFL] patch failed: %s', e);
    // 非 0.72 结构（render mask 已移除），静默跳过
  }
}
