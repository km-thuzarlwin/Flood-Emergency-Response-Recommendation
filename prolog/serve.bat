@echo off
REM Start the FERRS Prolog reasoning service.  Usage: serve.bat [PORT]
setlocal
set HERE=%~dp0
swipl "%HERE%serve.pl" %*
endlocal
