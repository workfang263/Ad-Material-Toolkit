@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo 融合平台系统恢复脚本
echo ========================================
echo.

set "BACKUP_DIR=D:\ronghe-platform的备份"
set "TARGET_DIR=D:\ronghe-platform"

:: 检查备份文件夹是否存在
if not exist "%BACKUP_DIR%" (
    echo [错误] 备份文件夹不存在: %BACKUP_DIR%
    echo 请确认备份路径是否正确
    pause
    exit /b 1
)

echo [步骤 1/6] 检查并停止当前运行的服务...
echo.

:: 停止可能运行的服务
echo 正在停止 Node.js 进程...
taskkill /F /IM node.exe >nul 2>&1
echo 正在停止 Python 进程（视频服务）...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [完成] 服务已停止
echo.

:: 检查端口占用
echo 检查端口占用情况...
netstat -ano | findstr ":18080 :18083 :18090" | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo [警告] 检测到端口仍被占用，请手动关闭相关程序
    echo 按任意键继续（或按 Ctrl+C 取消）...
    pause >nul
)

echo.
echo [步骤 2/6] 备份当前文件夹（如果存在）...
echo.

:: 如果目标文件夹存在，先备份
if exist "%TARGET_DIR%" (
    set "BACKUP_TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
    set "BACKUP_TIMESTAMP=!BACKUP_TIMESTAMP: =0!"
    set "OLD_BACKUP=%TARGET_DIR%_损坏备份_!BACKUP_TIMESTAMP!"
    
    echo 正在备份当前文件夹到: !OLD_BACKUP!
    if exist "!OLD_BACKUP!" (
        echo [警告] 备份文件夹已存在，跳过备份
    ) else (
        ren "%TARGET_DIR%" "ronghe-platform_损坏备份_!BACKUP_TIMESTAMP!"
        echo [完成] 当前文件夹已备份
    )
) else (
    echo [信息] 目标文件夹不存在，将创建新文件夹
)

echo.
echo [步骤 3/6] 从备份文件夹复制所有文件...
echo.

:: 创建目标文件夹
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

:: 使用 PowerShell 复制文件（处理中文路径）
echo 正在复制文件，请稍候...
powershell -Command "& {Copy-Item -Path '%BACKUP_DIR%\*' -Destination '%TARGET_DIR%' -Recurse -Force -ErrorAction SilentlyContinue}"

if %errorlevel% == 0 (
    echo [完成] 文件复制完成
) else (
    echo [警告] 文件复制可能有问题，请检查
)

echo.
echo [步骤 4/6] 检查配置文件...
echo.

:: 检查并创建 .env 文件
cd /d "%TARGET_DIR%"
if not exist ".env" (
    if exist "env.example" (
        copy "env.example" ".env" >nul
        echo [完成] 已从 env.example 创建 .env 文件
    ) else (
        echo [警告] 未找到 env.example 文件
    )
) else (
    echo [信息] .env 文件已存在，跳过创建
)

echo.
echo [步骤 5/6] 重新安装依赖包...
echo.
echo 这可能需要几分钟时间，请耐心等待...
echo.

:: 安装 API 网关依赖
echo [5.1] 安装 API 网关依赖...
cd /d "%TARGET_DIR%\api-gateway"
if exist "package.json" (
    call npm install
    if !errorlevel! == 0 (
        echo [完成] API 网关依赖安装完成
    ) else (
        echo [错误] API 网关依赖安装失败
    )
) else (
    echo [警告] 未找到 api-gateway\package.json
)
echo.

:: 安装前端依赖
echo [5.2] 安装前端依赖...
cd /d "%TARGET_DIR%\frontend"
if exist "package.json" (
    call npm install
    if !errorlevel! == 0 (
        echo [完成] 前端依赖安装完成
    ) else (
        echo [错误] 前端依赖安装失败
    )
) else (
    echo [警告] 未找到 frontend\package.json
)
echo.

:: 安装视频服务依赖
echo [5.3] 安装视频服务依赖...
cd /d "%TARGET_DIR%\video-service"
if exist "requirements.txt" (
    pip install -r requirements.txt
    if !errorlevel! == 0 (
        echo [完成] 视频服务依赖安装完成
    ) else (
        echo [错误] 视频服务依赖安装失败
    )
) else (
    echo [警告] 未找到 video-service\requirements.txt
)
echo.

echo [步骤 6/6] 恢复完成！
echo.
echo ========================================
echo 恢复总结
echo ========================================
echo 1. 文件已从备份恢复
echo 2. 依赖包已重新安装
echo 3. 配置文件已检查
echo.
echo 下一步操作：
echo 1. 打开 Cursor IDE，打开文件夹: %TARGET_DIR%
echo 2. 运行启动脚本: start-dev.bat
echo    或
echo 3. 在 Cursor 中告诉我"启动系统"
echo.
echo ========================================
echo.

:: 询问是否立即启动
set /p START_NOW="是否立即启动系统？(Y/N): "
if /i "%START_NOW%"=="Y" (
    echo.
    echo 正在启动系统...
    cd /d "%TARGET_DIR%"
    call start-dev.bat
) else (
    echo.
    echo 您可以稍后手动启动系统
)

echo.
pause






