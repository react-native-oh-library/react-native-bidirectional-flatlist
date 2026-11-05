project(rnapp)
cmake_minimum_required(VERSION 3.4.1)
set(CMAKE_SKIP_BUILD_RPATH TRUE)
set(NATIVERENDER_ROOT_PATH "${CMAKE_CURRENT_SOURCE_DIR}")
set(OH_MODULE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")
set(OH_MODULES_DIR "${OH_MODULE_DIR}")
# 0.77 起 RNOH har 自带顶层 CMakeLists（src/main/cpp），rnoh 目标由框架侧统一构建
set(RNOH_CPP_DIR "${OH_MODULE_DIR}/@rnoh/react-native-openharmony/src/main/cpp")
set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(RNOH_GENERATED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/generated")

set(CMAKE_CXX_STANDARD 17)
set(LOG_VERBOSITY_LEVEL 1)
set(CMAKE_ASM_FLAGS "-Wno-error=unused-command-line-argument -Qunused-arguments")
set(CMAKE_CXX_FLAGS "-fstack-protector-strong -Wl,-z,relro,-z,now,-z,noexecstack -s -fPIE -pie -DNDEBUG")
set(WITH_HITRACE_SYSTRACE 1)
add_compile_definitions(WITH_HITRACE_SYSTRACE)

include_directories(${NATIVERENDER_ROOT_PATH})

file(GLOB GENERATED_CPP_FILES "./generated/*.cpp")

add_subdirectory("${RNOH_CPP_DIR}" ./rn)

# 手动接入 reanimated + worklets（0.82 起均不支持 autolink；
# reanimated 4.x 的 rnoh_reanimated 依赖 rnoh_worklets 目标，两者必须同时引入）
add_subdirectory("${OH_MODULES_DIR}/@react-native-ohos/react-native-reanimated/src/main/cpp" ./reanimated)
add_subdirectory("${OH_MODULES_DIR}/@react-native-ohos/react-native-worklets/src/main/cpp" ./worklets)

add_library(rnoh_app SHARED
    ${GENERATED_CPP_FILES}
    "./PackageProvider.cpp"
    "${RNOH_CPP_DIR}/RNOHAppNapiBridge.cpp"
)

target_link_libraries(rnoh_app PUBLIC rnoh)
target_link_libraries(rnoh_app PUBLIC rnoh_reanimated)
target_link_libraries(rnoh_app PUBLIC rnoh_worklets)

target_compile_options(rnoh_app PUBLIC -DRAW_PROPS_ENABLED -std=c++17)

# [Windows workaround] hvigor(6.0.1) syncLibOutputs 的同路径判定 checkCopyPathIsSame 依赖
# statSync().ino，Windows 上恒为 0：库目标直接输出到 CMAKE_LIBRARY_OUTPUT_DIRECTORY(obj/arm64-v8a)
# 时，linkFile(同路径) 先 unlink 源再 copyFile → "ENOENT copyfile '<so>' -> '<so>'"。
# 让各库目标先输出到 ninja 工作树独立目录，由 hvigor 以 hard link/copy 同步到 obj/arm64-v8a
# （即其 "External build set its own library output location" 的正常路径）。
# reanimated/worklets 目标由 add_subdirectory 引入（HAR 自带 CMake），
# 其目标同样直出 CMAKE_LIBRARY_OUTPUT_DIRECTORY 会踩同一 bug，一并重定向
set(RNOH_LIB_OUTPUT_DIR "${CMAKE_BINARY_DIR}/hvigor-libs")
foreach(rnoh_lib_target rnoh rnoh_app rnoh_reanimated rnoh_worklets)
    set_target_properties(${rnoh_lib_target} PROPERTIES
        ARCHIVE_OUTPUT_DIRECTORY "${RNOH_LIB_OUTPUT_DIR}/${rnoh_lib_target}"
        LIBRARY_OUTPUT_DIRECTORY "${RNOH_LIB_OUTPUT_DIR}/${rnoh_lib_target}"
        RUNTIME_OUTPUT_DIRECTORY "${RNOH_LIB_OUTPUT_DIR}/${rnoh_lib_target}")
endforeach()
