@echo off
echo Installing Python dependencies for Word Merge feature...

cd /d "%~dp0"

if not exist packages (
    echo Error: 'packages' directory not found!
    echo Please make sure you have copied the 'packages' folder.
    pause
    exit /b 1
)

echo Installing dependencies from local packages...
echo Installing build tools first...
pip install --no-index --find-links=packages setuptools wheel

echo Installing main dependencies...
pip install --no-index --find-links=packages python-docx docxcompose pywin32 six babel lxml typing-extensions

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installation completed successfully!
) else (
    echo.
    echo Installation failed! Please check the error messages above.
)

pause
