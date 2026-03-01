#include "process_info.h"
#include <windows.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <map>
#include <set>

std::set<DWORD> GetPidsWithWindows() {
    std::set<DWORD> pids;
    EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
        if (IsWindowVisible(hwnd)) {
            DWORD pid;
            GetWindowThreadProcessId(hwnd, &pid);
            auto* setPtr = reinterpret_cast<std::set<DWORD>*>(lParam);
            setPtr->insert(pid);
        }
        return TRUE;
    }, reinterpret_cast<LPARAM>(&pids));
    return pids;
}

std::string GetCommandLine(DWORD pid) {
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (!hProcess) return "";

    char buffer[MAX_PATH * 2] = {0};
    
    CloseHandle(hProcess);
    return std::string(buffer);
}

DWORD GetParentPid(DWORD pid) {
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) return 0;

    PROCESSENTRY32 pe32;
    pe32.dwSize = sizeof(PROCESSENTRY32);

    DWORD ppid = 0;
    if (Process32First(hSnapshot, &pe32)) {
        do {
            if (pe32.th32ProcessID == pid) {
                ppid = pe32.th32ParentProcessID;
                break;
            }
        } while (Process32Next(hSnapshot, &pe32));
    }

    CloseHandle(hSnapshot);
    return ppid;
}

ProcessInfo GetWindowsInfo(DWORD pid, const std::set<DWORD>& guiPids) {
    ProcessInfo info;
    info.pid = pid;
    info.ppid = GetParentPid(pid);
    info.isGuiApp = (guiPids.find(pid) != guiPids.end());

    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (hProcess) {
        DWORD sessionId;
        if (ProcessIdToSessionId(pid, &sessionId)) {
            info.isUserApp = (sessionId != 0);
        }

        PROCESS_MEMORY_COUNTERS pmc;
        if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
            info.memory = static_cast<double>(pmc.WorkingSetSize) / (1024 * 1024);
        }

        char szProcessName[MAX_PATH];
        if (GetModuleBaseNameA(hProcess, NULL, szProcessName, sizeof(szProcessName))) {
            info.name = szProcessName;
        }

        char szPath[MAX_PATH];
        if (GetModuleFileNameExA(hProcess, NULL, szPath, sizeof(szPath))) {
            info.path = szPath;
        }

        info.cmd = info.name;

        CloseHandle(hProcess);
    }

    return info;
}

std::vector<ProcessInfo> GetProcessList() {
    std::vector<ProcessInfo> processes;
    DWORD aProcesses[2048], cbNeeded;
    
    std::set<DWORD> guiPids = GetPidsWithWindows();

    if (EnumProcesses(aProcesses, sizeof(aProcesses), &cbNeeded)) {
        DWORD cProcesses = cbNeeded / sizeof(DWORD);
        for (unsigned int i = 0; i < cProcesses; i++) {
            if (aProcesses[i] != 0) {
                ProcessInfo info = GetWindowsInfo(aProcesses[i], guiPids);
                
                if (info.isUserApp || info.isGuiApp) {
                    processes.push_back(info);
                }
            }
        }
    }
    return processes;
}