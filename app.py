from flask import Flask

app = Flask(__name__)

from routes import *

if __name__ == '__main__':
    app.run('0.0.0.0', debug=True)