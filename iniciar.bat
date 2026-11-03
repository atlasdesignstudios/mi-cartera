@echo off
chcp 65001 >nul
title Mi Cartera
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se ha encontrado Node.js.
  echo   Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

node server.js
echo.
echo   El servidor se ha detenido.
pause
