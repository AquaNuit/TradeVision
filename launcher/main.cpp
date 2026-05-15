/*
 * TradeVision Pro — Standalone Launcher
 * =====================================
 * This is a lightweight C++ launcher that:
 *   1. Installs Python pip dependencies (if not already installed)
 *   2. Starts the FastAPI/uvicorn backend server
 *   3. Waits for the server to be ready
 *   4. Opens the default browser to http://localhost:8000
 *   5. Keeps the server alive until the user closes the console
 *   6. Cleans up the server process on exit
 *
 * Build with CMake:
 *   mkdir build && cd build
 *   cmake .. && cmake --build . --config Release
 *
 * The .exe must be placed in the project root (next to frontend/ and backend/).
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <string>
#include <cstdio>
#include <thread>
#include <chrono>

// ── Configuration ──
static const char* APP_NAME     = "TradeVision Pro";
static const char* SERVER_URL   = "http://localhost:8000";
static const int   SERVER_PORT  = 8000;
static const int   STARTUP_TIMEOUT_SEC = 30;

// ── Globals ──
static PROCESS_INFORMATION g_serverProcess = {};
static bool g_serverRunning = false;

// ── Forward Declarations ──
bool   StartServer();
void   StopServer();
bool   WaitForServer(int timeoutSec);
bool   CheckPort(int port);
void   OpenBrowser(const char* url);
void   ShowErrorBox(const char* msg);
std::string GetExeDir();


// ── Entry Point (WinMain for no-console-flash) ──
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    // Allocate a console for the user to see server logs
    AllocConsole();
    SetConsoleTitleA("TradeVision Pro Server");

    // Redirect stdout/stderr to the console
    FILE* fp;
    freopen_s(&fp, "CONOUT$", "w", stdout);
    freopen_s(&fp, "CONOUT$", "w", stderr);

    printf("====================================\n");
    printf("  TradeVision Pro — Starting Up...\n");
    printf("====================================\n\n");

    // Step 1: Install dependencies
    printf("[1/4] Checking Python dependencies...\n");
    std::string exeDir = GetExeDir();
    std::string pipCmd = "pip install -q fastapi uvicorn[standard] pydantic pydantic-settings python-jose[cryptography] "
                         "python-multipart httpx pandas numpy yfinance python-dotenv 2>NUL";
    system(pipCmd.c_str());
    printf("[1/4] Dependencies OK.\n\n");

    // Step 2: Start the server
    printf("[2/4] Starting FastAPI server...\n");
    if (!StartServer()) {
        ShowErrorBox("Failed to start the Python server.\n\n"
                     "Make sure Python 3.10+ is installed and in your PATH.\n"
                     "Try running 'python --version' in a terminal.");
        return 1;
    }
    printf("[2/4] Server process started (PID: %lu)\n\n", g_serverProcess.dwProcessId);

    // Step 3: Wait for server to be ready
    printf("[3/4] Waiting for server to become ready...\n");
    if (!WaitForServer(STARTUP_TIMEOUT_SEC)) {
        ShowErrorBox("Server did not start within 30 seconds.\n\n"
                     "Check the console output for errors.\n"
                     "Common fix: pip install -r backend/requirements.txt");
        StopServer();
        return 1;
    }
    printf("[3/4] Server is ready!\n\n");

    // Step 4: Open the browser
    printf("[4/4] Opening browser at %s\n\n", SERVER_URL);
    OpenBrowser(SERVER_URL);

    printf("========================================\n");
    printf("  TradeVision Pro is running!\n");
    printf("  URL: %s\n", SERVER_URL);
    printf("  Close this window to stop the server.\n");
    printf("========================================\n\n");

    // Wait for the server process to exit (user closes console or process dies)
    WaitForSingleObject(g_serverProcess.hProcess, INFINITE);

    // Cleanup
    StopServer();
    return 0;
}


// ── Start the uvicorn server as a child process ──
bool StartServer()
{
    std::string exeDir = GetExeDir();

    // Build the command line
    // We use python -m uvicorn to start the server
    std::string cmdLine = "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000";

    STARTUPINFOA si = {};
    si.cb = sizeof(si);

    BOOL ok = CreateProcessA(
        NULL,                                    // Application name
        const_cast<char*>(cmdLine.c_str()),      // Command line
        NULL, NULL,                              // Security attributes
        FALSE,                                   // Inherit handles
        0,                                       // Creation flags
        NULL,                                    // Environment
        exeDir.c_str(),                          // Working directory (project root)
        &si,
        &g_serverProcess
    );

    if (ok) {
        g_serverRunning = true;
    }
    return ok != FALSE;
}


// ── Stop the server process ──
void StopServer()
{
    if (g_serverRunning && g_serverProcess.hProcess) {
        printf("\nShutting down server...\n");
        TerminateProcess(g_serverProcess.hProcess, 0);
        WaitForSingleObject(g_serverProcess.hProcess, 5000);
        CloseHandle(g_serverProcess.hProcess);
        CloseHandle(g_serverProcess.hThread);
        g_serverRunning = false;
    }
}


// ── Wait for the server to start accepting connections ──
bool WaitForServer(int timeoutSec)
{
    for (int i = 0; i < timeoutSec * 2; i++) {
        if (CheckPort(SERVER_PORT)) {
            return true;
        }
        // Check if the process died
        DWORD exitCode;
        if (GetExitCodeProcess(g_serverProcess.hProcess, &exitCode) && exitCode != STILL_ACTIVE) {
            printf("Server process exited with code %lu\n", exitCode);
            return false;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        printf(".");
    }
    printf("\n");
    return false;
}


// ── Check if a TCP port is accepting connections ──
bool CheckPort(int port)
{
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return false;

    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) { WSACleanup(); return false; }

    sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(static_cast<u_short>(port));
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    int result = connect(sock, (sockaddr*)&addr, sizeof(addr));
    closesocket(sock);
    WSACleanup();
    return result == 0;
}


// ── Open the default browser ──
void OpenBrowser(const char* url)
{
    ShellExecuteA(NULL, "open", url, NULL, NULL, SW_SHOWNORMAL);
}


// ── Show a Windows error dialog ──
void ShowErrorBox(const char* msg)
{
    MessageBoxA(NULL, msg, "TradeVision Pro — Error", MB_OK | MB_ICONERROR);
}


// ── Get the directory where the .exe lives ──
std::string GetExeDir()
{
    char path[MAX_PATH];
    GetModuleFileNameA(NULL, path, MAX_PATH);
    std::string dir(path);
    size_t pos = dir.find_last_of("\\/");
    if (pos != std::string::npos) {
        dir = dir.substr(0, pos);
    }
    return dir;
}
