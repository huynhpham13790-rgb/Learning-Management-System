@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==================================================
echo   EduTrack AI - CAI DAT LAN DAU
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Hay cai Node.js LTS tu https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Node.js: %%v

if exist "server\.env" (
  echo Da co file server\.env - giu nguyen cau hinh cu.
  goto :install
)
echo.
if not defined DBPASS set /p DBPASS="Nhap mat khau MySQL cua tai khoan root (da dat khi cai MySQL): "
if not defined GROQKEY set /p GROQKEY="Nhap Groq API key (bat dau bang gsk_, de trong neu chua co): "
call :writeenv

:install
echo.
echo [1/4] Cai thu vien cho server...
call npm install --prefix server || goto :fail
echo [2/4] Cai thu vien cho giao dien...
call npm install --prefix client || goto :fail
echo [3/4] Tao co so du lieu...
call npm run db:init --prefix server || goto :fail
echo [4/4] Nap du lieu mau...
call npm run db:seed --prefix server || goto :fail

echo.
echo ==================================================
echo   CAI DAT THANH CONG! Chay file start.bat de mo ung dung.
echo ==================================================
pause
exit /b 0

:writeenv
setlocal EnableDelayedExpansion
set "AIPROV=groq"
if "!GROQKEY!"=="" set "AIPROV=mock"
(
  for /f "usebackq delims=" %%l in ("server\.env.example") do (
    set "line=%%l"
    if "!line:~0,12!"=="DB_PASSWORD=" set "line=DB_PASSWORD=!DBPASS!"
    if "!line:~0,13!"=="GROQ_API_KEY=" set "line=GROQ_API_KEY=!GROQKEY!"
    if "!line:~0,12!"=="AI_PROVIDER=" set "line=AI_PROVIDER=!AIPROV!"
    echo !line!
  )
) > "server\.env"
endlocal
echo Da tao file server\.env
exit /b 0

:fail
echo.
echo [LOI] Cai dat that bai. Xem thong bao loi phia tren va muc "Xu ly loi" trong HUONG-DAN-CAI-DAT.md
pause
exit /b 1
