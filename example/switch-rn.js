#!/usr/bin/env node
/**
 * RN 框架版本切换脚本（0.72 / 0.77 / 0.82 / 0.84）
 *
 * 用法：
 *   node switch-rn.js <version>   切换到指定框架版本（0.72 | 0.77 | 0.82 | 0.84）
 *   node switch-rn.js --list      查看支持的版本及配套矩阵
 *   node switch-rn.js --current   查看当前使用的框架版本
 *
 * 选项：
 *   --no-install  只改写工程配置，不执行 npm install（之后需手动执行）
 *   --no-bundle   切换完成后不执行 npm run dev 重新生成 bundle
 *   --force       目标版本与当前一致时也强制重写配置
 *
 * 做了什么：
 *   1. 用 rn-versions/<version>/ 下的模板覆盖 package.json / babel.config.js
 *      及 harmony 侧配置（oh-package.json5、ets/cpp 注册文件、CMakeLists.txt）
 *   2. npm install 安装对应版本依赖
 *   3. 探测 node_modules 中实际存在的 RNOH har 文件名（release.har / .har
 *      不同版本包内命名有差异），回填 oh-package.json5 后再写入
 *   4. 删除 ohpm 旧锁文件，清 metro 缓存，重新生成 bundle.harmony.js
 *
 * 切换完成后需在 DevEco Studio 中 Sync + 重新构建 HAP（见 框架版本切换运行指南.md）。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {spawnSync} = require('child_process');

const EXAMPLE_DIR = __dirname;
const TEMPLATE_ROOT = path.join(EXAMPLE_DIR, 'rn-versions');

// 每个版本需要覆盖的文件（相对 example/ 的路径）
const TEMPLATE_FILES = [
  'package.json',
  'babel.config.js',
  'harmony/oh-package.json5',
  'harmony/entry/oh-package.json5',
  'harmony/entry/src/main/ets/RNPackagesFactory.ets',
  'harmony/entry/src/main/ets/RNOHPackagesFactory.ets',
  'harmony/entry/src/main/cpp/RNOHPackagesFactory.h',
  'harmony/entry/src/main/cpp/PackageProvider.cpp',
  'harmony/entry/src/main/cpp/CMakeLists.txt',
  'harmony/entry/src/main/cpp/autolinking.cmake',
];

// 依赖 npm install 之后才能确定内容的文件（har 文件名探测后回填）
const POST_INSTALL_FILES = new Set([
  'harmony/oh-package.json5',
  'harmony/entry/oh-package.json5',
]);

// oh-package 中 har 引用的候选文件名（按优先级，按版本区分）
// 0.72：release.har 含 src/main/include 头文件 + libs 预编译库，C++ 头文件式接入；
// 0.77+：C++ 必须从 src/main/cpp 源码编译，仅全量 react_native_openharmony.har 含 cpp
//       （release.har 只有 ets，缺 cpp 会让 BuildNativeWithCmake 报
//        add_subdirectory 源目录不存在 / set_target_properties 找不到 rnoh 目标）
const RNOH_HAR_CANDIDATES = {
  '0.72': ['react_native_openharmony_release.har', 'react_native_openharmony.har'],
  '0.77': ['react_native_openharmony.har'],
  '0.82': ['react_native_openharmony.har'],
  '0.84': ['react_native_openharmony.har'],
};

const VERSION_INFO = {
  '0.72': {
    label: 'RN 0.72（已验证基线）',
    harmony: '0.72.145',
    reanimated: '3.6.0 / @ohos ~3.6.5（autolink）',
  },
  '0.77': {
    label: 'RN 0.77（0.77-stable）',
    harmony: '0.77.71',
    reanimated: '3.18.0 / @ohos ~3.18.1（手动注册）',
  },
  '0.82': {
    label: 'RN 0.82（0.82-stable）',
    harmony: '0.82.30',
    reanimated: '4.2.1 / @ohos 4.0.2 + worklets 0.7.1 / 1.0.1（手动注册）',
  },
  '0.84': {
    label: 'RN 0.84（0.84-rc，reanimated 官方 4.1.0 待发布，暂用 4.0.2，见运行指南）',
    harmony: '0.84.4',
    reanimated: '4.2.1 / @ohos 4.0.2 + worklets 0.7.1 / 1.0.1（手动注册）',
  },
};

function usage() {
  console.log(`用法: node switch-rn.js <version>
  version: ${Object.keys(VERSION_INFO).join(' | ')}
  选项: --no-install  不执行 npm install
        --no-bundle   切换后不生成 bundle
        --force       版本未变化时也强制重写
  其他: --list   查看支持的版本及配套矩阵
        --current 查看当前框架版本
示例: node switch-rn.js 0.77`);
}

function readCurrentVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(EXAMPLE_DIR, 'package.json'), 'utf-8'));
    const rn = pkg.dependencies && pkg.dependencies['react-native'];
    if (!rn) return '(未知)';
    if (rn.startsWith('0.72.')) return '0.72';
    if (rn.startsWith('0.77.')) return '0.77';
    if (rn.startsWith('0.82.')) return '0.82';
    if (rn.startsWith('0.84.')) return '0.84';
    return `(未知 react-native@${rn})`;
  } catch (e) {
    return '(无法读取 package.json)';
  }
}

function printList() {
  console.log('支持的 RN 框架版本：\n');
  for (const [ver, info] of Object.entries(VERSION_INFO)) {
    console.log(`  ${ver}  ${info.label}`);
    console.log(`       @react-native-oh/react-native-harmony: ${info.harmony}`);
    console.log(`       reanimated: ${info.reanimated}\n`);
  }
}

function applyTemplate(version, {harName}) {
  let copied = 0;
  for (const rel of TEMPLATE_FILES) {
    if (harName === undefined && POST_INSTALL_FILES.has(rel)) continue;
    const src = path.join(TEMPLATE_ROOT, version, rel);
    if (!fs.existsSync(src)) {
      throw new Error(`模板缺失: rn-versions/${version}/${rel}`);
    }
    let content = fs.readFileSync(src, 'utf-8');
    if (harName !== undefined) {
      content = content.split('{{RNOH_HAR}}').join(harName);
      if (content.includes('{{')) {
        throw new Error(`rn-versions/${version}/${rel} 存在未替换的占位符`);
      }
    }
    const dest = path.join(EXAMPLE_DIR, rel);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.writeFileSync(dest, content);
    copied += 1;
  }
  return copied;
}

function installedHarmonyMajor() {
  // 判断 node_modules 里实际装的 RNOH JS 包属于哪个框架版本线（0.72/0.77/...）
  try {
    const pkg = JSON.parse(fs.readFileSync(
      path.join(EXAMPLE_DIR, 'node_modules', '@react-native-oh', 'react-native-harmony', 'package.json'), 'utf-8'));
    const v = pkg.version || '';
    const m = v.match(/^0\.(72|77|82|84)\./);
    return m ? `0.${m[1]}` : null;
  } catch (e) {
    return null;
  }
}

function detectRnohHar(version) {
  const dir = path.join(EXAMPLE_DIR, 'node_modules', '@react-native-oh', 'react-native-harmony');
  if (!fs.existsSync(dir)) return null;
  for (const name of RNOH_HAR_CANDIDATES[version]) {
    if (fs.existsSync(path.join(dir, name))) return name;
  }
  return null;
}

function assertHarDeps(version) {
  const checks = [
    ['@react-native-ohos/react-native-reanimated/harmony/reanimated.har', 'reanimated'],
  ];
  if (version === '0.82' || version === '0.84') {
    checks.push(['@react-native-ohos/react-native-worklets/harmony/worklets.har', 'worklets']);
  }
  for (const [rel, name] of checks) {
    if (!fs.existsSync(path.join(EXAMPLE_DIR, 'node_modules', rel))) {
      throw new Error(`node_modules 中未找到 ${name} 的 har 包（${rel}），请检查 npm install 是否成功`);
    }
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {stdio: 'inherit', shell: true, cwd: EXAMPLE_DIR, ...opts});
  if (r.status !== 0) {
    throw new Error(`命令执行失败: ${cmd} ${args.join(' ')} (exit ${r.status})`);
  }
}

function clearMetroCache() {
  const dir = path.join(os.tmpdir(), 'metro-cache');
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, {recursive: true, force: true});
      console.log(`已清理 metro 缓存: ${dir}`);
    }
  } catch (e) {
    console.warn(`清理 metro 缓存失败（可忽略）: ${e.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(0);
  }
  if (args.includes('--list')) {
    printList();
    process.exit(0);
  }
  if (args.includes('--current')) {
    console.log(`当前框架版本: ${readCurrentVersion()}`);
    process.exit(0);
  }

  const version = args[0];
  const noInstall = args.includes('--no-install');
  const noBundle = args.includes('--no-bundle');
  const force = args.includes('--force');

  if (!VERSION_INFO[version]) {
    console.error(`不支持的版本: ${version}\n`);
    printList();
    process.exit(1);
  }

  const current = readCurrentVersion();
  console.log(`=== 切换 RN 框架版本: ${current} -> ${version} ===`);
  console.log(`    ${VERSION_INFO[version].label}\n`);

  // 配置版本一致且依赖也确实装到位时才允许幂等退出；若上次安装中断
  // （package.json 已是目标版本但 node_modules 还是旧版本线），需完整重跑
  const installedLine = installedHarmonyMajor();
  const alreadyInstalled = installedLine === version;

  if (current === version && alreadyInstalled && !force) {
    console.log('已是目标版本且依赖就绪，未做修改（如需重写配置可加 --force）。');
    process.exit(0);
  }

  // 1. 覆盖 JS 侧与 ets/cpp 配置（oh-package 等 npm install 后再写）
  applyTemplate(version, {harName: undefined});
  console.log('已写入 package.json / babel.config.js / harmony ets & cpp 配置');

  // 2. 安装依赖（跨版本切换时旧 node_modules/lock 会与新版本 peer 约束冲突，先清理）
  if (noInstall) {
    console.log('\n--no-install：跳过 npm install。请手动执行后重跑本脚本（不带 --no-install）');
    console.log('以完成 har 文件名探测与 oh-package 回填！');
    process.exit(0);
  }
  for (const stale of ['node_modules', 'package-lock.json']) {
    const p = path.join(EXAMPLE_DIR, stale);
    if (fs.existsSync(p)) {
      fs.rmSync(p, {recursive: true, force: true});
      console.log(`已清理旧的 ${stale}`);
    }
  }
  console.log('\n>>> npm install（可能需要数分钟）...');
  run('npm', ['install', '--no-audit', '--no-fund']);

  // 3. 探测 har 文件名并写入 oh-package
  const harName = detectRnohHar(version);
  if (!harName) {
    throw new Error(
      '未在 node_modules/@react-native-oh/react-native-harmony 中找到 har 文件，' +
      'npm install 可能失败，请检查上方安装日志');
  }
  assertHarDeps(version);
  applyTemplate(version, {harName});
  console.log(`已写入 harmony oh-package.json5（RNOH har: ${harName}）`);

  // 4. 清理旧 ohpm 锁文件，避免 har 路径变更后仍按旧缓存解析
  for (const lock of ['harmony/oh-package-lock.json5', 'harmony/entry/oh-package-lock.json5']) {
    const p = path.join(EXAMPLE_DIR, lock);
    if (fs.existsSync(p)) {
      fs.rmSync(p);
      console.log(`已删除旧锁文件: ${lock}`);
    }
  }
  // 同步清掉上一版本的构建产物：0.72 har 带预编译 so、0.77+ 从源码编 so，
  // 交叉残留会让 ProcessLibs 报 Duplicated files（如 libhermes.so 同时出现在
  // har 的 libs/ 与旧 obj/arm64-v8a/），CMake 旧缓存也会串版本
  for (const stale of ['harmony/entry/build', 'harmony/entry/.cxx']) {
    const p = path.join(EXAMPLE_DIR, stale);
    if (fs.existsSync(p)) {
      fs.rmSync(p, {recursive: true, force: true});
      console.log(`已清理旧构建产物: ${stale}`);
    }
  }

  // 5. 重新生成 bundle（metro 缓存先清掉，避免跨版本串味）
  if (!noBundle) {
    clearMetroCache();
    console.log('\n>>> npm run dev 生成 bundle.harmony.js（可能需要数分钟）...');
    run('npm', ['run', 'dev']);
  }

  console.log(`\n=== 切换完成：RN ${version} ===`);
  console.log('接下来请在 DevEco Studio 中：');
  console.log('  1. 打开 example/harmony 工程，等待/触发 Sync（ohpm 重新解析 har 依赖）');
  console.log('  2. Build > Build Hap(s)/APP(s) > Build Hap(s) 重新构建');
  console.log('  3. 运行到设备验证');
  console.log('详见: 框架版本切换运行指南.md');
}

try {
  main();
} catch (e) {
  console.error(`\n[switch-rn] 失败: ${e.message}`);
  process.exit(1);
}
