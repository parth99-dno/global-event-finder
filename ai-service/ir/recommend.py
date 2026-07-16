import os
import logging
from pymongo import MongoClient
from bson import ObjectId
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

import ir.search_engine as se
from preprocessing.clean_text import clean_for_processing

logger = logging.getLogger("recommend_engine")

def get_recommendations(user_id: str, top_n=6):
    """
    Builds a profile string based on user interests, last 10 search queries,
    and saved events text. Recommends top_n events not already saved.
    """
    if se._vectorizer is None:
        se.load_and_index_events()
        
    if se._vectorizer is None or len(se._event_docs) == 0:
        return []
        
    try:
        user_obj_id = ObjectId(user_id)
    except:
        logger.error(f"Invalid user_id format: {user_id}")
        return []
        
    client = MongoClient(se.MONGODB_URI)
    db = client[se.DB_NAME]
    
    # 1. Fetch User Interests
    user = db['users'].find_one({"_id": user_obj_id})
    interests = user.get("interests", []) if user else []
    
    # 2. Fetch Recent Searches
    searches_cursor = db['searchhistories'].find({"userId": user_obj_id}).sort("timestamp", -1).limit(10)
    searches = [doc.get("query", "") for doc in searches_cursor]
    
    # 3. Fetch Saved Events
    saved_cursor = db['savedevents'].find({"userId": user_obj_id})
    saved_event_ids = [doc.get("eventId") for doc in saved_cursor if doc.get("eventId")]
    
    saved_texts = []
    saved_id_strs = set()
    if saved_event_ids:
        # Fetch the actual events to get text
        events_cursor = db['events'].find({"_id": {"$in": saved_event_ids}})
        for e in events_cursor:
            saved_id_strs.add(str(e["_id"]))
            title = e.get("title", "")
            desc = e.get("description", "")
            if title or desc:
                saved_texts.append(f"{title} {desc}")
                
    client.close()
    
    # Combine profile text
    profile_parts = []
    if interests:
        profile_parts.append(" ".join(interests))
    if searches:
        profile_parts.append(" ".join(searches))
    if saved_texts:
        profile_parts.append(" ".join(saved_texts))
        
    profile_text = " ".join(profile_parts)
    
    # If no profile data, return trending/random or empty
    if not profile_text.strip():
        logger.info(f"User {user_id} has no profile data for recommendations.")
        return []
        
    cleaned_profile = clean_for_processing(profile_text)
    if not cleaned_profile:
        return []
        
    # Vectorize profile
    profile_vec = se._vectorizer.transform([cleaned_profile])
    
    # Compute similarity against all documents
    similarities = cosine_similarity(profile_vec, se._tfidf_matrix).flatten()
    
    # Sort indices descending
    sorted_indices = np.argsort(similarities)[::-1]
    
    results = []
    for idx in sorted_indices:
        doc = se._event_docs[idx]
        doc_id = str(doc["_id"])
        
        # Skip events already saved
        if doc_id in saved_id_strs:
            continue
            
        score = float(similarities[idx])
        if score > 0:
            result_doc = doc.copy()
            result_doc["score"] = score
            results.append(result_doc)
            
        if len(results) >= top_n:
            break
            
    return results
