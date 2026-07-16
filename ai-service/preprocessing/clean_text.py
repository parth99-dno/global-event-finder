"""
preprocessing/clean_text.py

NLP cleaning pipeline for raw news articles.
Steps (applied in order):
  1. Lowercase
  2. Strip HTML tags
  3. Remove URLs
  4. Remove special characters / punctuation
  5. Tokenisation (NLTK)
  6. Stopword removal (NLTK)
  7. Lemmatisation (NLTK WordNetLemmatizer)

Also runs spaCy NER to extract:
  - ORG entities  → organizations field
  - GPE / LOC entities → keywords field
  - PERSON entities  → keywords field

Returns both the original title/description AND a cleaned processed_text string.
"""

import re
import logging
from functools import lru_cache

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
import spacy

from langdetect import detect, LangDetectException, DetectorFactory
DetectorFactory.seed = 0

from ir.translate import translate_article_to_english, UnsupportedLanguageException

# ── ensure NLTK data is present ──────────────────────────────────────────────
for _pkg in ("stopwords", "punkt", "punkt_tab", "wordnet", "omw-1.4"):
    try:
        nltk.data.find(f"corpora/{_pkg}" if _pkg not in ("punkt", "punkt_tab") else f"tokenizers/{_pkg}")
    except LookupError:
        nltk.download(_pkg, quiet=True)

logger = logging.getLogger(__name__)

# ── lazy-loaded singletons ────────────────────────────────────────────────────
_lemmatizer = WordNetLemmatizer()
_stop_words: set[str] = set(stopwords.words("english"))

@lru_cache(maxsize=1)
def _get_nlp():
    try:
        # Keep tagger for proper POS → lemmatizer works without warnings
        return spacy.load("en_core_web_sm", disable=["parser"])
    except OSError:
        logger.error("spaCy en_core_web_sm not found – run: python -m spacy download en_core_web_sm")
        return None


# ── text cleaning helpers ─────────────────────────────────────────────────────

_HTML_TAG_RE   = re.compile(r"<[^>]+>")
_URL_RE        = re.compile(r"https?://\S+|www\.\S+")
_SPECIAL_RE    = re.compile(r"[^a-z0-9\s]")          # keeps only letters, digits, spaces


def _strip_html(text: str) -> str:
    return _HTML_TAG_RE.sub(" ", text)


def _strip_urls(text: str) -> str:
    return _URL_RE.sub(" ", text)


def _remove_special(text: str) -> str:
    return _SPECIAL_RE.sub(" ", text)


def _collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_for_processing(raw_text: str) -> str:
    """
    Full pipeline → returns a clean token-string suitable for TF-IDF.
    raw_text can be title + " " + description.
    """
    if not raw_text:
        return ""

    # 1. Lowercase
    text = raw_text.lower()
    # 2. Remove HTML
    text = _strip_html(text)
    # 3. Remove URLs
    text = _strip_urls(text)
    # 4. Remove special chars
    text = _remove_special(text)
    text = _collapse_whitespace(text)

    # 5. Tokenise
    tokens = word_tokenize(text)

    # 6. Remove stopwords and single-char tokens
    tokens = [t for t in tokens if t not in _stop_words and len(t) > 1]

    # 7. Lemmatise
    tokens = [_lemmatizer.lemmatize(t) for t in tokens]

    return " ".join(tokens)


# ── NER extraction ────────────────────────────────────────────────────────────

def extract_entities(text: str) -> dict:
    """
    Run spaCy NER on raw (un-cleaned) text.
    Returns {"organizations": [...], "keywords": [...]}.
    ORG   → organizations
    GPE / LOC / PERSON → keywords
    """
    nlp = _get_nlp()
    if not nlp or not text:
        return {"organizations": [], "keywords": []}

    # Truncate to 1M chars (spaCy limit)
    doc = nlp(text[:1_000_000])

    organizations = []
    keywords = []
    seen = set()

    for ent in doc.ents:
        name = ent.text.strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())

        if ent.label_ == "ORG":
            organizations.append(name)
        elif ent.label_ in ("GPE", "LOC", "PERSON", "NORP"):
            keywords.append(name)

    return {
        "organizations": organizations[:20],   # cap to keep docs lean
        "keywords":      keywords[:30],
    }


# ── main entry point ──────────────────────────────────────────────────────────

def process_article(article: dict) -> dict:
    """
    Given a raw article dict (from a fetcher), return a new dict with:
      - all original fields preserved
      - processed_text   : cleaned, lemmatised string for TF-IDF
      - organizations    : merged with any already present
      - keywords         : merged with any already present
      - was_translated   : True if non-English and successfully translated
      - original_title   : The untranslated title (if translated)
    """
    title       = article.get("title", "") or ""
    description = article.get("description", "") or ""
    combined    = f"{title} {description}"

    if not combined.strip():
        # Treat completely empty text as unsupported language to skip it
        raise UnsupportedLanguageException("Empty article text")

    try:
        detected_lang = detect(combined)[:2]
    except LangDetectException:
        raise UnsupportedLanguageException("Could not detect language")

    was_translated = False
    original_title = None

    if detected_lang != 'en':
        original_title = title
        title = translate_article_to_english(title, detected_lang) if title else ""
        description = translate_article_to_english(description, detected_lang) if description else ""
        combined = f"{title} {description}"
        was_translated = True

    processed_text = clean_for_processing(combined)

    entities = extract_entities(combined)

    # Merge NER results with any pre-existing arrays (fetchers may pre-populate)
    existing_orgs     = list(article.get("organizations", []))
    existing_keywords = list(article.get("keywords", []))

    merged_orgs = list({*existing_orgs, *entities["organizations"]})[:20]
    merged_keys = list({*existing_keywords, *entities["keywords"]})[:30]

    result = {
        **article,
        "title": title,
        "description": description,
        "processed_text": processed_text,
        "organizations":  merged_orgs,
        "keywords":       merged_keys,
        "was_translated": was_translated,
    }
    if original_title:
        result["original_title"] = original_title

    return result
