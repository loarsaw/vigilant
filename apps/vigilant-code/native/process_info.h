#ifndef PROCESS_INFO_H
#define PROCESS_INFO_H

#include <napi.h>
#include <vector>
#include <string>
#include <cstdint>

struct ProcessInfo {
    // Core fields (Available on all OS)
    uint32_t pid;
    uint32_t ppid;
    std::string name;
    std::string path;
    std::string cmd;
    double memory;

    // ML-Specific Features (Must be available on both platforms)
    bool isGuiApp;
    bool isUserApp;

    #ifndef _WIN32
    // Linux/Unix Specific fields
    uint32_t uid;
    double cpu;
    int64_t startTime;
    std::string desktopEntry;
    std::string cwd;
    std::string username;
    #endif
};

// Function signature for platform-specific implementations [cite: 2, 3]
std::vector<ProcessInfo> GetProcessList();

#endif
