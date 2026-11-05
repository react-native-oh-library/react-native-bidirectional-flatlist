/**
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { RNPackageContext, RNPackage } from '@rnoh/react-native-openharmony/ts';
import { createRNOHPackages } from './RNOHPackagesFactory';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  // 0.84：reanimated/worklets 的 ohos 包恢复 autolink 支持，
  // RNOHPackagesFactory.ets 由 CLI 在 npm run dev 时生成（含注册），
  // 勿在此手动 import 再注册一次（会双重注册）
  return [
    ...createRNOHPackages(ctx),
  ];
}
