$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WebRoot = Join-Path $ProjectRoot 'web'
$AndroidAssets = Join-Path $ProjectRoot 'android\app\src\main\assets'
New-Item -ItemType Directory -Force -Path $AndroidAssets | Out-Null
Copy-Item -Path (Join-Path $WebRoot '*') -Destination $AndroidAssets -Recurse -Force
Write-Output "Shared web app copied to $AndroidAssets"
