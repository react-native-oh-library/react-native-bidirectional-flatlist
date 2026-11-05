/**
 * Copyright (c) 2026 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// RNOH JS 白盒测试（XTS）配置
// 仓库根目录执行：npx jest -c example/jest/jest.config.js --coverage
// example 目录执行：npm run test:coverage
//
// 本库为纯 JS 组件库（无 harmony 原生模块），被测对象是仓库 src/ 下的
// TSX 源码；react / react-native 一律解析到 example/node_modules，
// 避免根目录 devDependencies 里的 react-native@0.72.5 被误用。
module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  maxWorkers: 1,
  testMatch: ['<rootDir>/example/jest/__test__/*-test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/oh_modules/'],
  modulePathIgnorePatterns: ['<rootDir>/example/harmony/'],
  setupFiles: ['<rootDir>/example/jest/jest.setup.js'],
  globals: {
    __DEV__: true,
  },
  modulePaths: ['<rootDir>/example/node_modules', '<rootDir>/node_modules'],
  moduleNameMapper: {
    '^react$': '<rootDir>/example/node_modules/react',
    '^react/(.*)$': '<rootDir>/example/node_modules/react/$1',
    '^react-native$': '<rootDir>/example/node_modules/react-native',
    '^react-native/(.*)$': '<rootDir>/example/node_modules/react-native/$1',
    '^react-native-bidirectional-flatlist$': '<rootDir>/src/index.tsx',
  },
  transform: {
    // RN 源码（flow/ts 混合）与库 TSX 一律用 RN 官方 preset 转译，
    // 手搓 preset-env+flow 组合解析不了 RN 0.84 的 `as` cast 等语法
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [['module:@react-native/babel-preset', {unstable_transformImportMeta: false}]],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|react)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/specs/**',
    // 纯类型声明文件，无运行时代码（v8 覆盖率会误报为 0）
    '!src/types.ts',
  ],
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/example/coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
