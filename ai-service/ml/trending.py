import os
import logging
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from collections import Counter

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trending")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "global_event_finder"
COLLECTION_NAME = "events"

def get_trending_topics(top_n=5):
    """
    Looks at events published in the last 7 days (using the 'date' field)
    and extracts the most frequent keywords and categories.
    """
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set in environment.")
        return []
        
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Calculate time window: last 7 days from current time (2026-07-06)
    # We strip timezone if any, or use datetime.utcnow()
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    # Query events in the 7-day window
    query = {
        "date": {"$gte": seven_days_ago}
    }
    
    logger.info(f"Fetching events from the last 7 days (since {seven_days_ago.isoformat()})...")
    cursor = collection.find(query, {"keywords": 1, "category": 1, "organizations": 1, "_id": 0})
    
    topic_counter = Counter()
    total_events = 0
    
    for doc in cursor:
        total_events += 1
        
        # 1. Add category
        category = doc.get("category")
        if category and category != "Uncategorized":
            # Add with tag/suffix to distinguish or just add raw
            topic_counter[category] += 1
            
        # 2. Add keywords (GPE, LOC, PERSON entities)
        keywords = doc.get("keywords") or []
        for kw in keywords:
            if kw and len(kw) > 1:
                topic_counter[kw] += 1
                
        # 3. Add organizations
        orgs = doc.get("organizations") or []
        for org in orgs:
            if org and len(org) > 1:
                topic_counter[org] += 1
                
    client.close()
    
    logger.info(f"Processed {total_events} events. Found {len(topic_counter)} unique topics.")
    
    # Get top_n most common topics
    most_common = topic_counter.most_common(top_n)
    
    trending = []
    for topic, count in most_common:
        trending.append({
            "topic": topic,
            "count": count
        })
        
    return trending

if __name__ == "__main__":
    topics = get_trending_topics(10)
    print("\n" + "=" * 50)
    print("TRENDING TOPICS (LAST 7 DAYS)")
    print("=" * 50)
    for idx, item in enumerate(topics, 1):
        print(f"{idx}. {item['topic']} (count: {item['count']})")
    print("=" * 50)
