@echo off
:: Navega al directorio donde está este archivo .bat
cd /d "C:\eitrion-task-main"

:: Ejecuta el script de inicio
npm run start

:: Mantiene la ventana abierta si hay un error o al terminar (opcional)
pause