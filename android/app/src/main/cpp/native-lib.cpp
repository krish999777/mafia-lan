#include <jni.h>
#include <string>
#include <cstdlib>
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>
#include <vector>

#define LOG_TAG "MafiaLAN-Node"

namespace node {
    extern int Start(int argc, char** argv);
}

// Redirect stdout and stderr to Android Logcat
static int pipe_stdout[2];
static int pipe_stderr[2];
static pthread_t thread_stdout;
static pthread_t thread_stderr;

static void* thread_stderr_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stderr[0], buf, sizeof(buf) - 1)) > 0) {
        if (buf[redirect_size - 1] == '\n') --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_ERROR, LOG_TAG, buf);
    }
    return nullptr;
}

static void* thread_stdout_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stdout[0], buf, sizeof(buf) - 1)) > 0) {
        if (buf[redirect_size - 1] == '\n') --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_INFO, LOG_TAG, buf);
    }
    return nullptr;
}

static void start_redirecting_stdout_stderr() {
    setvbuf(stdout, nullptr, _IONBF, 0);
    pipe(pipe_stdout);
    dup2(pipe_stdout[1], STDOUT_FILENO);

    setvbuf(stderr, nullptr, _IONBF, 0);
    pipe(pipe_stderr);
    dup2(pipe_stderr[1], STDERR_FILENO);

    if (pthread_create(&thread_stdout, nullptr, thread_stdout_func, nullptr) == 0) {
        pthread_detach(thread_stdout);
    }
    if (pthread_create(&thread_stderr, nullptr, thread_stderr_func, nullptr) == 0) {
        pthread_detach(thread_stderr);
    }
}

extern "C" JNIEXPORT jint JNICALL
Java_com_krishshah_mafialan_NodeBridge_startNodeWithArguments(
        JNIEnv *env,
        jclass /* clazz */,
        jobjectArray arguments,
        jstring nodePath) {

    start_redirecting_stdout_stderr();

    if (nodePath != nullptr) {
        const char* path_chars = env->GetStringUTFChars(nodePath, nullptr);
        chdir(path_chars);
        setenv("NODE_PATH", path_chars, 1);
        std::string public_dir = std::string(path_chars) + "/public";
        setenv("CLIENT_DIST_PATH", public_dir.c_str(), 1);
        env->ReleaseStringUTFChars(nodePath, path_chars);
    }

    jsize count = env->GetArrayLength(arguments);
    std::vector<std::string> args_storage;
    args_storage.reserve(count);
    std::vector<char*> argv;
    argv.reserve(count + 1);

    for (jsize i = 0; i < count; i++) {
        auto arg = (jstring) env->GetObjectArrayElement(arguments, i);
        const char* str = env->GetStringUTFChars(arg, nullptr);
        args_storage.emplace_back(str);
        env->ReleaseStringUTFChars(arg, str);
        env->DeleteLocalRef(arg);
    }

    for (auto& s : args_storage) {
        argv.push_back(&s[0]);
    }
    argv.push_back(nullptr);

    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "Starting Node.js server with %d arguments", count);
    for (int i = 0; i < count; i++) {
        __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "  argv[%d] = %s", i, argv[i]);
    }

    int exitCode = node::Start(count, argv.data());
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "Node.js finished with code: %d", exitCode);
    return exitCode;
}
