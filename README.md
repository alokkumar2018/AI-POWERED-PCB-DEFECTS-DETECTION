# CircuitSentinel — AI-Powered PCB Defect Detection

Full-stack PCB image inspection using **React + Vite**, **FastAPI**, and a **YOLOv8** object detector.

- **Frontend:** https://ai-powered-pcb-defects-detection.vercel.app
- **API (configured host):** https://ai-powered-pcb-defects-detection-production.up.railway.app
- **API docs (when backend is online):** https://ai-powered-pcb-defects-detection-production.up.railway.app/docs

**Note:** The frontend and backend are separate deployments. Merging source code does not by itself guarantee that either host redeploys successfully.

## Features

- Upload JPG/PNG images (maximum **10 MB** and **24 megapixels**).
- Take a PCB photo with a webcam (HTTPS or localhost required for camera access).
- Load built-in **test images from this repository** directly in the dashboard.
- Detect and localize six PCB manufacturing defect classes with the checked-in model at `backend/models/best.pt`.
- Inspect predicted bounding boxes, confidence scores, and per-class counts.
- Download an annotated result image or a multi-page PDF inspection report.
- View backend connection status, useful error messages, health endpoint and interactive FastAPI docs.
- Automated Python checks, frontend production build and a model-backed smoke-test workflow.

### Supported detection classes

`open`, `short`, `mouse_bite`, `spur`, `spurious_copper`, `missing_hole`.

Class spelling follows the **existing model and `data.yaml`**, not necessarily every source dataset's labels. Confirm the labels in `GET /model-info` and test on known samples before any retraining or class renaming.

## Project layout

```text
backend/
  app.py              # FastAPI routes, validation, reports
  predictor.py        # lazy YOLOv8 loader, inference
  models/best.pt      # deployed trained model
  services/analysis.py
  requirements.txt
  tests/
frontend/
  src/                # React inspection dashboard
  .env.example
test_images/           # demo images; linked from the dashboard
evaluation/            # existing model evaluation figures
scripts/smoke_test.py  # end-to-end API smoke test
data.yaml              # training format reference (dataset not included)
Dockerfile             # deployment (repository root)
railway.json           # Railway container build settings
.github/workflows/ci.yml
```

## Run locally

Requirements: **Python 3.11**, Node.js **24**, Git, and enough disk space for PyTorch and the model.

```bash
git clone https://github.com/alokkumar2018/AI-POWERED-PCB-DEFECTS-DETECTION.git
cd AI-POWERED-PCB-DEFECTS-DETECTION
```

Terminal 1 — backend:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend, starting from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The local dashboard talks to **http://localhost:8000** by default. For a non-default API URL, create `frontend/.env.local` containing:

```env
VITE_API_URL=http://localhost:8000
```

The API is documented at **http://localhost:8000/docs**. Check **http://localhost:8000/health** for model availability and **http://localhost:8000/model-info** to confirm class mapping.

## Deployment

### Backend — Railway or another Docker host

1. Connect this GitHub repository to a new backend service.
2. Set **repository root as the build context** and use the root **Dockerfile**. The Dockerfile copies `backend/models/best.pt`.
3. Ensure sufficient RAM/disk for Python + PyTorch + the YOLO model.
4. Configure the public service URL; Railway supplies `PORT`. The server listens on `0.0.0.0:${PORT}`.
5. Set **CORS_ORIGINS** to a comma-separated list of allowed frontend URLs (default already permits the published Vercel site and localhost). Optionally set **MODEL_CONFIDENCE=0.25** (valid range: greater than 0 through 1).
6. Verify `/health`, `/model-info`, and POST `/predict` using an actual sample image.

### Frontend — Vercel

1. Import this repository with **Root Directory = frontend**.
2. Build command: `npm run build`; output directory: `dist`.
3. Add `VITE_API_URL=https://YOUR-REAL-BACKEND-HOST` in Vercel project environment variables.
4. Deploy, then test a file upload, annotation view and PDF download. Changing a `VITE_` variable requires a new frontend build.

For long-term hosting, place authenticated inspection history and image storage in a suitable database/object store. **This version does not provide authentication or durable private storage.** Result images have difficult-to-guess URLs but are not access-controlled.

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | API links |
| `/health` | GET | Availability of model weights |
| `/model-info` | GET | Load model and return classes/threshold |
| `/predict` | POST | `multipart/form-data` with field `file` |
| `/results/{file}` | GET | Generated annotated image |

The `/predict` response returns detections (class, confidence, pixel bounding box), an API-relative `result_image_url`, and an inspection analysis with unique inspection ID and report details.

## Dataset and training

**No dataset download is required to run the application.** The repository already ships a trained model and `test_images/` samples. It also includes evaluation charts in `evaluation/`, but those images alone are not independent validation of this deployment.

A relevant original source dataset is [DeepPCB](https://github.com/tangsanli5201/DeepPCB), which provides 1,500 aligned PCB image pairs and annotations. **Its authors restrict the dataset to research purposes.** Consult its license and usage restrictions before downloading or training, especially for commercial uses.

DeepPCB uses annotation labels **open, short, mousebite, spur, pin-hole and copper**. This repository's model labels include `missing_hole`; **do not automatically equate pin-hole with missing-hole**. Before retraining:

1. Inspect labels in the source data and align them explicitly to the model's class indices.
2. Convert bounding boxes to YOLO normalized `class x_center y_center width height` format.
3. Split train/validation/test **without image leakage** between aligned or near-duplicate board images.
4. Put converted `images/` and `labels/` into the structure specified in `data.yaml` (excluded from Git).
5. Train and independently test, compare per-class precision/recall/mAP, and replace `best.pt` only after measured improvement.

## Testing

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
npm ci --prefix frontend
npm run build --prefix frontend
# After installing backend requirements and httpx:
python scripts/smoke_test.py
```

The GitHub Actions workflow runs these checks. The smoke test loads the **actual** `best.pt` and posts a sample image to the API.

## Safety and limits

Detection confidence is not a probability that a manufactured board is electrically sound. A report with zero detections is **not a guarantee of a defect-free PCB**. Always follow standard electrical and quality-control procedures.

The backend currently keeps generated annotated result images in a temporary service filesystem, so hosted results may disappear on container restart. Uploaded originals are processed as temporary files and removed after inference.

## Project

Repository maintained at [alokkumar2018/AI-POWERED-PCB-DEFECTS-DETECTION](https://github.com/alokkumar2018/AI-POWERED-PCB-DEFECTS-DETECTION).
