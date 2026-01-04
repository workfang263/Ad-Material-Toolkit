# Windows 系统 DNS 配置修改指南

## 方法一：图形界面修改（推荐）

### 步骤 1：打开网络设置
1. 按 `Win + R` 键，输入 `ncpa.cpl`，按回车
2. 或者：右键点击任务栏右下角的网络图标 → "打开网络和 Internet 设置" → "更改适配器选项"

### 步骤 2：找到你的网络适配器
- 找到 "WLAN 2" 或你正在使用的网络连接
- 图标上不应该有红色 X 或黄色感叹号

### 步骤 3：打开属性
- 右键点击 "WLAN 2" → 选择 "属性"

### 步骤 4：选择 IPv4 协议
- 在列表中找到 "Internet 协议版本 4 (TCP/IPv4)"
- 选中它，然后点击 "属性" 按钮

### 步骤 5：修改 DNS 设置
- 选择 "使用下面的 DNS 服务器地址"
- 输入以下 DNS 服务器：
  - **首选 DNS 服务器**: `8.8.8.8`
  - **备用 DNS 服务器**: `8.8.4.4`
- 点击 "确定" 保存

### 步骤 6：验证配置
- 打开命令提示符（Win + R，输入 `cmd`）
- 运行命令：`ipconfig /all | findstr "DNS"`
- 应该能看到 `8.8.8.8` 和 `8.8.4.4`

### 步骤 7：清理 DNS 缓存
- 在命令提示符中运行：`ipconfig /flushdns`
- 这会清理旧的 DNS 缓存

### 步骤 8：重启服务（可选）
- 重启 API Gateway 服务，让新的 DNS 配置生效

---

## 方法二：命令行修改（快速）

### 使用 PowerShell（需要管理员权限）

1. **以管理员身份打开 PowerShell**
   - 按 `Win + X`，选择 "Windows PowerShell (管理员)"
   - 或右键开始菜单 → "Windows PowerShell (管理员)"

2. **查看网络适配器名称**
   ```powershell
   Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
   ```
   记下 "Name" 列的值（例如：`WLAN 2`）

3. **设置 DNS 服务器**
   ```powershell
   # 设置主 DNS
   Set-DnsClientServerAddress -InterfaceAlias "WLAN 2" -ServerAddresses "8.8.8.8","8.8.4.4"
   ```

4. **验证配置**
   ```powershell
   Get-DnsClientServerAddress -InterfaceAlias "WLAN 2"
   ```

5. **清理 DNS 缓存**
   ```powershell
   Clear-DnsClientCache
   ```

---

## 推荐的 DNS 服务器列表

### Google DNS（推荐）
- 主 DNS: `8.8.8.8`
- 备用 DNS: `8.8.4.4`
- 优点：速度快，稳定，全球可用

### 阿里 DNS（国内推荐）
- 主 DNS: `223.5.5.5`
- 备用 DNS: `223.6.6.6`
- 优点：国内访问快

### 114 DNS
- 主 DNS: `114.114.114.114`
- 备用 DNS: `114.114.115.115`
- 优点：国内老牌 DNS

### 组合推荐
- 首选: `8.8.8.8` (Google DNS)
- 备用: `223.5.5.5` (阿里 DNS)
- 这样既有全球可用性，又有国内速度优势

---

## 修改后的验证

### 测试 DNS 解析
```powershell
# 测试外网域名解析
nslookup img.staticdj.com
nslookup www.baidu.com

# 应该能看到解析出的 IP 地址
```

### 测试网络连接
```powershell
# 测试连接
Test-NetConnection -ComputerName img.staticdj.com -Port 443
```

---

## 注意事项

1. **需要管理员权限**：修改 DNS 需要管理员权限
2. **网络可能短暂中断**：修改 DNS 时，网络连接可能会短暂中断（几秒钟）
3. **不影响浏览器**：修改 DNS 后，可以使用任何浏览器（Chrome、Edge、Firefox 等）
4. **不影响网站访问**：可以访问任何网站，不限于 Google
5. **可以随时改回**：如果出现问题，可以改回原来的 DNS 或选择 "自动获得 DNS 服务器地址"

---

## 如果遇到问题

### 问题 1：找不到网络适配器
- 确保网络已连接
- 检查网络适配器是否启用

### 问题 2：无法保存设置
- 确保以管理员身份运行
- 检查是否有其他程序占用网络设置

### 问题 3：修改后无法上网
- 检查 DNS 地址是否正确输入
- 尝试改回 "自动获得 DNS 服务器地址"
- 重启网络适配器：右键 → "禁用"，然后 "启用"

### 问题 4：DNS 不生效
- 清理 DNS 缓存：`ipconfig /flushdns`
- 重启网络适配器
- 重启计算机

---

## 恢复默认 DNS

如果需要恢复为自动获取 DNS：
1. 打开网络适配器属性
2. 选择 "Internet 协议版本 4 (TCP/IPv4)"
3. 选择 "自动获得 DNS 服务器地址"
4. 点击 "确定"

或使用 PowerShell：
```powershell
Set-DnsClientServerAddress -InterfaceAlias "WLAN 2" -ResetServerAddresses
```



