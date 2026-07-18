import os
import logging
import threading
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
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
import pipeline as pipeline_module

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

# ── Pipeline status (in-memory, reset on service restart) ─────────────────────
_pipeline_lock = threading.Lock()
_pipeline_status = {
    "status": "idle",          # idle | running | error
    "lastRunStart": None,
    "lastRunEnd": None,
    "lastRunSuccess": False,
    "detail": ""
}


def _run_pipeline_in_background():
    """
    Run the full pipeline synchronously inside a FastAPI BackgroundTask thread.
    Returns immediately to the caller so Render's 30-second timeout is never hit.
    """
    import datetime

    with _pipeline_lock:
        _pipeline_status["status"] = "running"
        _pipeline_status["lastRunStart"] = datetime.datetime.utcnow().isoformat()
        _pipeline_status["detail"] = ""

    try:
        logger.info("=== BACKGROUND PIPELINE STARTED ===")

        # Step 1: fetch + NLP clean + insert new events into MongoDB
        pipeline_module.run()
        logger.info("pipeline.run() completed")

        # Step 2: reclassify any events still marked 'Uncategorized' (non-fatal)
        try:
            reclassify_uncategorized_events()
            logger.info("reclassify_uncategorized_events() completed")
        except Exception as e:
            logger.warning(f"Reclassification step failed (non-fatal): {e}")

        # Step 3: rebuild TF-IDF search index in memory
        load_and_index_events()
        logger.info("Search index rebuilt")

        with _pipeline_lock:
            _pipeline_status["status"] = "idle"
            _pipeline_status["lastRunEnd"] = datetime.datetime.utcnow().isoformat()
            _pipeline_status["lastRunSuccess"] = True
            _pipeline_status["detail"] = "Completed successfully"
        logger.info("=== BACKGROUND PIPELINE COMPLETED ===")

    except Exception as e:
        import datetime as dt
        logger.error(f"=== BACKGROUND PIPELINE FAILED: {e} ===")
        with _pipeline_lock:
            _pipeline_status["status"] = "error"
            _pipeline_status["lastRunEnd"] = dt.datetime.utcnow().isoformat()
            _pipeline_status["lastRunSuccess"] = False
            _pipeline_status["detail"] = str(e)


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    text: str = Field(..., description="The text content to classify into a category")

class SearchRequest(BaseModel):
    query: str = Field(..., description="The search query string")
    top_n: int = Field(10, description="Number of top matching events to return", ge=1, le=100)

class TranslateRequest(BaseModel):
    query: str = Field(..., description="The original query string to translate")
    sourceLang: str = Field(..., description="The source language code (e.g. 'es', 'hi')")


# ── Lifecycle ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    """Build the initial IR Search matrix on startup."""
    logger.info("FastAPI startup: Indexing events for search...")
    try:
        load_and_index_events()
    except Exception as e:
        logger.error(f"Failed to load search index on startup: {e}")


# ── Info routes ────────────────────────────────────────────────────────────────

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


# ── Pipeline endpoints ─────────────────────────────────────────────────────────

@app.post("/run-pipeline")
def run_pipeline_endpoint(background_tasks: BackgroundTasks):
    """
    Trigger the full data pipeline (fetch → NLP → insert → reindex) in the
    background. Returns immediately so Render's 30-second request timeout is
    never hit. Poll /pipeline-status to track progress.
    """
    with _pipeline_lock:
        if _pipeline_status["status"] == "running":
            return {"status": "running", "message": "Pipeline is already running."}

    background_tasks.add_task(_run_pipeline_in_background)
    return {"status": "started", "message": "Pipeline started in the background."}

@app.get("/pipeline-status")
def pipeline_status_endpoint():
    """Return the current pipeline run status."""
    return dict(_pipeline_status)


# ── AI routes ──────────────────────────────────────────────────────────────────

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
