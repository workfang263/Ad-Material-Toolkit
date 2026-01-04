# -*- coding: utf-8 -*-
import os
import shutil
import sys

# 设置UTF-8编码输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 切换到 pinjie 目录
os.chdir(r'D:\ronghe-platform\pinjie')

# 要移动的文件列表
files_to_move = [
    '会话总结-2025-12-24.md',
    '会话总结-2025-12-24-第二次.md',
    '会话总结-2025-12-24-第三次.md',
    '会话总结-2025-12-24-第四次.md',
    '会话总结-2025-12-24-第五次.md',
    '会话总结-2025-12-24-第六次.md',
    '会话总结-2025-12-24-第七次.md',
    '广告投放新需求方案.md',
    '广告投放新需求方案-优化版.md',
    '广告投放新需求方案-最终版.md',
    '快速参考-完整.md',
    '快速参考-阶段七准备.md',
    '项目状态-综合.md',
    '项目状态-2025-12-27-最终.md',
    '遇到的问题和解决方案.md',
    '数据对齐逻辑问题分析.md',
    '数据对齐功能优化方案.md',
    '会话交接-2025-12-24-最新.md',
    '会话总结-完整版.md',
    '会话总结-2024-12-23.md',
    '会话总结-2025-12-27-数据对齐优化.md',
]

target_dir = '归档'

# 确保目标目录存在
if not os.path.exists(target_dir):
    os.makedirs(target_dir)

# 移动文件
moved_count = 0
for file in files_to_move:
    if os.path.isfile(file):
        try:
            target_path = os.path.join(target_dir, file)
            if not os.path.exists(target_path):
                shutil.move(file, target_path)
                moved_count += 1
            else:
                print(f'文件已存在: {file}')
        except Exception as e:
            print(f'移动失败: {file} - {e}')
    else:
        print(f'文件不存在: {file}')

print(f'\n完成！共移动 {moved_count} 个文件到归档文件夹。')
