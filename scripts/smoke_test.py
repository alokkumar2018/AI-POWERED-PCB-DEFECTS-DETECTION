"""End-to-end smoke test using the real shipped YOLO weights and sample PCB."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402

sample = ROOT / "test_images" / "pcb13.png"
assert sample.is_file(), f"Missing sample: {sample}"

with TestClient(app) as client:
    health = client.get("/health")
    assert health.status_code == 200, health.text
    model_info = client.get("/model-info")
    assert model_info.status_code == 200, model_info.text
    assert len(model_info.json()["classes"]) == 6, model_info.text

    invalid = client.post(
        "/predict", files={"file": ("invalid.png", b"not a PNG", "image/png")}
    )
    assert invalid.status_code == 400, invalid.text

    with sample.open("rb") as image:
        response = client.post(
            "/predict",
            files={"file": (sample.name, image, "image/png")},
        )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert isinstance(data["detections"], list)
    assert data["analysis"]["inspection_id"].startswith("PCB-")
    result_image = client.get(data["result_image_url"])
    assert result_image.status_code == 200, result_image.text
    assert result_image.content[:3] == b"\xff\xd8\xff"
    print("PASS: health, model load, invalid upload, live sample inference, result image")
