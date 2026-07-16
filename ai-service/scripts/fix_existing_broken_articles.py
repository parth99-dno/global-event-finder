import os
import sys
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# Ensure the parent directory is in path to import properly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing.clean_text import process_article
from ir.translate import UnsupportedLanguageException

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fix_articles")

MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = "global_event_finder"
COLLECTION = "events"

def run():
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set. Check your .env file.")
        sys.exit(1)
        
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION]
    
    # We will iterate over all articles.
    # Articles with empty processed_text or we can just try passing them through process_article
    # Actually, we can fetch articles where processed_text is very short or empty, or just check all of them.
    # To be safe and since the dataset isn't massive yet, let's look for docs where processed_text length < 20
    # Wait, GDELT titles can be short. Let's just fetch everything and check if detect() says it's not 'en'.
    # To avoid wasting time detecting everything, let's just do it for docs that don't have 'was_translated' (which isn't stored) but maybe don't have 'original_title'.
    
    cursor = collection.find({"original_title": {"$exists": False}})
    docs = list(cursor)
    
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    logger.info(f"Checking {len(docs)} documents for non-English content...")
    
    for i, doc in enumerate(docs, 1):
        try:
            # We convert it back to a standard dict that process_article expects
            # (which is just a dict with title and description)
            article_input = {
                "title": doc.get("title", ""),
                "description": doc.get("description", ""),
                "organizations": doc.get("organizations", []),
                "keywords": doc.get("keywords", [])
            }
            
            processed = process_article(article_input)
            
            # If process_article successfully translated it, it will have 'was_translated': True
            if processed and processed.get("was_translated"):
                # Update the document in MongoDB
                update_fields = {
                    "title": processed["title"],
                    "description": processed["description"],
                    "processed_text": processed["processed_text"],
                    "organizations": processed["organizations"],
                    "keywords": processed["keywords"],
                    "original_title": processed["original_title"]
                }
                
                collection.update_one({"_id": doc["_id"]}, {"$set": update_fields})
                fixed_count += 1
                logger.info(f"Fixed: {doc.get('title')} -> {processed['title']}")
                
        except UnsupportedLanguageException as e:
            # It's an unsupported language, so we should probably delete it or leave it.
            # The prompt says "instead of deleting them, updating each document in place"
            # But if it's unsupported, we can't translate it. We'll just leave it.
            skipped_count += 1
        except Exception as e:
            error_count += 1
            logger.warning(f"Error processing document {doc['_id']}: {e}")
            
        if i % 100 == 0:
            logger.info(f"Processed {i}/{len(docs)}...")
            
    logger.info("===")
    logger.info(f"Total checked: {len(docs)}")
    logger.info(f"Total fixed (translated): {fixed_count}")
    logger.info(f"Total skipped (unsupported lang): {skipped_count}")
    logger.info(f"Total errors: {error_count}")
    logger.info("===")

if __name__ == "__main__":
    run()
