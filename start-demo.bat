@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua tim thay Node.js. Hay cai Node.js 22 va chay lai.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Chua tim thay npm. Hay kiem tra Node.js.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Dang cai thu vien npm (can Internet lan dau)...
  call npm install
  if errorlevel 1 (
    echo Khong cai duoc dependency. Kiem tra Internet hoac npm registry.
    pause
    exit /b 1
  )
)
echo Khoi dong SmartAqua tai http://localhost:5173
call npm run dev
pause
