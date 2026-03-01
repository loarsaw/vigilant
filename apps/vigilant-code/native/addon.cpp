#include "process_info.h"
#include "process_classifier.h"
#include <napi.h>

Napi::Value GetProcesses(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        std::vector<ProcessInfo> processes = GetProcessList();
        Napi::Array result = Napi::Array::New(env);

        ProcessClassifier classifier;
        uint32_t index = 0;

        for (const auto& p : processes) {
            uint32_t currentUid = 0;
            std::string currentUsername = "unknown";

            #ifndef _WIN32
            currentUid = p.uid;
            currentUsername = p.username;
            #endif

            ProcessClassification classification = classifier.classify(
                p.name, p.cmd, p.path, p.pid, currentUid, p.memory, p.isGuiApp, p.isUserApp
            );

            if (!classification.shouldDisplay) {
                continue;
            }

            Napi::Object obj = Napi::Object::New(env);

            obj.Set("pid", Napi::Number::New(env, p.pid));
            obj.Set("ppid", Napi::Number::New(env, p.ppid));
            obj.Set("name", Napi::String::New(env, p.name));
            obj.Set("path", Napi::String::New(env, p.path));
            obj.Set("cmd", Napi::String::New(env, p.cmd));
            obj.Set("memory", Napi::Number::New(env, p.memory));
            obj.Set("isUserApp", Napi::Boolean::New(env, p.isUserApp));
            obj.Set("isGuiApp", Napi::Boolean::New(env, p.isGuiApp));
            obj.Set("username", Napi::String::New(env, currentUsername));

            #ifndef _WIN32
            obj.Set("uid", Napi::Number::New(env, p.uid));
            obj.Set("cpu", Napi::Number::New(env, p.cpu));
            obj.Set("cwd", Napi::String::New(env, p.cwd));

            if (p.startTime > 0) {
                obj.Set("startTime", Napi::Date::New(env, p.startTime));
            }
            if (!p.desktopEntry.empty()) {
                obj.Set("desktopEntry", Napi::String::New(env, p.desktopEntry));
            }
            #endif

            obj.Set("processType", Napi::String::New(env, classification.type));
            obj.Set("category", Napi::String::New(env, classification.category));
            obj.Set("confidence", Napi::Number::New(env, classification.confidence));

            result[index++] = obj;
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value GetGuiApps(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        std::vector<ProcessInfo> processes = GetProcessList();
        Napi::Array result = Napi::Array::New(env);
        ProcessClassifier classifier;
        uint32_t index = 0;

        for (const auto& p : processes) {
            uint32_t currentUid = 0;
            std::string currentUsername = "unknown";
            #ifndef _WIN32
            currentUid = p.uid;
            currentUsername = p.username;
            #endif

            ProcessClassification classification = classifier.classify(
                p.name, p.cmd, p.path, p.pid, currentUid, p.memory, p.isGuiApp, p.isUserApp
            );

            if (classification.type == "gui_app" && classification.shouldDisplay) {
                Napi::Object obj = Napi::Object::New(env);
                obj.Set("pid", Napi::Number::New(env, p.pid));
                obj.Set("name", Napi::String::New(env, p.name));
                obj.Set("cmd", Napi::String::New(env, p.cmd));
                obj.Set("memory", Napi::Number::New(env, p.memory));
                obj.Set("category", Napi::String::New(env, classification.category));
                obj.Set("confidence", Napi::Number::New(env, classification.confidence));
                obj.Set("username", Napi::String::New(env, currentUsername));

                result[index++] = obj;
            }
        }
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value GetProcessStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        std::vector<ProcessInfo> processes = GetProcessList();
        ProcessClassifier classifier;

        int totalDisplayable = 0, guiApps = 0, userApps = 0;
        double totalMemory = 0, guiMemory = 0;

        for (const auto& p : processes) {
            uint32_t currentUid = 0;
            #ifndef _WIN32
            currentUid = p.uid;
            #endif

            ProcessClassification classification = classifier.classify(
                p.name, p.cmd, p.path, p.pid, currentUid, p.memory, p.isGuiApp, p.isUserApp
            );

            if (classification.shouldDisplay) {
                totalDisplayable++;
                totalMemory += p.memory;

                if (classification.type == "gui_app") {
                    guiApps++;
                    guiMemory += p.memory;
                } else if (classification.type == "user_app") {
                    userApps++;
                }
            }
        }

        Napi::Object stats = Napi::Object::New(env);
        stats.Set("totalRaw", Napi::Number::New(env, processes.size()));
        stats.Set("totalFiltered", Napi::Number::New(env, totalDisplayable));
        stats.Set("guiApps", Napi::Number::New(env, guiApps));
        stats.Set("userApps", Napi::Number::New(env, userApps));
        stats.Set("totalMemory", Napi::Number::New(env, totalMemory));
        stats.Set("guiMemory", Napi::Number::New(env, guiMemory));
        stats.Set("avgGuiMemory", Napi::Number::New(env, guiApps > 0 ? guiMemory / guiApps : 0));

        return stats;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("getProcesses", Napi::Function::New(env, GetProcesses));
    exports.Set("getGuiApps", Napi::Function::New(env, GetGuiApps));
    exports.Set("getProcessStats", Napi::Function::New(env, GetProcessStats));
    return exports;
}

NODE_API_MODULE(process_monitor, Init)
