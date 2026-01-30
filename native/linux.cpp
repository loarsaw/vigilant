#include "process_info.h"
#include <dirent.h>
#include <unistd.h>
#include <fstream>
#include <sstream>
#include <algorithm>

bool IsGui(const std::string& pid) {
    std::ifstream envFile("/proc/" + pid + "/environ");
    std::string env;
    while (std::getline(envFile, env, '\0')) {
        if (env.find("DISPLAY=") == 0 || env.find("WAYLAND_DISPLAY=") == 0) {
            return true;
        }
    }
    return false;
}

ProcessInfo ParseProcStat(const std::string& pid) {
    ProcessInfo info;
    info.pid = std::stoul(pid);

    // Get UID and User status
    std::ifstream statusFile("/proc/" + pid + "/status");
    std::string line;
    while (std::getline(statusFile, line)) {
        if (line.find("Uid:") == 0) {
            std::sscanf(line.c_str(), "Uid: %u", &info.uid);
            info.isUserApp = (info.uid >= 1000);
            break;
        }
    }

    // Get Memory and Cmdline
    std::ifstream statmFile("/proc/" + pid + "/statm");
    unsigned long rss;
    if (statmFile >> rss >> rss) {
        info.memory = (double)(rss * sysconf(_SC_PAGESIZE)) / (1024 * 1024);
    }

    std::ifstream cmdFile("/proc/" + pid + "/cmdline");
    char c;
    while (cmdFile.get(c)) info.cmd += (c == '\0' ? ' ' : c);

    info.isGuiApp = IsGui(pid);
    return info;
}

std::vector<ProcessInfo> GetProcessList() {
    std::vector<ProcessInfo> processes;
    DIR* dir = opendir("/proc");
    if (!dir) return processes;

    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        if (isdigit(entry->d_name[0])) {
            ProcessInfo info = ParseProcStat(entry->d_name);
            if (info.isUserApp || info.isGuiApp) {
                processes.push_back(info);
            }
        }
    }
    closedir(dir);
    return processes;
}
