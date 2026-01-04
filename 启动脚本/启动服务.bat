@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem 启用错误处理，确保错误能被看到
set "ERROR_OCCURRED=0"

rem 设置项目根目录（绝对路径）
set "BASE_DIR=D:\ronghe-platform"
set "LOG_FILE=%BASE_DIR%\启动脚本\启动日志.txt"

rem 验证路径
if not exist "%BASE_DIR%" (
    echo 项目路径不存在: %BASE_DIR%
    pause
    exit /b 1
)

rem 切换到项目目录
cd /d "%BASE_DIR%" 2>nul
if errorlevel 1 (
    echo 无法切换到项目目录: %BASE_DIR%
    pause
    exit /b 1
)

rem 初始化日志
if exist "%LOG_FILE%" del /f /q "%LOG_FILE%"
call :log "========================================"
call :log "重新启动融合平台所有服务"
call :log "========================================"
call :log "[INFO] 项目根目录: %BASE_DIR%"
call :log "[INFO] 当前工作目录: %CD%"
call :log ""

call :log "[STOP] 正在停止现有服务..."
call :stop_service "18080"
call :stop_service "18083"
call :stop_service "18090"

call :log ""
call :log "[WAIT] 等待服务完全关闭..."
timeout /t 3 /nobreak >nul

call :log ""
call :log "[START] 开始启动服务..."
call :ensure_node_modules "api-gateway"
call :ensure_node_modules "frontend"

rem 使用 PowerShell Start-Process 打开新窗口，避免 cmd 引号问题
call :ps_start "Video Service (18090)" "%BASE_DIR%\video-service" "set FFMPEG_PATH=C:\ffmpeg\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe && python -u -B app.py"
call :ps_start "API Gateway (18083)" "%BASE_DIR%\api-gateway" "node server.js"
call :ps_start "Frontend Dev Server (18080)" "%BASE_DIR%\frontend" "npm run dev"

call :log ""
call :log "========================================"
if "%ERROR_OCCURRED%"=="1" (
    call :log "[警告] 服务启动过程中出现错误，请检查上方信息"
) else (
    call :log "所有服务已重新启动完成！"
)
call :log "========================================"
call :log ""
call :log "日志文件: %LOG_FILE%"
call :log "按任意键关闭此窗口..."
pause
exit /b 0

:stop_service
set "TARGET_PORT=%~1"
call :get_listening_pid "%TARGET_PORT%" CURRENT_PID
if defined CURRENT_PID (
    call :log "[STOP] 正在停止端口 %TARGET_PORT% 的进程 (PID: %CURRENT_PID%)..."
    taskkill /F /PID %CURRENT_PID% >nul 2>&1
    if !errorlevel! equ 0 (
        call :log "[OK] 端口 %TARGET_PORT% 的进程已停止"
    ) else (
        call :log "[WARN] 停止端口 %TARGET_PORT% 的进程时出现错误"
    )
) else (
    call :log "[INFO] 端口 %TARGET_PORT% 未被占用，无需停止"
)
goto :eof

:start_service
set "SERVICE_NAME=%~1"
set "SERVICE_PORT=%~2"
set "SERVICE_DIR=%BASE_DIR%\%~3"
set "SERVICE_CMD=%~4"

if not exist "%SERVICE_DIR%" (
    call :log "[ERROR] %SERVICE_NAME% 路径不存在: %SERVICE_DIR%"
    set "ERROR_OCCURRED=1"
    goto :eof
)

call :get_listening_pid "%SERVICE_PORT%" CURRENT_PID
if defined CURRENT_PID (
    call :log "[WARN] %SERVICE_NAME% 端口 %SERVICE_PORT% 仍被 PID %CURRENT_PID% 占用，尝试强制停止..."
    taskkill /F /PID %CURRENT_PID% >nul 2>&1
    timeout /t 1 /nobreak >nul
)

call :log "[START] %SERVICE_NAME% (端口 %SERVICE_PORT%) 正在启动..."
start "" cmd /k "title %SERVICE_NAME% (%SERVICE_PORT%) && cd /d \"%SERVICE_DIR%\" && %SERVICE_CMD%"
if errorlevel 1 (
    call :log "[ERROR] 启动 %SERVICE_NAME% 失败！"
    set "ERROR_OCCURRED=1"
) else (
    call :log "[OK] %SERVICE_NAME% 启动命令已执行"
)
timeout /t 2 /nobreak >nul
goto :eof

:get_listening_pid
set "TARGET_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% " ^| findstr /I "LISTENING"') do (
    set "%~2=%%P"
    goto :EOF
)
set "%~2="
goto :eof

:ensure_node_modules
set "TARGET_DIR=%BASE_DIR%\%~1"
if not exist "%TARGET_DIR%\package.json" goto :eof
if exist "%TARGET_DIR%\node_modules" goto :eof

echo [INFO] 检测到 %~1 未安装依赖，正在自动执行 npm install...
pushd "%TARGET_DIR%"
call npm install
popd
goto :eof

:ps_start
rem 参数: 窗口标题、工作目录、命令
set "P_TITLE=%~1"
set "P_DIR=%~2"
set "P_CMD=%~3"

if not exist "%P_DIR%" (
    call :log "[ERROR] PowerShell 启动失败，目录不存在: %P_DIR%"
    set "ERROR_OCCURRED=1"
    goto :eof
)

rem 直接用 cmd /k 保持窗口，避免 PowerShell 参数转义问题
start "%P_TITLE%" cmd /k "cd /d \"%P_DIR%\" ^&^& %P_CMD%"

if errorlevel 1 (
    call :log "[ERROR] 启动 %P_TITLE% 失败"
    set "ERROR_OCCURRED=1"
) else (
    call :log "[OK] 已尝试启动窗口: %P_TITLE%"
)
goto :eof

:log
set "LOG_MSG=%~1"
if "%LOG_MSG%"=="" (
    echo.
    >>"%LOG_FILE%" echo.
) else (
    echo %LOG_MSG%
    >>"%LOG_FILE%" echo %LOG_MSG%
)
goto :eof
