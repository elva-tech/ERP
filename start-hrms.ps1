
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backend = Join-Path $root "apps\backend\hr-module"
$frontend = Join-Path $root "apps\frontend\hr-module"

if (!(Test-Path "$backend\package.json")) {
    throw "Backend package.json not found."
}
if (!(Test-Path "$frontend\node_modules\.bin\vite.cmd")) {
    throw "Frontend Vite is missing. Run npm install in the frontend folder."
}

function Test-Port {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port `
        -ErrorAction SilentlyContinue | Select-Object -First 1)
}

if (!(Test-Port 5432)) {
    Write-Warning "PostgreSQL is not listening on port 5432. Check your database service."
}

if (Test-Port 3000) {
    Write-Host "Backend port 3000 is already in use; reusing it."
} else {
    Write-Host "Starting backend..."
    Start-Process powershell.exe -WorkingDirectory $backend `
        -ArgumentList @("-NoExit", "-Command", "npm run dev")
}

if (Test-Port 5173) {
    Write-Host "Frontend port 5173 is already in use; reusing it."
} else {
    Write-Host "Starting frontend..."
    $viteCommand = "& '.\node_modules\.bin\vite.cmd' --host=127.0.0.1 --port=5173 --strictPort"
    Start-Process powershell.exe -WorkingDirectory $frontend `
        -ArgumentList @("-NoExit", "-Command", $viteCommand)
}

Write-Host "Waiting for the development servers..."
$backendReady = $false
$frontendReady = $false

for ($i = 0; $i -lt 60; $i++) {
    $backendReady = Test-Port 3000
    $frontendReady = Test-Port 5173
    if ($backendReady -and $frontendReady) { break }
    Start-Sleep -Seconds 1
}

if (!$backendReady) {
    Write-Warning "Backend did not start. Check its terminal."
}
if (!$frontendReady) {
    Write-Warning "Frontend did not start. Check its terminal."
}

if ($backendReady -and $frontendReady) {
    Write-Host "HRMS servers are listening." -ForegroundColor Green
    Start-Process "http://localhost:5173/"
}
