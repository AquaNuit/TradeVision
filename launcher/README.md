# TradeVision Pro — Launcher Build Guide

## Prerequisites

- **CMake** 3.15+ ([Download](https://cmake.org/download/))
- **Visual Studio 2019/2022** with C++ Desktop Development workload
  - Or **MinGW-w64** toolchain
- **Python 3.10+** installed and in PATH
- Backend pip dependencies installed (`pip install -r backend/requirements.txt`)

## Build Steps

### Using Visual Studio (recommended)

```powershell
# From the project root directory:
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

The `.exe` will be at: `build/bin/Release/TradeVisionPro.exe`

### Using MinGW

```powershell
mkdir build
cd build
cmake .. -G "MinGW Makefiles"
cmake --build .
```

## Running the .exe

1. Copy `TradeVisionPro.exe` to the **project root** (next to `frontend/` and `backend/`)
2. Double-click `TradeVisionPro.exe`
3. It will:
   - Install any missing pip packages
   - Start the FastAPI server
   - Open your browser to `http://localhost:8000`
4. **Close the console window** to stop the server

## What the .exe does

The executable is a **launcher** — it does NOT bundle Python inside itself.
It automates the manual process of:

```
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# then opening http://localhost:8000 in browser
```

Python must be installed on the machine where you run the .exe.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Python not found" | Install Python 3.10+ and add to PATH |
| Server won't start | Run `pip install -r backend/requirements.txt` manually |
| Port 8000 in use | Close other applications using port 8000 |
