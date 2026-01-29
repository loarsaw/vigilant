#include "process_info.h"
#include <dirent.h>
#include <unistd.h>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <vector>

bool IsGuiProcess(const std::string& pid, const std::string& cmd) {
    if (cmd.find("--type=renderer") != std::string::npos) return true;

    std::string envPath = "/proc/" + pid + "/environ";
    std::ifstream envFile(envPath);
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

    std::string cmdlinePath = "/proc/" + pid + "/cmdline";
    std::ifstream cmdFile(cmdlinePath);
    std::stringstream ss;
    char c;
    while (cmdFile.get(c)) {
        ss << (c == '\0' ? ' ' : c);
    }
    info.cmd = ss.str();

    char exePath[1024];
    ssize_t len = readlink(("/proc/" + pid + "/exe").c_str(), exePath, sizeof(exePath)-1);
    if (len != -1) {
        exePath[len] = '\0';
        info.path = std::string(exePath);
    }

    // Get UID and User Info from /proc/[pid]/status
    std::ifstream statusFile("/proc/" + pid + "/status");
    std::string line;
    while (std::getline(statusFile, line)) {
        if (line.find("Uid:") == 0) {
            std::sscanf(line.c_str(), "Uid: %u", &info.uid);
            // On most Linux distros, UIDs >= 1000 are actual users
            info.isUserApp = (info.uid >= 1000);
        }
    }

    // Memory: Use Resident Set Size (RSS) instead of Virtual Size
    std::ifstream statmFile("/proc/" + pid + "/statm");
    unsigned long vms, rss;
    if (statmFile >> vms >> rss) {
        long pageSize = sysconf(_SC_PAGESIZE);
        info.memory = (double)(rss * pageSize) / (1024 * 1024); // Memory in MB
    }

    info.isGuiApp = IsGuiProcess(pid, info.cmd);
    return info;
}

std::vector<ProcessInfo> GetProcessList() {
    std::vector<ProcessInfo> processes;
    DIR* dir = opendir("/proc");
    if (!dir) return processes;

    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        if (isdigit(entry->d_name[0])) {
            processes.push_back(ParseProcStat(entry->d_name));
        }
    }
    closedir(dir);
    return processes;
}
