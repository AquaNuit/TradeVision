cmake_minimum_required(VERSION 3.15)
project(TradeVisionLauncher VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Windows application (no console flash, uses WinMain) ──
add_executable(TradeVisionPro WIN32 launcher/main.cpp)

# Link Windows shell library for ShellExecute + Winsock for port check
target_link_libraries(TradeVisionPro PRIVATE shell32 ws2_32)

# Set output name
set_target_properties(TradeVisionPro PROPERTIES
    OUTPUT_NAME "TradeVisionPro"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

# ── Optional: Add application icon on Windows ──
if(WIN32 AND EXISTS "${CMAKE_SOURCE_DIR}/launcher/app.rc")
    target_sources(TradeVisionPro PRIVATE launcher/app.rc)
endif()

# ── Install target ──
install(TARGETS TradeVisionPro DESTINATION bin)
install(DIRECTORY frontend/ DESTINATION frontend)
install(DIRECTORY backend/ DESTINATION backend
    PATTERN "__pycache__" EXCLUDE
    PATTERN "*.pyc" EXCLUDE
)
install(FILES start.ps1 DESTINATION .)
install(FILES backend/requirements.txt DESTINATION backend)
