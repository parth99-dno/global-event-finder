"""
investigation.py

Diagnoses three questions:
1. Why did some Turkish articles get translated while others didn't?
   → The fix script targets {"original_title": {"$exists": False}}. After the
     first run, fixed articles GET original_title set. But un-fixable articles
     (UnsupportedLanguageException) are silently left in place — still no
     original_title. So the second run would try them again but fail again.
     We need to know: are there Turkish articles without original_title that
     langdetect detects as 'tr' today?

2. Did the fix script miss articles with longer non-English text?
   → No. The script queries ALL docs without original_title, not just short
     ones. But crucially: it only *updates* docs where process_article returns
     was_translated=True. If langdetect detects, say, 'no' (Norwegian) or
     'el' (Greek), the UnsupportedLanguageException is raised, and the doc
     is left with no original_title and no flag — so it stays in the DB
     untouched and untranslatable.

3. What languages are still present in the DB?
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from pymongo import MongoClient
from langdetect import detect, DetectorFactory, LangDetectException
from collections import Counter

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "")
client = MongoClient(MONGODB_URI)
collection = client["global_event_finder"]["events"]

print("Scanning all docs without original_title for non-English content...")
docs = list(collection.find({"original_title": {"$exists": False}}, {"title": 1, "description": 1}))
print(f"Total docs to scan: {len(docs)}")

DetectorFactory.seed = 0
lang_counter = Counter()
non_english = []

for doc in docs:
    title = doc.get("title", "") or ""
    desc = doc.get("description", "") or ""
    combined = f"{title} {desc}".strip()
    if not combined:
        continue
    try:
        lang = detect(combined)[:2]
        lang_counter[lang] += 1
        if lang != "en":
            non_english.append((lang, title))
    except LangDetectException:
        lang_counter["_detect_failed"] += 1

print("\n=== Language distribution (docs without original_title) ===")
for lang, count in sorted(lang_counter.items(), key=lambda x: -x[1]):
    print(f"  {lang}: {count}")

print(f"\n=== Sample non-English titles still in DB ===")
sample_by_lang: dict = {}
for lang, title in non_english:
    sample_by_lang.setdefault(lang, []).append(title)

for lang, titles in sorted(sample_by_lang.items()):
    print(f"\n  [{lang}] ({len(titles)} total)")
    for t in titles[:3]:
        print(f"    → {t}")
