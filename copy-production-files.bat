@echo off
REM Copy production files script
REM Run this after npm run build

echo Copying config and assets to dist...

REM Create directories
if not exist "dist\config" mkdir dist\config
if not exist "dist\assets" mkdir dist\assets
if not exist "dist\assets\fonts" mkdir dist\assets\fonts

REM Copy config files
echo   - Copying config files...
xcopy /E /I /Y src\config dist\config

REM Copy src/assets (fonts and template images)
echo   - Copying src/assets...
xcopy /E /I /Y src\assets dist\assets

REM Copy root assets (template images)
echo   - Copying root assets...
xcopy /E /I /Y assets dist\assets

echo.
echo Files copied successfully!
echo.
echo Config files in dist\config:
dir /B dist\config
echo.
echo Assets in dist\assets:
dir /B dist\assets
echo.
echo Fonts in dist\assets\fonts:
dir /B dist\assets\fonts
