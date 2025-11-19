@echo off
echo Abriendo puertos para Eitrion Task...
echo.

:: Abrir puerto 3001 (Backend)
netsh advfirewall firewall add rule name="Eitrion Backend" dir=in action=allow protocol=TCP localport=3001 profile=private,public
if %errorlevel% equ 0 (
    echo [OK] Puerto 3001 abierto con exito.
) else (
    echo [ERROR] No se pudo abrir el puerto 3001. Necesitas ejecutar como Administrador.
)

:: Abrir puerto 5173 (Frontend)
netsh advfirewall firewall add rule name="Eitrion Frontend" dir=in action=allow protocol=TCP localport=5173 profile=private,public
if %errorlevel% equ 0 (
    echo [OK] Puerto 5173 abierto con exito.
) else (
    echo [ERROR] No se pudo abrir el puerto 5173. Necesitas ejecutar como Administrador.
)

echo.
echo ---------------------------------------------------
echo IMPORTANTE: Si viste errores arriba, cierra esto,
echo haz Clic Derecho en el archivo y elige:
echo "Ejecutar como administrador".
echo ---------------------------------------------------
pause