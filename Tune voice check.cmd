@echo off
rem Mimix: sets the consent check's pass mark from your own recordings (Windows).
rem Drag a folder onto this file, or double-click it and drag the folder into the window.
rem The folder holds one subfolder per person, each with three or more recordings (WAV or MP3).
setlocal
cd /d "%~dp0"
title Mimix: tune voice check
if not exist "local\node\node.exe" goto first
"local\node\node.exe" scripts\local\mimix-local.mjs tune %1
pause
exit /b
:first
echo Double-click "Start Mimix" once first, so the voice check is installed. Then run this again.
pause
exit /b 1
