#include "process_info.h"
#include <windows.h>
#include <psapi.h>
#include <vector>

bool HasVisibleWindow(DWORD processID) {
    bool found = false;
    EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
        DWORD lpdwProcessId = 0;
        GetWindowThreadProcessId(hwnd, &lpdwProcessId);
        if (lpdwProcessId == (DWORD)lParam && IsWindowVisible(hwnd)) {
            *(bool*)lParam = true; 
            return FALSE;
        }
        return TRUE;
    }, (LPARAM)processID);
    return found;
}

ProcessInfo GetWindowsInfo(DWORD pid) {
    ProcessInfo info;
    info.pid = pid;

    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (hProcess) {
        DWORD sessionId;
        if (ProcessIdToSessionId(pid, &sessionId)) {
            info.isUserApp = (sessionId != 0);
        }

        // Memory Usage
        PROCESS_MEMORY_COUNTERS pmc;
        if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
            info.memory = (double)pmc.WorkingSetSize / (1024 * 1024);
        }

        CloseHandle(hProcess);
    }

    info.isGuiApp = HasVisibleWindow(pid);
    return info;
}

std::vector<ProcessInfo> GetProcessList() {
    std::vector<ProcessInfo> processes;
    DWORD aProcesses[1024], cbNeeded;

    if (EnumProcesses(aProcesses, sizeof(aProcesses), &cbNeeded)) {
        DWORD cProcesses = cbNeeded / sizeof(DWORD);
        for (unsigned int i = 0; i < cProcesses; i++) {
            if (aProcesses[i] != 0) {
                ProcessInfo info = GetWindowsInfo(aProcesses[i]);
                if (info.isUserApp || info.isGuiApp) {
                    processes.push_back(info);
                }
            }
        }
    }
    return processes;
}
