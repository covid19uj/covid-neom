import random

from core.nlp.engine import NLPEngine
from core.dialog.responses import *


class DialogManger:
    def __init__(self):
        self.engine = NLPEngine()
        
    def process_message(self, message):
        intent, entities, language = self.engine.predict(message)
        return self.engine.synthesis_text(self.get_response(intent, entities, language), language)
    
    def get_response(self, intent, entities, language):
        print(intent)
        if intent == "7_":
            if "en" in language:
                return random.choice(EN_TRANSPORTATION)
            elif "ar" in language:
                return random.choice(AR_TRANSPORTATION)
        elif intent == "2_":
            if "en" in language:
                return random.choice(EN_ACTIVE_CASES)
            elif "ar" in language:
                return random.choice(AR_ACTIVE_CASES)
        elif intent == "10-_":
            if "en" in language:
                return random.choice(EN_END)
            elif "ar" in language:
                return random.choice(AR_END)
        elif intent == "9_":
            if "en" in language:
                return random.choice(EN_SYMPTOMS)
            elif "ar" in language:
                return random.choice(AR_SYMPTOMS)
        elif intent == "_":
            if "en" in language:
                return random.choice(EN_GREATING)
            elif "ar" in language:
                return random.choice(AR_GREATING)
        elif intent == "5_":
            if "en" in language:
                return random.choice(EN_PROTECTION)
            elif "ar" in language:
                return random.choice(AR_PROTECTION)
        elif intent == "3_":
            if "en" in language:
                return random.choice(EN_SYMPTOMS_DIFF)
            elif "ar" in language:
                return random.choice(AR_SYMPTOMS_DIFF)
        elif intent == "6-_":
            if "en" in language:
                return random.choice(EN_WHERE_WHEN_START)
            elif "ar" in language:
                return random.choice(AR_WHERE_WHEN_START)
        elif intent == "13_":
            if "en" in language:
                return random.choice(EN_DIABETES)
            elif "ar" in language:
                return random.choice(AR_DIABETES)
        elif intent == "8_":
            if "en" in language:
                return random.choice(EN_CURE)
            elif "ar" in language:
                return random.choice(AR_CURE)
        elif intent == "1_":
            if "en" in language:
                return random.choice(EN_DURATION_SURFACE)
            elif "ar" in language:
                return random.choice(AR_DURATION_SURFACE)
        elif intent == "11_":
            if "en" in language:
                return random.choice(EN_TRANSFER)
            elif "ar" in language:
                return random.choice(AR_TRANSFER)
        elif intent == "14_":
            if "en" in language:
                return random.choice(EN_TALK_ABOUT_YOU)
        elif intent == "4_":
            if "en" in language:
                return random.choice(EN_BEHIND_YOU)
            elif "ar" in language:
                return random.choice(AR_BEHIND_YOU)
        else:
            if "en" in language:
                return "Sorry I didn't get that."
            elif "ar" in language:
                return "انا أسِفْ. لَم افهم ما قلت"
