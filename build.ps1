$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$dist = Join-Path $root 'dist'

if (Test-Path $dist) {
  Remove-Item $dist -Recurse -Force
}

New-Item -ItemType Directory -Path $dist | Out-Null

Copy-Item (Join-Path $root 'index.html') $dist
Copy-Item (Join-Path $root 'css') (Join-Path $dist 'css') -Recurse
Copy-Item (Join-Path $root 'js') (Join-Path $dist 'js') -Recurse
Copy-Item (Join-Path $root 'public') (Join-Path $dist 'public') -Recurse

Write-Host "Build complete:"
Write-Host "  dist folder: $dist"
