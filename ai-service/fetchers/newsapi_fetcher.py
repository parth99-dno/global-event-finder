"""
fetchers/newsapi_fetcher.py
Compatible with Python 3.9+.
Pulls articles from NewsAPI /v2/top-headlines and /v2/everything.
Free tier: 100 requests/day max; we stay well within that limit.
Returns a list of raw article dicts matching the Event schema.
"""
import os
import time
import logging
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
NEWSAPI_BASE = "https://newsapi.org/v2"

# NewsAPI → our Event schema category mapping
NEWSAPI_CATEGORY_MAP = {
    "business":    "Economy",
    "technology":  "Technology",
    "sports":      "Sports",
    "health":      "Health",
    "science":     "Science",
    "entertainment": "Uncategorized",
    "general":     "Uncategorized",
}

# Top-headlines: 7 categories × ~5 countries = 35 requests (free tier safe)
TOP_HEADLINES_CATEGORIES = ["business", "technology", "sports", "health", "science"]
TOP_HEADLINES_COUNTRIES = ["us", "gb", "in", "au", "ca"]

# Everything endpoint: broad queries for global coverage (additional ~10 requests)
EVERYTHING_QUERIES = [
    "world politics summit",
    "climate environment",
    "economy global trade",
    "diplomacy international",
    "science discovery",
]


def _parse_newsapi_date(datestr: str) -> datetime:
    if not datestr:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        dt = datetime.fromisoformat(datestr.replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


def _make_article(raw: dict, category: str):
    """Convert a raw NewsAPI article dict into our pipeline's raw article format."""
    title = (raw.get("title") or "").strip()
    url = (raw.get("url") or "").strip()
    if not title or not url or title == "[Removed]" or url == "https://removed.com":
        return None

    source_name = (raw.get("source") or {}).get("name", "")
    description = (raw.get("description") or "").strip()
    published_at = raw.get("publishedAt", "")

    return {
        "title": title,
        "description": description,
        "category": NEWSAPI_CATEGORY_MAP.get(category, "Uncategorized"),
        "country": "",
        "continent": "",
        "date": _parse_newsapi_date(published_at),
        "keywords": [],
        "organizations": [],
        "source": source_name,
        "url": url,
    }


def _get(endpoint: str, params: dict) -> list:
    """Make a NewsAPI request; return articles list or [] on failure."""
    if not NEWSAPI_KEY:
        logger.error("NEWSAPI_KEY not set in environment")
        return []
    params["apiKey"] = NEWSAPI_KEY
    params["pageSize"] = 100
    try:
        resp = requests.get(f"{NEWSAPI_BASE}/{endpoint}", params=params, timeout=15)
        if resp.status_code == 426:
            logger.warning("NewsAPI: upgrade required (free tier limit hit)")
            return []
        resp.raise_for_status()
        data = resp.json()
        return data.get("articles", [])
    except Exception as e:
        logger.warning(f"NewsAPI request failed ({endpoint}, {params}): {e}")
        return []


def fetch_newsapi_articles() -> list:
    """
    Pull articles from both /top-headlines and /everything.
    Returns a flat deduplicated list of raw article dicts.
    """
    all_articles = []
    seen_urls = set()
    request_count = 0

    def add_articles(raws: list[dict], category: str):
        for raw in raws:
            art = _make_article(raw, category)
            if art and art["url"] not in seen_urls:
                seen_urls.add(art["url"])
                all_articles.append(art)

    # --- top-headlines: category × country grid ---
    for category in TOP_HEADLINES_CATEGORIES:
        for country in TOP_HEADLINES_COUNTRIES:
            if request_count >= 90:          # stay 10 under the daily limit
                logger.warning("NewsAPI: approaching daily request limit, stopping early")
                return all_articles
            raws = _get("top-headlines", {"category": category, "country": country})
            add_articles(raws, category)
            request_count += 1
            time.sleep(0.3)                  # be polite

    logger.info(f"After top-headlines: {len(all_articles)} articles, {request_count} requests used")

    # --- everything: broad queries for global coverage ---
    for query in EVERYTHING_QUERIES:
        if request_count >= 90:
            break
        raws = _get("everything", {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
        })
        add_articles(raws, "general")
        request_count += 1
        time.sleep(0.3)

    logger.info(f"NewsAPI: total {len(all_articles)} unique articles in {request_count} requests")
    return all_articles


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    arts = fetch_newsapi_articles()
    print(f"Total NewsAPI articles fetched: {len(arts)}")
    if arts:
        print("Sample:", arts[0])
