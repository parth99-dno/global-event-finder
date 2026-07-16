import argostranslate.translate
import argostranslate.package
import logging

logger = logging.getLogger(__name__)

class UnsupportedLanguageException(Exception):
    """Raised when a language is not supported for translation to English."""
    pass

def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translates text from source_lang to English.
    Returns original text if source_lang is 'en'.
    Raises Exception if translation fails or package is missing.
    """
    if source_lang == 'en':
        return text

    try:
        translated_text = argostranslate.translate.translate(text, source_lang, "en")
        return translated_text
    except Exception as e:
        logger.error(f"Argos translation failed for {source_lang} -> en: {str(e)}")
        raise e

def translate_article_to_english(text: str, detected_lang: str) -> str:
    """
    Translates article text to English.
    Raises UnsupportedLanguageException if the language pack is missing.
    """
    if detected_lang == 'en':
        return text
        
    installed = argostranslate.package.get_installed_packages()
    package = next((p for p in installed if p.from_code == detected_lang and p.to_code == 'en'), None)
    
    if not package:
        raise UnsupportedLanguageException(f"No translation package for {detected_lang} -> en")
        
    try:
        return argostranslate.translate.translate(text, detected_lang, "en")
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise UnsupportedLanguageException(f"Translation failed: {e}")
