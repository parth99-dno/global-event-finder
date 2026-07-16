import os
import sys
import logging
from pymongo import MongoClient
from bson import ObjectId
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Import preprocessing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.clean_text import clean_for_processing

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("search_engine")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "global_event_finder"
COLLECTION_NAME = "events"

# Globals for caching the search index in memory
_vectorizer = None
_tfidf_matrix = None
_event_docs = []      # List of full event dicts mapped to matrix rows
_event_id_to_idx = {} # Map from ObjectId string to matrix index

def load_and_index_events():
    """Loads all events from MongoDB and fits a TF-IDF vectorizer over them."""
    global _vectorizer, _tfidf_matrix, _event_docs, _event_id_to_idx
    
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set in environment.")
        return
        
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    logger.info("Loading all events from database for IR indexing...")
    # Fetch all events with processed_text
    cursor = collection.find({"processed_text": {"$exists": True, "$ne": ""}})
    
    _event_docs = []
    texts = []
    
    for doc in cursor:
        # Convert _id to string for JSON serialization compatibility
        doc["_id"] = str(doc["_id"])
        if doc.get("date"):
            # Format date to ISO string for JSON serialization
            doc["date"] = doc["date"].isoformat()
        if doc.get("createdAt"):
            doc["createdAt"] = doc["createdAt"].isoformat()
            
        _event_docs.append(doc)
        texts.append(doc.get("processed_text", ""))
        
    client.close()
    
    if not texts:
        logger.warning("No events found to index.")
        _vectorizer = None
        _tfidf_matrix = None
        _event_id_to_idx = {}
        return
        
    logger.info(f"Indexing {len(texts)} events using TF-IDF...")
    _vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1, 2))
    _tfidf_matrix = _vectorizer.fit_transform(texts)
    
    # Map event ID to row index
    _event_id_to_idx = {doc["_id"]: idx for idx, doc in enumerate(_event_docs)}
    logger.info("IR indexing complete.")

def search(query: str, top_n=10):
    """
    Cleans query, transforms using the fitted vectorizer, computes cosine similarity,
    and returns top_n events.
    """
    # Load index if not loaded
    if _vectorizer is None:
        load_and_index_events()
        
    if _vectorizer is None or len(_event_docs) == 0:
        return []
        
    # Apply NLP cleaning pipeline to the query
    cleaned_query = clean_for_processing(query)
    if not cleaned_query:
        # If query is empty or contains only stopwords, return empty results
        return []
        
    # Vectorize query
    query_vec = _vectorizer.transform([cleaned_query])
    
    # Compute similarity between query vector and all document vectors
    similarities = cosine_similarity(query_vec, _tfidf_matrix).flatten()
    
    # Get top_n indices sorted by score descending
    top_indices = np.argsort(similarities)[::-1][:top_n]
    
    results = []
    for idx in top_indices:
        score = float(similarities[idx])
        # Only return events with similarity > 0 to filter out completely irrelevant ones
        if score > 0:
            doc = _event_docs[idx].copy()
            doc["score"] = score
            results.append(doc)
            
    return results

def find_similar(event_id: str, top_n=5):
    """
    Finds top_n most similar events to a given event ID using cosine similarity on their TF-IDF vectors.
    """
    if _vectorizer is None:
        load_and_index_events()
        
    if _vectorizer is None or len(_event_docs) == 0:
        return []
        
    if event_id not in _event_id_to_idx:
        logger.warning(f"Event ID {event_id} not found in search index.")
        return []
        
    target_idx = _event_id_to_idx[event_id]
    target_vec = _tfidf_matrix[target_idx]
    
    # Compute similarity against all documents
    similarities = cosine_similarity(target_vec, _tfidf_matrix).flatten()
    
    # Sort indices descending
    sorted_indices = np.argsort(similarities)[::-1]
    
    results = []
    for idx in sorted_indices:
        # Skip itself
        if idx == target_idx:
            continue
            
        score = float(similarities[idx])
        # Only include if there is some overlap
        if score > 0:
            doc = _event_docs[idx].copy()
            doc["score"] = score
            results.append(doc)
            
        if len(results) >= top_n:
            break
            
    return results
