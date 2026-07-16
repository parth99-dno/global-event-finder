from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("ai-service/.env")
MONGODB_URI = os.getenv("MONGODB_URI", "")
client = MongoClient(MONGODB_URI)
db = client["global_event_finder"]
collection = db["events"]

# Find all events that don't have original_title (meaning they weren't translated)
# but we can try to run langdetect on them to see what it outputs.
from langdetect import detect, DetectorFactory
DetectorFactory.seed = 0

for doc in collection.find({"original_title": {"$exists": False}}):
    title = doc.get("title", "")
    desc = doc.get("description", "")
    combined = f"{title} {desc}"
    if not combined.strip(): continue
    try:
        lang = detect(combined)
        if lang == 'tr':
            print(f"FOUND Turkish missed: {title}")
    except:
        pass
