"""
pipeline.py

Main orchestrator for the Global Event Finder data pipeline.
Run with:  python pipeline.py

Workflow:
  1. Fetch articles from GDELT and NewsAPI
  2. Deduplicate by URL against existing MongoDB docs
  3. Run NLP cleaning + NER on each new article
  4. Insert cleaned documents into the 'events' collection
  5. Print a summary
"""

import os
import sys
import logging
from datetime import datetime, timezone

import pymongo
from dotenv import load_dotenv

from fetchers.gdelt_fetcher import fetch_gdelt_articles
from fetchers.newsapi_fetcher import fetch_newsapi_articles
from preprocessing.clean_text import process_article
from ir.translate import UnsupportedLanguageException

# ── Setup ─────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pipeline")

MONGODB_URI  = os.getenv("MONGODB_URI", "")
DB_NAME      = "global_event_finder"
COLLECTION   = "events"

# Valid categories from the Event schema (keep in sync with backend/models/Event.js)
VALID_CATEGORIES = {
    "Politics", "Economy", "Technology", "Sports",
    "Environment", "Health", "Science", "Diplomacy",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_collection():
    """Return a connected pymongo Collection."""
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set. Check your .env file.")
        sys.exit(1)
    client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10_000)
    # Quick connectivity check
    client.admin.command("ping")
    logger.info("MongoDB: connected successfully")
    return client[DB_NAME][COLLECTION]


def get_existing_urls(collection) -> set[str]:
    """Fetch all URLs already stored in the collection for deduplication."""
    cursor = collection.find({}, {"url": 1, "_id": 0})
    return {doc["url"] for doc in cursor if doc.get("url")}


def sanitise_category(raw: str) -> str:
    """Return a valid category string, falling back to 'Uncategorized'."""
    if raw in VALID_CATEGORIES:
        return raw
    # Try a case-insensitive match
    for cat in VALID_CATEGORIES:
        if cat.lower() == (raw or "").lower():
            return cat
    return "Uncategorized"


def build_mongo_doc(article: dict) -> dict:
    """
    Convert a cleaned pipeline article dict into the final MongoDB document
    matching the Event Mongoose schema exactly.
    """
    # Ensure date is a datetime object
    date_val = article.get("date")
    if not isinstance(date_val, datetime):
        date_val = datetime.utcnow()

    doc = {
        "title":          (article.get("title") or "").strip(),
        "description":    (article.get("description") or "").strip(),
        "processed_text": article.get("processed_text", ""),
        "category":       sanitise_category(article.get("category", "")),
        "country":        (article.get("country") or "").strip(),
        "continent":      (article.get("continent") or "").strip(),
        "date":           date_val,
        "keywords":       article.get("keywords", []),
        "organizations":  article.get("organizations", []),
        "source":         (article.get("source") or "").strip(),
        "url":            (article.get("url") or "").strip(),
        "createdAt":      datetime.utcnow(),
    }
    
    if "original_title" in article:
        doc["original_title"] = article["original_title"]
        
    return doc


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run():
    print("\n" + "=" * 60)
    print("  Global Event Finder — Data Pipeline")
    print("=" * 60)

    # ── 1. Connect ────────────────────────────────────────────────
    collection = get_collection()

    # ── 2. Fetch ──────────────────────────────────────────────────
    print("\n[Step 1/4] Fetching articles…")

    logger.info("Starting GDELT fetch…")
    gdelt_articles   = fetch_gdelt_articles()
    logger.info(f"GDELT returned {len(gdelt_articles)} articles")

    logger.info("Starting NewsAPI fetch…")
    newsapi_articles = fetch_newsapi_articles()
    logger.info(f"NewsAPI returned {len(newsapi_articles)} articles")

    all_fetched = gdelt_articles + newsapi_articles
    total_fetched = len(all_fetched)
    print(f"  GDELT:   {len(gdelt_articles)} articles")
    print(f"  NewsAPI: {len(newsapi_articles)} articles")
    print(f"  Total:   {total_fetched} articles fetched")

    # ── 3. Deduplicate ────────────────────────────────────────────
    print("\n[Step 2/4] Deduplicating against existing DB records…")
    existing_urls = get_existing_urls(collection)
    print(f"  Existing URLs in DB: {len(existing_urls)}")

    new_articles = [
        a for a in all_fetched
        if a.get("url") and a["url"] not in existing_urls
    ]
    # Also deduplicate within this batch (GDELT + NewsAPI might overlap)
    seen_in_batch: set[str] = set()
    unique_new = []
    for a in new_articles:
        if a["url"] not in seen_in_batch:
            seen_in_batch.add(a["url"])
            unique_new.append(a)

    skipped = total_fetched - len(unique_new)
    print(f"  Skipped (duplicates): {skipped}")
    print(f"  New articles to process: {len(unique_new)}")

    if not unique_new:
        print("\n  No new articles to insert. Pipeline complete.")
        _print_summary(total_fetched, skipped, 0)
        return

    # ── 4. Clean & NER ────────────────────────────────────────────
    print("\n[Step 3/4] Running NLP cleaning pipeline…")
    cleaned = []
    translated_count = 0
    skipped_unsupported_language_count = 0
    
    for i, article in enumerate(unique_new, 1):
        try:
            processed = process_article(article)
            if processed:
                if processed.get("was_translated"):
                    translated_count += 1
                # clean up the temporary flag before passing to mongo build
                processed.pop("was_translated", None)
                cleaned.append(processed)
        except UnsupportedLanguageException as e:
            skipped_unsupported_language_count += 1
            logger.debug(f"Article {i} skipped: {e}")
        except Exception as e:
            logger.warning(f"Article {i} cleaning failed: {e}")
        if i % 50 == 0:
            print(f"  Processed {i}/{len(unique_new)}…")

    print(f"  Cleaned {len(cleaned)} articles")

    # ── 5. Insert ─────────────────────────────────────────────────
    print("\n[Step 4/4] Inserting into MongoDB…")
    docs = [build_mongo_doc(a) for a in cleaned]

    inserted_count = 0
    failed_count   = 0
    # Insert in batches of 100 to avoid large single requests
    BATCH = 100
    for start in range(0, len(docs), BATCH):
        batch = docs[start:start + BATCH]
        try:
            result = collection.insert_many(batch, ordered=False)
            inserted_count += len(result.inserted_ids)
        except pymongo.errors.BulkWriteError as bwe:
            inserted_count += bwe.details.get("nInserted", 0)
            failed_count   += len(bwe.details.get("writeErrors", []))
        except Exception as e:
            logger.error(f"Batch insert failed: {e}")
            failed_count += len(batch)

    _print_summary(total_fetched, skipped, inserted_count, translated_count, skipped_unsupported_language_count, failed_count)


def _print_summary(fetched, skipped, inserted, translated=0, skipped_unsupported=0, failed=0):
    print("\n" + "=" * 60)
    print("  PIPELINE SUMMARY")
    print("=" * 60)
    print(f"  Articles fetched (GDELT + NewsAPI) : {fetched}")
    print(f"  Skipped (duplicates / no URL)      : {skipped}")
    print(f"  Translated (non-English → English) : {translated}")
    print(f"  Skipped (unsupported language)     : {skipped_unsupported}")
    print(f"  New articles inserted              : {inserted}")
    if failed:
        print(f"  Failed insertions                   : {failed}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run()
