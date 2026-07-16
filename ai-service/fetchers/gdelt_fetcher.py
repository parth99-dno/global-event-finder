"""
fetchers/gdelt_fetcher.py
Pulls recent global-news articles from the GDELT 2.0 DOC API (no key required).
Returns a list of raw article dicts ready for the cleaning pipeline.
"""
import requests
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# GDELT DOC 2.0 API – ArtList mode returns up to 250 articles per query.
GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc"

# Broad topic queries that together sample global events across domains.
GDELT_QUERIES = [
    "politics world summit",
    "economy trade finance",
    "technology innovation science",
    "health pandemic disease",
    "environment climate energy",
    "sports championship tournament",
    "diplomacy international relations",
    "conflict war military",
]

# Map rough theme keywords to our Event schema categories.
CATEGORY_HINTS = {
    "politics": "Politics",
    "summit": "Politics",
    "diplomacy": "Diplomacy",
    "international": "Diplomacy",
    "economy": "Economy",
    "trade": "Economy",
    "finance": "Economy",
    "technology": "Technology",
    "innovation": "Technology",
    "science": "Science",
    "health": "Health",
    "pandemic": "Health",
    "disease": "Health",
    "environment": "Environment",
    "climate": "Environment",
    "energy": "Environment",
    "sports": "Sports",
    "championship": "Sports",
    "conflict": "Politics",
    "war": "Politics",
    "military": "Politics",
}


def _guess_category(query: str, title: str) -> str:
    combined = (query + " " + (title or "")).lower()
    for keyword, cat in CATEGORY_HINTS.items():
        if keyword in combined:
            return cat
    return "Uncategorized"


def _parse_gdelt_date(datestr: str):
    """Convert GDELT seendate '20240101T120000Z' → datetime."""
    if not datestr:
        return datetime.utcnow()
    try:
        # GDELT format: YYYYMMDDTHHMMSSZ
        clean = datestr.replace("Z", "").replace("T", "")
        return datetime.strptime(clean, "%Y%m%d%H%M%S")
    except Exception:
        try:
            return datetime.strptime(datestr[:8], "%Y%m%d")
        except Exception:
            return datetime.utcnow()


def fetch_gdelt_articles() -> list:
    """
    Query GDELT DOC API for each topic and return a flat list of raw articles.
    Each article dict has the same field names we'll store in MongoDB.
    """
    all_articles = []
    seen_urls = set()

    for query in GDELT_QUERIES:
        params = {
            "query": query,
            "mode": "ArtList",
            "maxrecords": 250,        # max the free API allows per call
            "timespan": "4weeks",     # last 4 weeks of coverage
            "sort": "DateDesc",
            "format": "json",
        }
        try:
            resp = requests.get(GDELT_BASE, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning(f"GDELT query '{query}' failed: {e}")
            time.sleep(1)
            continue

        articles = data.get("articles") or []
        for art in articles:
            url = art.get("url", "").strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            title = art.get("title", "").strip()
            raw_date = art.get("seendate", "")
            domain = art.get("domain", "").strip()

            # GDELT may return socialimage and language; extract source from domain
            article_dict = {
                "title": title,
                "description": "",          # GDELT ArtList has no body text
                "category": _guess_category(query, title),
                "country": "",
                "continent": "",
                "date": _parse_gdelt_date(raw_date),
                "keywords": [],
                "organizations": [],
                "source": domain,
                "url": url,
            }
            all_articles.append(article_dict)

        # Respect GDELT's informal rate-limit – 1 request per second
        time.sleep(1.1)

    logger.info(f"GDELT: fetched {len(all_articles)} unique articles")
    return all_articles


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    arts = fetch_gdelt_articles()
    print(f"Total GDELT articles fetched: {len(arts)}")
    if arts:
        print("Sample:", arts[0])
