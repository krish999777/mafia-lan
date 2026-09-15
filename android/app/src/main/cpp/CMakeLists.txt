cmake_minimum_required(VERSION 3.10.2)

project("mafialan")

add_library(
    mafia-node-bridge
    SHARED
    native-lib.cpp
)

# Import the prebuilt libnode.so for the current ABI
add_library(
    libnode
    SHARED
    IMPORTED
)

set_target_properties(
    libnode
    PROPERTIES IMPORTED_LOCATION
    ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libnode.so
)

find_library(
    log-lib
    log
)

target_link_libraries(
    mafia-node-bridge
    libnode
    ${log-lib}
)
