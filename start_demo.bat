@echo off
chcp 65001 >nul
echo ========================================
echo 融合平台 Demo 启动脚本
echo ========================================
echo.

REM 获取脚本所在目录（项目根目录）
cd /d "%~dp0"

REM 检查必要的文件
if not exist "package.json" (
    echo [错误] 未找到 package.json，请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [信息] 项目目录: %CD%
echo.

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo [警告] 未检测到 node_modules，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

if not exist "frontend\node_modules" (
    echo [警告] 未检测到前端依赖，正在安装...
    cd frontend
    call npm install
    cd ..
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
)

if not exist "api-gateway\node_modules" (
    echo [警告] 未检测到 API 网关依赖，正在安装...
    cd api-gateway
    call npm install
    cd ..
    if errorlevel 1 (
        echo [错误] API 网关依赖安装失败
        pause
        exit /b 1
    )
)

REM 检查 .env 文件
if not exist ".env" (
    echo [警告] 未找到 .env 文件
    if exist "env.example" (
        echo [信息] 正在从 env.example 创建 .env 文件...
        copy env.example .env >nul
        echo [提示] 请编辑 .env 文件，配置必要的参数
    ) else (
        echo [错误] 未找到 env.example 文件
    )
)

echo.
echo ========================================
echo 正在启动服务...
echo ========================================
echo.

REM 启动视频服务
echo [启动] 视频服务 (端口 19000)...
start "Video Service (19000)" cmd /k "cd /d %CD%\video-service && python app.py"

REM 等待 2 秒
timeout /t 2 /nobreak >nul

REM 启动 API 网关
echo [启动] API 网关 (端口 18081)...
start "API Gateway (18081)" cmd /k "cd /d %CD%\api-gateway && node server.js"

REM 等待 2 秒
timeout /t 2 /nobreak >nul

REM 启动前端
echo [启动] 前端开发服务器 (端口 18080)...
start "Frontend Dev (18080)" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo ========================================
echo 所有服务已启动！
echo ========================================
echo.
echo 访问地址：
echo   前端界面: http://localhost:18080
echo   API 网关: http://localhost:18081
echo   视频服务: http://localhost:19000
echo.
echo 提示：每个服务都在独立的窗口中运行
echo       关闭对应的窗口即可停止该服务
echo.
pause

