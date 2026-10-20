@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang khoi dong EduTrack AI...
start "EduTrack AI - Server (KHONG DONG CUA SO NAY)" cmd /k "cd /d %~dp0server && npm start"
start "EduTrack AI - Giao dien (KHONG DONG CUA SO NAY)" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5173
echo.
echo Da mo trinh duyet tai http://localhost:5173
echo Muon tat ung dung: dong 2 cua so den "Server" va "Giao dien".
pause
