@echo off
chcp 65001 >nul
title Mi Cartera - permitir el acceso desde el móvil
cd /d "%~dp0"

rem Pide permisos de administrador si no los tiene.
net session >nul 2>&1
if errorlevel 1 (
  echo   Pidiendo permiso de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "PUERTOS=4321-4331"
echo.
echo   Abriendo los puertos %PUERTOS% de Mi Cartera solo en redes PRIVADAS (tu Wi-Fi de casa)...
netsh advfirewall firewall delete rule name="Mi Cartera" >nul 2>&1
netsh advfirewall firewall add rule name="Mi Cartera" dir=in action=allow protocol=TCP localport=%PUERTOS% profile=private
if errorlevel 1 (
  echo.
  echo   No se pudo crear la regla del cortafuegos.
) else (
  echo.
  echo   Listo. Si el movil sigue sin entrar, marca tu Wi-Fi como red privada:
  echo   Configuracion ^> Red e Internet ^> Wi-Fi ^> tu red ^> Perfil de red: Privada.
  echo.
  echo   Para quitar el permiso en el futuro:
  echo   netsh advfirewall firewall delete rule name="Mi Cartera"
)
echo.
pause
