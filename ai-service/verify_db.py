"""Verification script — queries MongoDB and prints stats + sample docs."""
import os
from dotenv import load_dotenv
import pymongo

load_dotenv()
client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
col = client["global_event_finder"]["events"]

total = col.count_documents({})
print(f"Total documents in events collection: {total}\n")

print("--- Category breakdown ---")
pipeline = [
    {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
for r in col.aggregate(pipeline):
    print(f"  {r['_id'] or 'Uncategorized'}: {r['count']}")

print("\n--- 3 sample documents (with processed_text + NER fields) ---")
docs = list(
    col.find({"processed_text": {"$exists": True, "$ne": ""}})
       .sort("createdAt", -1)
       .limit(3)
)
for i, doc in enumerate(docs, 1):
    print(f"\n{'='*60}")
    print(f"  Sample #{i}")
    print(f"{'='*60}")
    print(f"  Title        : {doc.get('title', '')}")
    print(f"  Source       : {doc.get('source', '')}")
    print(f"  Category     : {doc.get('category', '')}")
    print(f"  Date         : {doc.get('date', '')}")
    print(f"  URL          : {str(doc.get('url', ''))[:80]}")
    desc = (doc.get("description") or "")[:140]
    print(f"  Description  : {desc}")
    pt = doc.get("processed_text", "")[:160]
    print(f"  processed_text: {pt}...")
    print(f"  organizations : {doc.get('organizations', [])}")
    print(f"  keywords      : {doc.get('keywords', [])}")

print("\n" + "="*60)
print("Verification complete.")
