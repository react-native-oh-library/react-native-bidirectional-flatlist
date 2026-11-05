/**
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#include "RNOH/PackageProvider.h"
#include "RNOHPackagesFactory.h"
// 0.77 起 ohos reanimated 不支持 autolink，需手动注册（头文件经
// rnoh_reanimated 目标的 PUBLIC include 目录解析）
#include "ReanimatedPackage.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    // 手动注册示例（不支持autolink的插件）
    const std::vector<std::shared_ptr<Package>> ManualLinkingPackage = {
        std::make_shared<rnoh::ReanimatedPackage>(ctx),
    };

    // autolink支持
    auto packages = createRNOHPackages(ctx);

    // 合并手动注册的包
    for (const auto& pkg : ManualLinkingPackage) {
        packages.push_back(pkg);
    }

    return packages;
}
