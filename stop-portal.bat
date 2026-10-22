@echo off
chcp 65001 >nul
setlocal
title Stop Royal Sky Member Portal

echo Menghentikan server Royal Sky di port 3001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$processIds = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $processIds) { Write-Host 'Tidak ada server yang berjalan di port 3001.'; exit 0 }; foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }; Write-Host 'Server port 3001 dihentikan.'"

ping -n 4 127.0.0.1 >nul
exit /b 0
