@echo off
REM Run the FERRS Phase 2 test suite (doc 8 s18.1 + s18.6 + service checks).
setlocal
set HERE=%~dp0
swipl "%HERE%run_tests.pl"
endlocal
