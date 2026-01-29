#include "process_info.h"
#include <napi.h>

Napi::Value GetProcesses(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        std::vector<ProcessInfo> processes = GetProcessList();
        Napi::Array result = Napi::Array::New(env, processes.size());

        for (size_t i = 0; i < processes.size(); i++) {
            Napi::Object obj = Napi::Object::New(env);
            const ProcessInfo& p = processes[i];

            obj.Set("pid", Napi::Number::New(env, p.pid));
            obj.Set("ppid", Napi::Number::New(env, p.ppid));
            obj.Set("name", Napi::String::New(env, p.name));
            obj.Set("path", Napi::String::New(env, p.path));
            obj.Set("cmd", Napi::String::New(env, p.cmd));

            #ifndef _WIN32
            obj.Set("uid", Napi::Number::New(env, p.uid));
            obj.Set("cpu", Napi::Number::New(env, p.cpu));
            obj.Set("memory", Napi::Number::New(env, p.memory));
            obj.Set("username", Napi::String::New(env, p.username));
            obj.Set("isUserApp", Napi::Boolean::New(env, p.isUserApp));
            obj.Set("isGuiApp", Napi::Boolean::New(env, p.isGuiApp));
            obj.Set("cwd", Napi::String::New(env, p.cwd));

            if (p.startTime > 0) {
                obj.Set("startTime", Napi::Date::New(env, p.startTime));
            }
            if (!p.desktopEntry.empty()) {
                obj.Set("desktopEntry", Napi::String::New(env, p.desktopEntry));
            }
            #endif

            result[i] = obj;
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("getProcesses", Napi::Function::New(env, GetProcesses));
    return exports;
}

NODE_API_MODULE(process_monitor, Init)
