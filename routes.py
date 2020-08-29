from flask import request, render_template

from core.dialog.manager import DialogManger
from app import app

manager = DialogManger()

@app.route('/', methods=["GET", "POST"])
def home():
    if request.method == "GET":
        return render_template("chat.html")
    elif request.method == "POST":
        rawAudio = request.get_data()
        print(len(rawAudio))
        try:
            return manager.process_message(rawAudio)
        except Exception as err:
            print(err)
            return "Something went wrong"
        resp = manager.engine.predict_speech(rawAudio)
        print('Yay, got Wit.ai response: ' + str(resp))
        return "success"
