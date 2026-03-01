#include "process_info.h"
#include <dirent.h>
#include <unistd.h>
#include <pwd.h>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <sys/stat.h>

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

std::string GetUsername(uid_t uid) {
    struct passwd* pw = getpwuid(uid);
    return pw ? pw->pw_name : "";
}

ProcessInfo ParseProcStat(const std::string& pid) {
    ProcessInfo info;
    info.pid = std::stoul(pid);

    std::ifstream statFile("/proc/" + pid + "/stat");
    if (statFile.is_open()) {
        std::string line;
        std::getline(statFile, line);
        
        size_t start = line.find('(');
        size_t end = line.find_last_of(')');
        if (start != std::string::npos && end != std::string::npos) {
            info.name = line.substr(start + 1, end - start - 1);
        }
        
        std::istringstream iss(line.substr(end + 2));
        char state;
        unsigned long utime, stime, starttime;
        iss >> state >> info.ppid;
        
        for (int i = 0; i < 11; i++) iss.ignore(256, ' ');
        iss >> utime >> stime;
        for (int i = 0; i < 6; i++) iss.ignore(256, ' ');
        iss >> starttime;
        
        info.startTime = starttime;
        info.cpu = (double)(utime + stime) / sysconf(_SC_CLK_TCK);
    }

    std::ifstream statusFile("/proc/" + pid + "/status");
    std::string line;
    while (std::getline(statusFile, line)) {
        if (line.find("Uid:") == 0) {
            std::sscanf(line.c_str(), "Uid: %u", &info.uid);
            info.isUserApp = (info.uid >= 1000);
            info.username = GetUsername(info.uid);
            break;
        }
    }

    std::ifstream statmFile("/proc/" + pid + "/statm");
    unsigned long rss;
    if (statmFile >> rss >> rss) {
        info.memory = (double)(rss * sysconf(_SC_PAGESIZE)) / (1024 * 1024);
    }

    std::ifstream cmdFile("/proc/" + pid + "/cmdline");
    char c;
    while (cmdFile.get(c)) {
        info.cmd += (c == '\0' ? ' ' : c);
    }
    if (!info.cmd.empty() && info.cmd.back() == ' ') {
        info.cmd.pop_back();
    }

    char pathBuf[PATH_MAX];
    std::string exePath = "/proc/" + pid + "/exe";
    ssize_t len = readlink(exePath.c_str(), pathBuf, sizeof(pathBuf) - 1);
    if (len != -1) {
        pathBuf[len] = '\0';
        info.path = pathBuf;
    }

    std::string cwdPath = "/proc/" + pid + "/cwd";
    len = readlink(cwdPath.c_str(), pathBuf, sizeof(pathBuf) - 1);
    if (len != -1) {
        pathBuf[len] = '\0';
        info.cwd = pathBuf;
    }

    if (!info.path.empty()) {
        std::string basename = info.path.substr(info.path.find_last_of('/') + 1);
        std::string desktopFile = "/usr/share/applications/" + basename + ".desktop";
        std::ifstream desktop(desktopFile);
        if (desktop.good()) {
            info.desktopEntry = desktopFile;
        }
    }

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