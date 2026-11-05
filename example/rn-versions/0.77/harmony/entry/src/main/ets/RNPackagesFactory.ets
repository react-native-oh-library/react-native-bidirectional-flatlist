/**
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { RNPackageContext, RNPackage } from '@rnoh/react-native-openharmony/ts';
import { createRNOHPackages as createRNOHPackagesAutolinking } from './RNOHPackagesFactory';
// 0.77 起 ohos reanimated 包无 autolinking 字段，需手动注册
// （参考 rntpc_react-native-reanimated br_rnoh0.77 分支文档）
import { ReanimatedPackage } from '@react-native-ohos/react-native-reanimated/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    // autolink支持（RNOHPackagesFactory.ets 为模板 stub，build hap 时 hvigor 覆盖）
    ...createRNOHPackagesAutolinking(ctx),

    // 手动注册（不支持autolink的插件）
    new ReanimatedPackage(ctx),
  ];
}
