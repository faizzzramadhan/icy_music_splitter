@echo off
set PYTHONUNBUFFERED=1
title ICY MUSIC SPLITTER - LIVE ONLINE
echo ========================================================
echo         ICY MUSIC SPLITTER - PUBLIC ONLINE SERVER
echo ========================================================
echo.
echo Starting local backend server...
start /b python server.py

timeout /t 2 >nul

echo Starting Cloudflare Secure Public Tunnel...
echo.
echo Your public live URL will appear below:
echo --------------------------------------------------------
.\cloudflared.exe tunnel --url http://localhost:7860
pause
