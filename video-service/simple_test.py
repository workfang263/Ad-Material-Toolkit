from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello World! 测试成功！"

if __name__ == '__main__':
    print("启动简单测试应用...")
    app.run(host='0.0.0.0', port=5002, debug=True)

