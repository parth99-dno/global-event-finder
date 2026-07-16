import os
import sys
import logging
from pymongo import MongoClient, UpdateOne

# Add parent directory to sys.path so we can import from ml.classifier
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.classifier import classify_event

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reclassify")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "global_event_finder"
COLLECTION_NAME = "events"

def reclassify_uncategorized_events():
    """Finds all events with category 'Uncategorized' and updates them with predicted categories."""
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set in environment.")
        return {"status": "error", "message": "MONGODB_URI not configured"}
        
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Query for uncategorized events
    query = {"category": "Uncategorized"}
    uncategorized_events = list(collection.find(query, {"processed_text": 1, "_id": 1}))
    
    total_uncategorized = len(uncategorized_events)
    logger.info(f"Found {total_uncategorized} uncategorized events to process.")
    
    if total_uncategorized == 0:
        logger.info("No uncategorized events found.")
        client.close()
        return {"status": "success", "reclassified_count": 0, "message": "No events needed reclassification"}
        
    bulk_updates = []
    reclassified_count = 0
    
    for event in uncategorized_events:
        event_id = event["_id"]
        processed_text = event.get("processed_text", "")
        
        # If processed_text is empty, classify based on title/description? 
        # But pipeline.py guarantees processed_text is generated.
        predicted_category = classify_event(processed_text)
        
        # Build update operation
        bulk_updates.append(
            UpdateOne({"_id": event_id}, {"$set": {"category": predicted_category}})
        )
        reclassified_count += 1
        
        # Run updates in batches of 100
        if len(bulk_updates) >= 100:
            collection.bulk_write(bulk_updates)
            bulk_updates = []
            
    # Write remaining updates
    if bulk_updates:
        collection.bulk_write(bulk_updates)
        
    logger.info(f"Successfully reclassified {reclassified_count} events.")
    
    # Fetch new category breakdown counts
    logger.info("Fetching new category breakdown...")
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    breakdown = {}
    for group in collection.aggregate(pipeline):
        breakdown[group["_id"]] = group["count"]
        
    client.close()
    return {
        "status": "success",
        "reclassified_count": reclassified_count,
        "new_breakdown": breakdown
    }

if __name__ == "__main__":
    result = reclassify_uncategorized_events()
    print("\n" + "=" * 50)
    print("RECLASSIFICATION SUMMARY")
    print("=" * 50)
    print(f"Reclassified count: {result.get('reclassified_count')}")
    print("\nNew Category Breakdown:")
    for cat, count in result.get("new_breakdown", {}).items():
        print(f"  {cat}: {count}")
    print("=" * 50)
