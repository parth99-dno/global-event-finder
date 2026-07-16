import os
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Import our IR/ML modules
from ml.classifier import classify_event
from ir.search_engine import search, find_similar, load_and_index_events
from ir.recommend import get_recommendations
from ir.translate import translate_to_english
from ml.trending import get_trending_topics
from scripts.reclassify_uncategorized import reclassify_uncategorized_events

# Load env variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="Global Event Finder - AI Service",
    description="Microservice handling NLP, TF-IDF, Cosine Similarity, Classification, Recommendations, and Trend Detection.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for Requests
class ClassifyRequest(BaseModel):
    text: str = Field(..., description="The text content to classify into a category")

class SearchRequest(BaseModel):
    query: str = Field(..., description="The search query string")
    top_n: int = Field(10, description="Number of top matching events to return", ge=1, le=100)

class TranslateRequest(BaseModel):
    query: str = Field(..., description="The original query string to translate")
    sourceLang: str = Field(..., description="The source language code (e.g. 'es', 'hi')")

@app.on_event("startup")
def startup_event():
    """Build the initial IR Search matrix on startup."""
    logger.info("FastAPI startup: Indexing events for search...")
    try:
        load_and_index_events()
    except Exception as e:
        logger.error(f"Failed to load search index on startup: {e}")

@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "Hello World from the AI Service (FastAPI)!",
        "features_available": [
            "nlp",
            "tf-idf",
            "cosine-similarity",
            "classification",
            "recommendations",
            "trend-detection"
        ]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-service"
    }

@app.post("/classify")
def handle_classify(payload: ClassifyRequest):
    """Predict category for new text snippet."""
    try:
        category = classify_event(payload.text)
        return {
            "status": "success",
            "category": category
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/translate")
def handle_translate(payload: TranslateRequest):
    """Translate query from sourceLang to English, offline."""
    try:
        translated = translate_to_english(payload.query, payload.sourceLang)
        return {
            "success": True,
            "translatedQuery": translated
        }
    except Exception as e:
        logger.error(f"Translation endpoint error: {e}")
        return {
            "success": False,
            "translatedQuery": payload.query
        }

@app.post("/search")
def handle_search(payload: SearchRequest):
    """Run cosine similarity search over events."""
    try:
        results = search(payload.query, payload.top_n)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/similar/{event_id}")
def handle_similar(event_id: str, top_n: int = Query(5, ge=1, le=50)):
    """Retrieve top_n events similar to the given event_id."""
    try:
        results = find_similar(event_id, top_n)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity lookup failed: {str(e)}")

@app.post("/reindex")
def handle_reindex():
    """Manually trigger a reload of the TF-IDF search index cache from MongoDB."""
    try:
        load_and_index_events()
        return {"status": "success", "message": "Search index successfully reloaded."}
    except Exception as e:
        logger.error(f"Failed to reindex: {e}")
        raise HTTPException(status_code=500, detail=f"Reindex failed: {str(e)}")

@app.get("/trending")
def handle_trending(top_n: int = Query(5, ge=1, le=50)):
    """Retrieve trending topics from the last 7 days."""
    try:
        results = get_trending_topics(top_n)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trending topics fetch failed: {str(e)}")

@app.get("/recommendations/{user_id}")
def handle_recommendations(user_id: str, top_n: int = Query(6, ge=1, le=50)):
    """Retrieve personalized event recommendations for a user."""
    try:
        results = get_recommendations(user_id, top_n)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations fetch failed: {str(e)}")

@app.post("/reclassify")
def handle_reclassify():
    """Trigger the reclassification of uncategorized events."""
    try:
        summary = reclassify_uncategorized_events()
        # Re-build index so newly reclassified items reflect updated categories in search results
        load_and_index_events()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reclassification failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
