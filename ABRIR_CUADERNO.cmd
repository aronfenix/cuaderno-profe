@echo off
setlocal
cd /d "%~dp0"
set APP_PORT=3210

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js no esta instalado o no esta en PATH.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Error instalando dependencias.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo Generando build de la app...
  call npm run build
  if errorlevel 1 (
    echo Error construyendo la app.
    pause
    exit /b 1
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do (
  set PORT_PID=%%p
)

if not "%PORT_PID%"=="" (
  echo Puerto %APP_PORT% ya en uso. Se abrira el navegador igualmente.
) else (
  start "CuadernoProfeServer" cmd /k "cd /d ""%~dp0"" && set PORT=%APP_PORT% && node server.js"
  timeout /t 2 >nul
)

start "" "http://localhost:%APP_PORT%/#/"
endlocal
