@echo off
chcp 65001 >nul
setlocal
title Royal Sky Member Portal
cd /d "%~dp0"

echo [1/3] Menghentikan server lama di port 3001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo [2/3] Menjalankan Next.js di port 3001...
start "Royal Sky Dev Server" /min cmd /c "npm.cmd run dev"

echo [3/3] Menunggu server siap...
set /a tries=0
:wait
set /a tries+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001' -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto ready
if %tries% geq 30 goto failed
ping -n 3 127.0.0.1 >nul
goto wait

:ready
if /I "%PORTAL_NO_BROWSER%"=="1" (
  echo Server siap di http://localhost:3001
  exit /b 0
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME%" (
  start "" "%CHROME%" --new-window "http://localhost:3001"
) else (
  echo Chrome tidak ditemukan. Membuka browser default...
  start "" "http://localhost:3001"
)

echo.
echo Portal dibuka di http://localhost:3001
echo Jendela "Royal Sky Dev Server" harus tetap terbuka selama portal dipakai.
ping -n 4 127.0.0.1 >nul
exit /b 0

:failed
echo.
echo Server tidak siap dalam 60 detik.
echo Periksa jendela "Royal Sky Dev Server" untuk melihat pesan error.
pause
exit /b 1
