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
    const double MIN_DISPLAY_MEMORY = 20.0;  

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
    
    
    std::vector<std::string> systemGuiPatterns = {
        "startmenuexperiencehost.exe", "searchapp.exe", 
        "shellexperiencehost.exe", "textinputhost.exe"
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
        "gnome-keyring", "xdg-desktop-portal", "gvfs", "at-spi", "fusermount",
        "gnome-session", "gsd-", "evolution-source-registry", "evolution-calendar-factory",
        "evolution-addressbook-factory", "evolution-data-server", "evolution-alarm-notify",
        "tracker-miner", "ibus-", "dconf-service", "upowerd", "systemd-", 
        "NetworkManager", "polkitd", "rtkit-daemon", "udisksd", "accounts-daemon",
        "goa-daemon", "gcr-ssh-agent", "xwayland", "mutter-x11-frames",
        "gnome-shell-calendar-server", "ibus-extension-gtk", "ibus-x11",
        "/usr/bin/gjs" 
    };
#endif

    struct AppPattern {
        std::string pattern;
        std::string category;
        bool isElectron;
    };

    std::vector<AppPattern> guiAppPatterns = {
        
        {"chrome", "browser", false}, 
        {"chromium", "browser", false}, 
        {"firefox", "browser", false},
        {"brave", "browser", false}, 
        {"edge", "browser", false}, 
        {"msedge", "browser", false},
        {"opera", "browser", false},
        {"safari", "browser", false},
        
        
        {"code", "editor", true},  
        {"vscode", "editor", true},
        {"sublime", "editor", false},
        {"sublime_text", "editor", false},
        {"notepad", "editor", false},
        {"gedit", "editor", false},
        {"vim", "editor", false},
        {"atom", "editor", true},  
        
        
        {"nautilus", "file_manager", false},
        {"dolphin", "file_manager", false},
        {"explorer.exe", "file_manager", false},
        
        
        {"slack", "communication", true},  
        {"discord", "communication", true}, 
        {"teams", "communication", true},  
        {"zoom", "communication", false},
        {"skype", "communication", true},
        {"telegram", "communication", false},
        {"signal", "communication", true},
        
        
        {"spotify", "media", true},  
        {"vlc", "media", false},
        
        
        {"gnome-terminal", "terminal", false},
        {"konsole", "terminal", false},
        {"alacritty", "terminal", false},
        {"kitty", "terminal", false},
        
        
        {"node", "development", false},
        {"python", "development", false},
        {"java", "development", false},
        
        
        {"electron", "app_framework", true},
        {"nwjs", "app_framework", false},
        
        
        {"onedrive", "cloud_storage", false},
        {"dropbox", "cloud_storage", false},
        {"google drive", "cloud_storage", false},
        
        
        {"dominik", "app", true},  
        {"vigilant", "app", true}  
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

    AppPattern findAppPattern(const std::string& str) {
        std::string lowerStr = str;
        std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(), ::tolower);
        for (const auto& app : guiAppPatterns) {
            if (lowerStr.find(app.pattern) != std::string::npos) {
                return app;
            }
        }
        return {"", "unknown", false};
    }
    
    bool isElectronApp(const std::string& name, const std::string& cmd, const std::string& path) {
        std::string lowerName = name;
        std::string lowerCmd = cmd;
        std::string lowerPath = path;
        
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        std::transform(lowerCmd.begin(), lowerCmd.end(), lowerCmd.begin(), ::tolower);
        std::transform(lowerPath.begin(), lowerPath.end(), lowerPath.begin(), ::tolower);
        
        
        if (lowerName.find("electron") != std::string::npos ||
            lowerCmd.find("electron") != std::string::npos ||
            lowerPath.find("electron") != std::string::npos) {
            return true;
        }
        
        
        AppPattern pattern = findAppPattern(lowerName.empty() ? lowerCmd : lowerName);
        if (pattern.isElectron) {
            return true;
        }
        
        
        if (lowerCmd.find("--type=") != std::string::npos && 
            (lowerCmd.find("--type=renderer") != std::string::npos ||
             lowerCmd.find("--type=gpu-process") != std::string::npos ||
             lowerCmd.find("--type=utility") != std::string::npos ||
             lowerCmd.find("--type=zygote") != std::string::npos)) {
            return true;
        }
        
        
        if ((lowerCmd.find("chrome") != std::string::npos || 
             lowerCmd.find("code") != std::string::npos) &&
            (lowerCmd.find("--type=") != std::string::npos)) {
            return true;
        }
        
        return false;
    }
    
    bool isSystemGuiComponent(const std::string& name, const std::string& cmd) {
#ifdef _WIN32
        return containsPattern(name, systemGuiPatterns) || 
               containsPattern(cmd, systemGuiPatterns);
#else
        
        std::string lowerCmd = cmd;
        std::transform(lowerCmd.begin(), lowerCmd.end(), lowerCmd.begin(), ::tolower);
        
        if (lowerCmd.find("gnome-shell") != std::string::npos ||
            lowerCmd.find("org.gnome.shell") != std::string::npos ||
            lowerCmd.find("org.gnome.screensaver") != std::string::npos ||
            lowerCmd.find("/usr/bin/gjs") != std::string::npos ||
            lowerCmd.find("gnome.notifications") != std::string::npos) {
            return true;
        }
        return false;
#endif
    }

public:
    ProcessClassification classify(
        const std::string& name, const std::string& cmd, const std::string& path,
        int pid, int uid, double memory, bool isGuiApp, bool isUserApp
    ) {
        ProcessClassification result;
        result.confidence = 0.5;
        result.shouldDisplay = false;

#ifdef _WIN32
        
        if (pid <= 4) {
            result.type = "system_process";
            result.category = "kernel";
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

        
        if (isSystemGuiComponent(name, cmd)) {
            result.type = "system_process";
            result.category = "system_ui";
            result.shouldDisplay = false;
            return result;
        }

        
        if (isSystemPath(path) || 
            containsPattern(name, systemProcessPatterns) || 
            containsPattern(cmd, systemProcessPatterns)) {
            result.type = "system_process";
            result.category = "system";
            result.shouldDisplay = false;
            return result;
        }

        
        bool isElectron = isElectronApp(name, cmd, path);
        
        
        AppPattern pattern = findAppPattern(name.empty() ? cmd : name);
        
        
        if (isGuiApp || isElectron) {
            result.type = "gui_app";
            result.category = pattern.category;
            result.confidence = (pattern.category != "unknown") ? 0.85 : 0.7;
            
            
            result.shouldDisplay = isElectron || (pattern.category != "unknown") || 
                                   (memory >= MIN_DISPLAY_MEMORY);
            
            if (isElectron && result.category == "unknown") {
                result.category = "electron_app";
            }
            
            return result;
        }
        
        
        if (isUserApp) {
            result.type = "user_app";
            result.category = pattern.category;
            
            if (result.category == "unknown") {
                result.category = "cli_tool";
            }
            
            result.confidence = (pattern.category != "unknown") ? 0.75 : 0.6;
            
            
            result.shouldDisplay = (pattern.category != "unknown" && pattern.category != "cli_tool") || 
                                   (memory >= MIN_DISPLAY_MEMORY);
            
            return result;
        }

        
        result.type = "system_process";
        result.category = "other";
        result.shouldDisplay = false;
        
        return result;
    }
};

#endif