/**
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#include "RNOH/PackageProvider.h"
#include "RNOHPackagesFactory.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    // 0.84：reanimated/worklets 的 ohos 包恢复 autolink 支持，
    // RNOHPackagesFactory.h 由 CLI 在 npm run dev 时生成（含注册），
    // 勿在此手动 include 包头（beta 版头文件无 include guard，双重包含会重定义）
    return createRNOHPackages(ctx);
}
