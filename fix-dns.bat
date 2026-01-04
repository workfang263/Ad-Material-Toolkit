@echo off
chcp 65001 >nul
echo ========================================
echo 修复 DNS 配置脚本
echo ========================================
echo.
echo 当前问题：系统 DNS 服务器 (195.168.0.1) 无法解析外网域名
echo 解决方案：将 DNS 改为可靠的公共 DNS 服务器
echo.
echo 需要管理员权限，请右键选择"以管理员身份运行"
echo.
pause

echo.
echo 正在修改 DNS 配置...
echo.

REM 获取活动的网络适配器
for /f "tokens=*" %%i in ('netsh interface show interface ^| findstr /i "已连接"') do (
    for /f "tokens=3" %%j in ("%%i") do (
        set "AdapterName=%%j"
        goto :found
    )
)

:found
if not defined AdapterName (
    echo 错误：未找到活动的网络适配器
    pause
    exit /b 1
)

echo 找到网络适配器: %AdapterName%
echo.

REM 设置 IPv4 DNS 服务器（Google DNS 和 阿里 DNS）
echo 正在设置 IPv4 DNS 服务器...
netsh interface ipv4 set dns name="%AdapterName%" static 8.8.8.8 primary
netsh interface ipv4 add dns name="%AdapterName%" 8.8.4.4 index=2
netsh interface ipv4 add dns name="%AdapterName%" 223.5.5.5 index=3

if %errorlevel% == 0 (
    echo ✅ IPv4 DNS 配置成功
) else (
    echo ❌ IPv4 DNS 配置失败，请检查管理员权限
)

echo.
echo ========================================
echo DNS 配置完成
echo ========================================
echo.
echo 新的 DNS 服务器：
echo - 主 DNS: 8.8.8.8 (Google DNS)
echo - 备用 DNS: 8.8.4.4 (Google DNS)
echo - 备用 DNS: 223.5.5.5 (阿里 DNS)
echo.
echo 请重启 API Gateway 服务以使配置生效
echo.
pause



