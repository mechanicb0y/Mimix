@echo off
rem Mimix: double-click to stop everything "Start Mimix" started (Windows).
cd /d "%~dp0"
if not exist "scripts\local\mimix-local.mjs" echo Mimix's files are missing from this folder. Copy the whole "app" folder from the latest Mimix zip here, then try again.
if not exist "scripts\local\mimix-local.mjs" goto end
if exist "local\node\node.exe" "local\node\node.exe" scripts\local\mimix-local.mjs stop
if not exist "local\node\node.exe" echo Mimix is not set up on this computer yet.
:end
timeout /t 5 >nul
