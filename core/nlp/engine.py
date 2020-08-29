from wit import Wit
from uuid import uuid4
from flask import url_for
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
from google.cloud import speech_v1p1beta1
from google.cloud import texttospeech_v1beta1

class NLPEngine:
    def __init__(self):
        self.en_engine = Wit("LH5MOLTAR3KCIBM5FGTR3UGS4OLBFQ5G")
        self.ar_engine = Wit("HEPFKAGVVILDTSYWLV5P67QI27Q7EGER")
        self.audio_engine = speech_v1p1beta1.SpeechClient.from_service_account_json('google-credentials.json')
        self.tts_engine = texttospeech_v1beta1.TextToSpeechClient.from_service_account_json('google-credentials.json')
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        self.root_ref = db.reference("/", url="https://hologram-covid-19.firebaseio.com")
        self.config = {
            "encoding": None, 
            "sample_rate_hertz": 44100, 
            "enable_automatic_punctuation": True,
            "audio_channel_count": 2,
            "language_code": "en",
            "alternative_language_codes": ["ar"],
        }

    def hologram_talk(self):
        self.root_ref.update(
            {
                "lastUpdate": 1
            }
        )
    
    def hologram_stop(self):
        self.root_ref.update(
            {
                "lastUpdate": 0
            }
        )

    def predict_speech(self, raw):
        audio = {"content": raw}
        print(len(raw))
        response = self.audio_engine.recognize(self.config, audio)
        print(response)
        language = response.results[-1].language_code
        print(language)
        alternative = response.results[-1].alternatives[0]
        print(alternative.transcript)
        return alternative.transcript, language
    
    def synthesis_text(self, text, language):
        synthesis_input = texttospeech_v1beta1.SynthesisInput(text=text)

        if "en" in language:
            voice = texttospeech_v1beta1.VoiceSelectionParams(
                language_code="en-US", ssml_gender=texttospeech_v1beta1.SsmlVoiceGender.MALE
            )
        elif "ar" in language:
            voice = texttospeech_v1beta1.VoiceSelectionParams(
                language_code="ar-x-gulf", ssml_gender=texttospeech_v1beta1.SsmlVoiceGender.MALE
            )

        audio_config = texttospeech_v1beta1.AudioConfig(
            audio_encoding=texttospeech_v1beta1.AudioEncoding.MP3
        )

        response = self.tts_engine.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        temp_name = str(uuid4()).replace('-', '') + '.mp3'
        with open("static/" + temp_name, "wb") as out:
        # Write the response to the output file.
            out.write(response.audio_content)
            print('Audio content written to file "output.mp3"')

        return url_for('static', filename=temp_name)

    def predict(self, message):
        message, language = self.predict_speech(message)
        if "ar" in language:
            response = self.ar_engine.message(message)
        elif "en" in language:
            response = self.en_engine.message(message)

        try:
            intent = response["intents"][0]["name"]
        except:
            intent = "fallback"

        try:
            entities = []
            for k, v in response["entities"].items():
                for e in v:
                    entities.append(e["value"])
        except:
            entities = []

        return intent, entities, language
