#ifndef PROCESS_INFO_H
#define PROCESS_INFO_H

#include <napi.h>
#include <vector>
#include <string>
#include <cstdint>

struct ProcessInfo {
    uint32_t pid;
    uint32_t ppid;
    std::string name;
    std::string path;
    std::string cmd;
    
    #ifndef _WIN32
    uint32_t uid;
    double cpu;
    double memory;
    int64_t startTime;
    std::string desktopEntry;
    bool isGuiApp;
    std::string cwd;
    bool isUserApp;
    std::string username;
    #endif
};

std::vector<ProcessInfo> GetProcessList();

#endif
