# Photo Viewer - one-shot installer for Windows.
# Run from PowerShell in the directory containing docker-compose.yml.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "'docker' is not on PATH. Install Docker Desktop, then re-run."
}
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "'docker compose' is unavailable. Update Docker Desktop."
}

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example."
}

function Set-EnvVar([string]$key, [string]$value) {
    $lines = @()
    $found = $false
    if (Test-Path .env) {
        $lines = Get-Content .env | ForEach-Object {
            if ($_ -match "^$key=") { $found = $true; "$key=$value" } else { $_ }
        }
    }
    if (-not $found) { $lines += "$key=$value" }
    Set-Content -Path .env -Value $lines
}

function Get-EnvVar([string]$key) {
    if (-not (Test-Path .env)) { return "" }
    $line = Get-Content .env | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) { return ($line -split "=", 2)[1] } else { return "" }
}

if (-not (Get-EnvVar "LIBRARY_PATH")) {
    $lib = Read-Host "Absolute path to your photo library"
    Set-EnvVar "LIBRARY_PATH" $lib
}
if (-not (Get-EnvVar "PORT")) {
    $port = Read-Host "Port (LAN-visible) [3000]"
    if (-not $port) { $port = "3000" }
    Set-EnvVar "PORT" $port
}
if (-not (Get-EnvVar "SESSION_SECRET")) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLower()
    Set-EnvVar "SESSION_SECRET" $secret
    Write-Host "Generated SESSION_SECRET."
}

if (-not (Test-Path data)) { New-Item -ItemType Directory -Path data | Out-Null }

Write-Host "Pulling image..."
docker compose pull
Write-Host "Starting..."
docker compose up -d

$port = Get-EnvVar "PORT"
Write-Host "Waiting for server..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:$port/api/health" -UseBasicParsing -TimeoutSec 1 | Out-Null
        break
    } catch { Start-Sleep -Seconds 1 }
}

Write-Host ""
Write-Host "Running first-time admin setup..."
docker compose exec photo-viewer node /app/scripts/create-admin.mjs

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -ne 'WellKnown' -and $_.IPAddress -notlike '169.*' } |
    Select-Object -First 1).IPAddress
if (-not $lanIp) { $lanIp = "localhost" }

Write-Host ""
Write-Host "============================================================"
Write-Host " Photo Viewer is running."
Write-Host "   On this machine: http://localhost:$port/"
Write-Host "   On your LAN:     http://$lanIp`:$port/"
Write-Host "============================================================"
