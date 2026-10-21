"""HTTP API for PCB defect detection."""
import io
import logging
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from predictor import (
    CONFIDENCE_THRESHOLD,
    MODEL_PATH,
    RESULTS_DIR,
    get_model_info,
    is_model_loaded,
    predict_image,
)
from services.analysis import generate_analysis

logger = logging.getLogger(__name__)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
SUPPORTED_FORMATS = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG"}
DEFAULT_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://ai-powered-pcb-defects-detection.vercel.app"
)
origins = [
    value.strip()
    for value in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    if value.strip()
]

RESULTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="AI-Powered PCB Defect Detection API",
    description="YOLOv8 inspection of PCB images (six DeepPCB defect classes)",
    version="1.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")


@app.get("/")
def home():
    return {"message": "PCB Defect Detection API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    if not MODEL_PATH.is_file():
        raise HTTPException(status_code=503, detail="Trained model weights not available")
    return {
        "status": "healthy",
        "model_available": True,
        "model_loaded": is_model_loaded(),
        "version": app.version,
    }


@app.get("/model-info")
def model_info():
    try:
        return get_model_info()
    except Exception:
        logger.exception("Could not load model information")
        raise HTTPException(status_code=503, detail="AI model is currently unavailable")


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Upload a JPG, JPEG, or PNG image")

    # Read at most the configured limit (+1 byte) to prevent oversized uploads.
    try:
        content = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()
    if not content:
        raise HTTPException(status_code=400, detail="Image is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")

    try:
        with Image.open(io.BytesIO(content)) as image:
            image_format = image.format
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("Image resolution exceeds the 24 megapixel limit")
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="Invalid image or unsupported resolution")
    if image_format != SUPPORTED_FORMATS[ext]:
        raise HTTPException(status_code=400, detail="Image content does not match its extension")
    if not MODEL_PATH.is_file():
        raise HTTPException(status_code=503, detail="AI model weights are missing")

    temporary_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=ext) as temporary:
            temporary.write(content)
            temporary_path = Path(temporary.name)
        result = await run_in_threadpool(predict_image, str(temporary_path))
        analysis = generate_analysis(result["detections"], filename, CONFIDENCE_THRESHOLD)
    except Exception:
        logger.exception("PCB prediction failed")
        raise HTTPException(status_code=503, detail="Prediction unavailable. Check server logs.")
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)

    return {
        "status": "success",
        "filename": filename,
        "total_detections": len(result["detections"]),
        "detections": result["detections"],
        # Relative to the API origin; independent of proxy/HTTPS headers.
        "result_image_url": f"/results/{result['result_image'].name}",
        "analysis": analysis,
    }
