# Photo Viewer - upgrade to a newer image.
# Bump IMAGE_TAG in .env first (or pass -Tag X.Y.Z), then run.
param([string]$Tag)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($Tag) {
    $lines = Get-Content .env | ForEach-Object {
        if ($_ -match "^IMAGE_TAG=") { "IMAGE_TAG=$Tag" } else { $_ }
    }
    Set-Content -Path .env -Value $lines
    Write-Host "Set IMAGE_TAG=$Tag"
}

docker compose pull
docker compose up -d

$current = (Get-Content .env | Where-Object { $_ -match "^IMAGE_TAG=" } | Select-Object -First 1) -split "=", 2
Write-Host "Photo Viewer is now running version: $($current[1])"
Write-Host "Your data (./data) and photo library mount are unchanged."
