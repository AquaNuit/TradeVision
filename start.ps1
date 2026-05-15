# TradeVision Pro — Quick Start Script
# Runs the Python backend server which also serves the frontend

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "  TradeVision Pro — Starting Up..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if pip dependencies are installed
Write-Host "`n[1/3] Checking dependencies..." -ForegroundColor Yellow
$installed = pip list 2>$null | Select-String "fastapi"
if (-not $installed) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install fastapi uvicorn[standard] pydantic pydantic-settings httpx 2>$null
} else {
    Write-Host "Dependencies OK" -ForegroundColor Green
}

# Start the server
Write-Host "`n[2/3] Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "[3/3] Open http://localhost:8000 in your browser`n" -ForegroundColor Green

Set-Location $PSScriptRoot
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
