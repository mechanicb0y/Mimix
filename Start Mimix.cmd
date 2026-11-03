@echo off
rem Mimix: double-click to start (Windows). The first start sets everything up inside the "local" folder.
rem Nothing is installed on the system and no administrator password is needed.
setlocal
cd /d "%~dp0"
title Mimix
if not exist "scripts\local\mimix-local.mjs" goto missing
if not exist "package.json" goto missing
if not exist "engines\kokoro\server.py" goto missing
set "NODE_VERSION=v22.23.4"
set "NODE_SUM=cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20"
if exist "local\node\node.exe" goto run
echo Downloading Node.js %NODE_VERSION% - first start only...
if not exist local mkdir local
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; $v=$env:NODE_VERSION; $z='local\node.zip'; Invoke-WebRequest -UseBasicParsing ('https://nodejs.org/dist/' + $v + '/node-' + $v + '-win-x64.zip') -OutFile $z; if ((Get-FileHash -Algorithm SHA256 $z).Hash.ToLower() -ne $env:NODE_SUM) { Remove-Item $z; throw 'The download did not match its checksum.' }; Expand-Archive -Force $z local; Move-Item ('local\node-' + $v + '-win-x64') 'local\node'; Remove-Item $z"
if errorlevel 1 goto nodefail
:run
"local\node\node.exe" scripts\local\mimix-local.mjs start
if errorlevel 1 pause
exit /b
:nodefail
echo.
echo Couldn't download Node.js. Check the internet connection and double-click Start Mimix again.
pause
exit /b 1
:missing
echo.
echo Mimix can't start: some of its files are missing from this folder.
echo It needs scripts\local\mimix-local.mjs, package.json and engines\kokoro\server.py next to this file.
echo Copy the whole "app" folder from the latest Mimix zip into this folder, replacing files, then try again.
echo Folder: %CD%
pause
exit /b 1
