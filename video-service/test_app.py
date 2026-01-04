#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的Flask测试应用
"""

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello, World! Flask应用正常工作！"

@app.route('/test')
def test():
    return "测试页面正常！"

if __name__ == '__main__':
    print("启动测试Flask应用...")
    app.run(host='0.0.0.0', port=5000, debug=True)

