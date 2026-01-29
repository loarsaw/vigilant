#include "process_info.h"


#include <dirent.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fstream>
#include <sstream>
#include <cstring>
#include <limits.h>
#include <algorithm>

std::string ReadLink(const std::string& path) {
    char buf[PATH_MAX];
    ssize_t len = readlink(path.c_str(), buf, sizeof(buf) - 1);
    if (len != -1) {
        buf[len] = '\0';
        return std::string(buf);
    }
    return "";
}

std::string ReadFile(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) return "";

    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

ProcessInfo ParseProcStat(const std::string& pid) {
    ProcessInfo info;
    info.pid = std::stoul(pid);
    info.ppid = 0;
    info.uid = 0;
    info.cpu = 0.0;
    info.memory = 0.0;
    info.startTime = 0;

    std::string statPath = "/proc/" + pid + "/stat";
    std::string statContent = ReadFile(statPath);

    if (statContent.empty()) {
        return info;
    }

    // Parse /proc/[pid]/stat
    size_t nameStart = statContent.find('(');
    size_t nameEnd = statContent.rfind(')');

    if (nameStart != std::string::npos && nameEnd != std::string::npos) {
        info.name = statContent.substr(nameStart + 1, nameEnd - nameStart - 1);

        std::istringstream iss(statContent.substr(nameEnd + 2));
        char state;
        iss >> state >> info.ppid;
    }

    // Get executable path
    std::string exePath = "/proc/" + pid + "/exe";
    info.path = ReadLink(exePath);

    // Get command line
    std::string cmdlinePath = "/proc/" + pid + "/cmdline";
    std::string cmdline = ReadFile(cmdlinePath);
    for (char& c : cmdline) {
        if (c == '\0') c = ' ';
    }
    if (!cmdline.empty() && cmdline.back() == ' ') {
        cmdline.pop_back();
    }
    info.cmd = cmdline;

    // Get UID from /proc/[pid]/status
    std::string statusPath = "/proc/" + pid + "/status";
    std::ifstream statusFile(statusPath);
    std::string line;
    while (std::getline(statusFile, line)) {
        if (line.find("Uid:") == 0) {
            std::istringstream iss(line.substr(4));
            iss >> info.uid;
            break;
        }
    }

    // Get memory
    std::string statmPath = "/proc/" + pid + "/statm";
    std::ifstream statmFile(statmPath);
    if (statmFile.is_open()) {
        unsigned long size;
        statmFile >> size;
        long pageSize = sysconf(_SC_PAGESIZE);
        long totalMem = sysconf(_SC_PHYS_PAGES) * pageSize;
        if (totalMem > 0) {
            info.memory = (size * pageSize * 100.0) / totalMem;
        }
    }

    return info;
}

std::vector<ProcessInfo> GetProcessList() {
    std::vector<ProcessInfo> processes;

    DIR* dir = opendir("/proc");
    if (!dir) {
        return processes;
    }

    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        // Check if directory name is a number (PID)
        if (entry->d_type == DT_DIR) {
            std::string name = entry->d_name;
            if (!name.empty() && std::all_of(name.begin(), name.end(), ::isdigit)) {
                ProcessInfo info = ParseProcStat(name);
                if (info.pid > 0) {
                    processes.push_back(info);
                }
            }
        }
    }

    closedir(dir);
    return processes;
}
