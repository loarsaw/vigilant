#ifndef PROCESS_CLASSIFIER_H
#define PROCESS_CLASSIFIER_H

#include <string>
#include <vector>
#include <algorithm>

struct ProcessClassification {
    std::string type;
    double confidence;
    std::string category;
    bool shouldDisplay;
};

class ProcessClassifier {
private:
    const double MIN_GUI_APP_MEMORY = 20.0;

#ifdef _WIN32
    std::vector<std::string> systemPaths = {
        "c:\\windows\\system32\\",
        "c:\\windows\\syswow64\\",
        "c:\\windows\\winsxs\\",
        "c:\\windows\\systemroot\\"
    };

    std::vector<std::string> systemProcessPatterns = {
        "svchost.exe", "lsass.exe", "services.exe", "wininit.exe",
        "smss.exe", "csrss.exe", "winlogon.exe", "spoolsv.exe",
        "searchindexer.exe", "runtimebroker.exe", "taskhostw.exe",
        "dwm.exe", "fontdrvhost.exe", "sihost.exe", "smartscreen.exe",
        "conhost.exe", "dllhost.exe", "audiodg.exe"
    };
#else
    std::vector<std::string> systemPaths = {
        "/usr/libexec/", "/usr/lib/systemd/", "/lib/systemd/",
        "/usr/lib/gnome-", "/usr/lib/gvfs/", "/usr/lib/at-spi",
        "/usr/lib/evolution/", "/snap/snapd/", "/snap/core",
        "/usr/lib/tracker/", "/usr/lib/dconf/", "/usr/lib/gdm3/",
        "/usr/lib/packagekit/"
    };

    std::vector<std::string> systemProcessPatterns = {
        "systemd", "kthreadd", "ksoftirqd", "kworker", "rcu_", "migration",
        "dbus", "gdm", "pipewire", "wireplumber", "pulseaudio",
        "gnome-keyring", "xdg-", "gvfs", "at-spi", "fusermount",
        "gnome-session", "gsd-", "evolution-", "tracker-", "ibus-",
        "dconf-service", "upowerd", "systemd-", "NetworkManager",
        "polkitd", "rtkit-daemon", "udisksd", "accounts-daemon",
        "gnome-shell-", "org.gnome.", "gjs", "gcr-ssh-agent"
    };
#endif

    struct AppPattern {
        std::string pattern;
        std::string category;
    };

    std::vector<AppPattern> guiAppPatterns = {
        {"chrome", "browser"}, {"chromium", "browser"}, {"firefox", "browser"},
        {"brave", "browser"}, {"edge", "browser"}, {"opera", "browser"},
        {"code", "editor"}, {"vscode", "editor"}, {"sublime", "editor"},
        {"notepad", "editor"}, {"gedit", "editor"}, {"vim", "editor"},
        {"nautilus", "file_manager"}, {"dolphin", "file_manager"},
        {"explorer", "file_manager"}, {"slack", "communication"},
        {"discord", "communication"}, {"spotify", "media"}, {"vlc", "media"},
        {"electron", "app_framework"}, {"node", "development"}
    };

    bool containsPattern(const std::string& str, const std::vector<std::string>& patterns) {
        std::string lowerStr = str;
        std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(), ::tolower);
        for (const auto& pattern : patterns) {
            if (lowerStr.find(pattern) != std::string::npos) return true;
        }
        return false;
    }

    bool isSystemPath(const std::string& path) {
        std::string lowerPath = path;
        std::transform(lowerPath.begin(), lowerPath.end(), lowerPath.begin(), ::tolower);
        for (const auto& sysPath : systemPaths) {
            if (lowerPath.find(sysPath) == 0) return true;
        }
        return false;
    }

    std::string findCategory(const std::string& str) {
        std::string lowerStr = str;
        std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(), ::tolower);
        for (const auto& app : guiAppPatterns) {
            if (lowerStr.find(app.pattern) != std::string::npos) return app.category;
        }
        return "unknown";
    }

public:
    ProcessClassification classify(
        const std::string& name, const std::string& cmd, const std::string& path,
        int pid, int uid, double memory, bool isGuiApp, bool isUserApp
    ) {
        ProcessClassification result;
        result.confidence = 0.5;
        result.shouldDisplay = true;

        // Basic system noise filtering
        if (memory < MIN_GUI_APP_MEMORY || isSystemPath(path) ||
            containsPattern(name, systemProcessPatterns) || containsPattern(cmd, systemProcessPatterns)) {
            result.shouldDisplay = false;
        }

#ifdef _WIN32
        if (pid <= 4) {
            result.type = "system_process";
            result.shouldDisplay = false;
            return result;
        }
#else
        if (pid < 100 && cmd.empty()) {
            result.type = "system_process";
            result.category = "kernel_thread";
            result.shouldDisplay = false;
            return result;
        }
#endif

        if (isGuiApp && memory >= MIN_GUI_APP_MEMORY) {
            result.type = "gui_app";
            result.category = findCategory(name.empty() ? cmd : name);
            result.confidence = (result.category != "unknown") ? 0.85 : 0.7;
            result.shouldDisplay = true;
        } else if (isUserApp) {
            result.type = "user_app";
            result.category = findCategory(name);
            if (result.category == "unknown") result.category = "cli_tool";
            result.confidence = 0.6;
            result.shouldDisplay = (memory >= MIN_GUI_APP_MEMORY);
        } else {
            result.type = "system_process";
            result.category = "other";
            result.shouldDisplay = false;
        }

        return result;
    }
};

#endif
