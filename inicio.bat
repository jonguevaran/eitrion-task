@echo off
:: Navega al directorio donde está este archivo .bat
cd /d "%~dp0"

:: Ejecuta el script de inicio
npm run start

:: Mantiene la ventana abierta si hay un error o al terminar (opcional)
pause