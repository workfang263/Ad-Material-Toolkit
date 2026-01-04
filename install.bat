@echo off
chcp 65001 >nul
echo ========================================
echo 融合平台 - 自动安装依赖脚本
echo ========================================
echo.

REM 获取脚本所在目录（项目根目录）
cd /d "%~dp0"

REM 检查是否在正确的目录
if not exist "package.json" (
    echo [错误] 未找到 package.json，请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [信息] 项目目录: %CD%
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js (v16+)
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 Python 是否安装
where python >nul 2>&1
if errorlevel 1 (
    echo [警告] 未检测到 Python，视频服务依赖将无法安装
    echo 下载地址: https://www.python.org/
    set "PYTHON_AVAILABLE=0"
) else (
    set "PYTHON_AVAILABLE=1"
)

echo ========================================
echo 开始安装依赖...
echo ========================================
echo.

REM ========== 1. 安装根目录依赖 ==========
echo [1/4] 安装根目录依赖...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo [错误] 根目录依赖安装失败
    pause
    exit /b 1
)
echo [完成] 根目录依赖安装成功
echo.

REM ========== 2. 安装前端依赖 ==========
echo [2/4] 安装前端依赖...
if not exist "frontend\package.json" (
    echo [警告] 未找到 frontend\package.json，跳过前端依赖安装
) else (
    cd /d "%~dp0\frontend"
    call npm install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    echo [完成] 前端依赖安装成功
)
echo.

REM ========== 3. 安装 API 网关依赖 ==========
echo [3/4] 安装 API 网关依赖...
if not exist "api-gateway\package.json" (
    echo [警告] 未找到 api-gateway\package.json，跳过 API 网关依赖安装
) else (
    cd /d "%~dp0\api-gateway"
    call npm install
    if errorlevel 1 (
        echo [错误] API 网关依赖安装失败
        pause
        exit /b 1
    )
    echo [完成] API 网关依赖安装成功
)
echo.

REM ========== 4. 安装视频服务依赖 (Python) ==========
echo [4/4] 安装视频服务依赖 (Python)...
if "%PYTHON_AVAILABLE%"=="0" (
    echo [跳过] Python 未安装，跳过视频服务依赖安装
) else (
    if not exist "video-service\requirements.txt" (
        echo [警告] 未找到 video-service\requirements.txt，跳过视频服务依赖安装
    ) else (
        cd /d "%~dp0\video-service"
        echo [信息] 正在使用 pip 安装 Python 依赖...
        call pip install -r requirements.txt
        if errorlevel 1 (
            echo [错误] 视频服务依赖安装失败
            echo [提示] 可以尝试使用: pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
            pause
            exit /b 1
        )
        echo [完成] 视频服务依赖安装成功
    )
)
echo.

REM 返回根目录
cd /d "%~dp0"

echo ========================================
echo 所有依赖安装完成！
echo ========================================
echo.
echo 下一步：
echo   1. 复制 env.example 为 .env 文件
echo   2. 编辑 .env 文件，配置必要的参数
echo   3. 修改 video-service\app.py 中的 FFmpeg 路径
echo   4. 运行 start_demo.bat 启动服务
echo.
pause

