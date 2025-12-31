@echo off
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if not exist "%CSC%" (
    echo "C# Compiler (CSC) not found. Please install .NET Framework."
    exit /b 1
)

echo Found Compiler: %CSC%
"%CSC%" /target:winexe /out:EarthGuard.exe Launcher.cs

if exist EarthGuard.exe (
    echo Compilation Successful: EarthGuard.exe created.
) else (
    echo Compilation Failed.
)
