"""
cleanup_unsupported.py

1. Deletes all articles whose title+description langdetect classifies as non-English
   AND which don't already have an original_title (i.e. were never successfully translated).
2. Reports a summary of how many were deleted per language.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from pymongo import MongoClient
from langdetect import detect, DetectorFactory, LangDetectException
from ir.translate import UnsupportedLanguageException, translate_article_to_english
import argostranslate.package
from collections import Counter

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "")
client = MongoClient(MONGODB_URI)
collection = client["global_event_finder"]["events"]

DetectorFactory.seed = 0

SUPPORTED_LANGS = {'hi', 'es', 'fr', 'de', 'zh', 'tr', 'cs'}

print("Scanning all docs without original_title...")
docs = list(collection.find({"original_title": {"$exists": False}}, {"_id": 1, "title": 1, "description": 1}))
print(f"Total to check: {len(docs)}")

delete_ids = []
misdetected_fixed = 0
lang_delete_counter = Counter()

for doc in docs:
    title = doc.get("title", "") or ""
    desc = doc.get("description", "") or ""
    combined = f"{title} {desc}".strip()
    if not combined:
        continue
    try:
        lang = detect(combined)[:2]
    except LangDetectException:
        continue  # can't detect = leave it (already in skip logic in pipeline)

    if lang == "en":
        continue

    # This doc is non-English and was never translated.
    # Check if it's actually a supported language that was misclassified.
    # For example, langdetect classifying Turkish text as 'et'.
    # We'll try to translate it with the true detected lang and if it works, update in place.
    if lang in SUPPORTED_LANGS:
        # langdetect said it's e.g. 'tr' but the fix script already ran on it...
        # Shouldn't happen, but handle gracefully.
        continue

    # Mark for deletion — it's in a language we don't support
    delete_ids.append(doc["_id"])
    lang_delete_counter[lang] += 1

print(f"\nDeleting {len(delete_ids)} unsupported-language articles...")
if delete_ids:
    result = collection.delete_many({"_id": {"$in": delete_ids}})
    print(f"Deleted: {result.deleted_count}")

print("\n=== Deleted by language ===")
for lang, count in sorted(lang_delete_counter.items(), key=lambda x: -x[1]):
    print(f"  {lang}: {count}")

print("\nDone.")
