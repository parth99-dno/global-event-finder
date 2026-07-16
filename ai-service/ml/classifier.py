import os
import sys
import logging
from pymongo import MongoClient
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("classifier")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "global_event_finder"
COLLECTION_NAME = "events"

# Define directories for saving the models
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
CLASSIFIER_PATH = os.path.join(MODEL_DIR, "classifier.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.joblib")

# Ensure model directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

def load_training_data():
    """Load all events from MongoDB that are categorized (not 'Uncategorized')."""
    if not MONGODB_URI:
        logger.error("MONGODB_URI is not set in environment.")
        return [], []
        
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Exclude 'Uncategorized' and empty strings, and ensure processed_text exists
    query = {
        "category": {"$exists": True, "$ne": "Uncategorized", "$not": {"$regex": "^\\s*$"}},
        "processed_text": {"$exists": True, "$ne": ""}
    }
    
    cursor = collection.find(query, {"processed_text": 1, "category": 1, "_id": 0})
    texts = []
    labels = []
    
    for doc in cursor:
        texts.append(doc.get("processed_text", ""))
        labels.append(doc.get("category", ""))
        
    client.close()
    return texts, labels

def train_classifier():
    """Train the TF-IDF Vectorizer and Logistic Regression classifier and save them."""
    logger.info("Loading training data from MongoDB...")
    texts, labels = load_training_data()
    
    if not texts:
        logger.error("No training data found in MongoDB. Seed the database first.")
        return
        
    logger.info(f"Loaded {len(texts)} training samples.")
    
    # Split into 80% train / 20% test
    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)
    
    logger.info("Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    logger.info("Training Logistic Regression classifier...")
    # Using liblinear and balanced class weights due to potential class imbalance
    classifier = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=42)
    classifier.fit(X_train_vec, y_train)
    
    # Predict on test set
    predictions = classifier.predict(X_test_vec)
    accuracy = accuracy_score(y_test, predictions)
    
    logger.info("=" * 50)
    logger.info(f"Model Accuracy: {accuracy:.4f}")
    logger.info("=" * 50)
    logger.info("\nClassification Report:\n" + classification_report(y_test, predictions, zero_division=0))
    logger.info("=" * 50)
    
    # Save model and vectorizer
    logger.info(f"Saving models to {MODEL_DIR}...")
    joblib.dump(classifier, CLASSIFIER_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    logger.info("Models saved successfully.")

# Global references for loaded model/vectorizer
_classifier = None
_vectorizer = None

def load_saved_models():
    """Load model and vectorizer from disk into memory if not already loaded."""
    global _classifier, _vectorizer
    if _classifier is None or _vectorizer is None:
        if not os.path.exists(CLASSIFIER_PATH) or not os.path.exists(VECTORIZER_PATH):
            logger.info("Saved models not found. Running training script first...")
            train_classifier()
        
        _classifier = joblib.load(CLASSIFIER_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)

def classify_event(text: str) -> str:
    """Predict the category of a given text snippet."""
    if not text or not text.strip():
        return "Uncategorized"
        
    try:
        load_saved_models()
        # Transform text
        vec_text = _vectorizer.transform([text])
        prediction = _classifier.predict(vec_text)[0]
        return prediction
    except Exception as e:
        logger.error(f"Error during event classification: {e}")
        return "Uncategorized"

if __name__ == "__main__":
    train_classifier()
