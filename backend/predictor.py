"""YOLOv8 inference for the six-class DeepPCB model shipped with this project."""
import os
from functools import lru_cache
from pathlib import Path
from threading import Lock
from uuid import uuid4

import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
_inference_lock = Lock()

try:
    CONFIDENCE_THRESHOLD = float(os.getenv("MODEL_CONFIDENCE", "0.25"))
except ValueError as exc:
    raise RuntimeError("MODEL_CONFIDENCE must be a number between 0 and 1") from exc
if not 0 < CONFIDENCE_THRESHOLD <= 1:
    raise RuntimeError("MODEL_CONFIDENCE must be between 0 and 1")


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Model weights missing: {MODEL_PATH}. Restore backend/models/best.pt"
        )
    return YOLO(str(MODEL_PATH))


def is_model_loaded():
    return load_model.cache_info().currsize > 0


def get_model_info():
    model = load_model()
    return {
        "model": "YOLOv8",
        "classes": model.names,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }


def predict_image(image_path: str):
    model = load_model()
    # Ultralytics model.predict is not guaranteed to be safe on shared model instances.
    with _inference_lock:
        predictions = model.predict(
            source=image_path,
            conf=CONFIDENCE_THRESHOLD,
            save=False,
            verbose=False,
        )
        if not predictions:
            raise RuntimeError("Model returned no prediction output")
        result = predictions[0]
        annotated_image = result.plot()
        detections = []
        for box in result.boxes:
            class_id = int(box.cls[0])
            x1, y1, x2, y2 = (int(value) for value in box.xyxy[0])
            detections.append({
                "type": model.names[class_id],
                "confidence": round(float(box.conf[0]), 4),
                "bbox": [x1, y1, x2, y2],
            })

    result_path = RESULTS_DIR / f"pcb_{uuid4().hex}_result.jpg"
    if not cv2.imwrite(str(result_path), annotated_image):
        raise RuntimeError("Could not save the annotated inspection image")
    return {"detections": detections, "result_image": result_path}
