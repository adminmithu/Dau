@echo off
title Nova Meet Desktop App
echo Starting Nova Meet in Standalone App Window...
start "" msedge --app="%~dp0index.html" 2>nul || start "" chrome --app="%~dp0index.html" 2>nul || start "" "%~dp0index.html"
exit
