import { useEffect, useState } from "react";
import { FiCheckCircle, FiDownload, FiLoader, FiRefreshCw, FiSearch, FiUploadCloud } from "react-icons/fi";
import { toast } from "react-toastify";
import WebcamCapture from "./WebcamCapture";
import UploadBox from "./UploadBox";
import DetectionTable from "./DetectionTable";
import InspectionReport from "./InspectionReport";
import SummaryCards from "./SummaryCards";
import api, { API_BASE_URL, resolveResultImageUrl } from "../services/api";
import "./UploadCard.css";

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png"];
const SAMPLE_ROOT = "https://raw.githubusercontent.com/alokkumar2018/AI-POWERED-PCB-DEFECTS-DETECTION/main/test_images";
const SAMPLES = ["pcb1.jpg", "pcb8.jpg", "pcb13.png"];

function UploadCard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [health, setHealth] = useState("checking");
  const [healthRetry, setHealthRetry] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setHealth("checking");
    api.get("/health", { timeout: 15000 })
      .then(() => { if (!cancelled) setHealth("online"); })
      .catch(() => { if (!cancelled) setHealth("offline"); });
    return () => { cancelled = true; };
  }, [healthRetry]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectFile(next) {
    if (!next) return;
    if (!IMAGE_TYPES.includes(next.type) || !/\.(jpe?g|png)$/i.test(next.name)) {
      toast.error("Select a JPG or PNG image.");
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }
    if (!next.size) {
      toast.error("Image is empty.");
      return;
    }
    setFile(next);
    setResult(null);
    setMessage("");
  }

  async function loadSample(name) {
    if (loading || loadingSample) return;
    setLoadingSample(true);
    try {
      const response = await fetch(`${SAMPLE_ROOT}/${name}`);
      if (!response.ok) throw new Error("Could not download sample");
      const blob = await response.blob();
      selectFile(new File([blob], name, { type: name.endsWith(".png") ? "image/png" : "image/jpeg" }));
      toast.success("Sample image loaded. Click Analyze PCB.");
    } catch {
      toast.error("Sample unavailable. You can upload an image instead.");
    } finally {
      setLoadingSample(false);
    }
  }

  async function handleCapture(imageSrc) {
    if (!imageSrc) {
      toast.error("Camera did not capture an image. Please try again.");
      return;
    }
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      selectFile(new File([blob], "webcam_pcb.jpg", { type: "image/jpeg" }));
      setShowWebcam(false);
    } catch {
      toast.error("Unable to read webcam capture.");
    }
  }

  async function handleUpload() {
    if (!file || loading) {
      if (!file) toast.error("Choose a PCB image first.");
      return;
    }
    setLoading(true);
    setResult(null);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await api.post("/predict", body);
      const data = response.data;
      if (data.status !== "success" || !Array.isArray(data.detections)) {
        throw new Error("Unexpected result from server");
      }
      setResult({
        ...data,
        result_image_url: resolveResultImageUrl(data.result_image_url),
      });
      setHealth("online");
      toast.success("PCB inspection completed.");
    } catch (error) {
      const detail = error.response?.data?.detail;
      const text = typeof detail === "string"
        ? detail
        : error.response?.status === 413
          ? "Image exceeds the server's upload limit."
          : "Cannot process this image. Check the AI server and try again.";
      setMessage(text);
      toast.error(text);
      if (!error.response || error.response.status === 503) setHealth("offline");
    } finally {
      setLoading(false);
    }
  }

  async function downloadAnnotated() {
    if (!result) return;
    try {
      const response = await fetch(result.result_image_url);
      if (!response.ok) throw new Error("Result unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = `pcb_detection_${result.analysis.inspection_id}.jpg`;
      document.body.appendChild(element);
      element.click();
      element.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Unable to download annotated image.");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setMessage("");
    setShowWebcam(false);
  }

  return (
    <section className="upload-card" aria-label="PCB inspection">
      <h2 className="upload-title"><FiUploadCloud className="upload-title-icon" />Inspect a PCB</h2>
      <p className="upload-description">Upload a circuit board image, capture one with your camera, or try a real sample from this GitHub repository.</p>
      <div className={`api-status ${health}`} role="status">
        <span className="status-dot" aria-hidden="true" />
        AI service: {health === "online" ? "Connected" : health === "checking" ? "Checking connection…" : "Unavailable"}
        {health === "offline" && (
          <button type="button" onClick={() => setHealthRetry((n) => n + 1)}>Retry connection</button>
        )}
      </div>
      {health === "offline" && (
        <p className="inline-warning">The API at <code>{API_BASE_URL}</code> could not be reached. The dashboard can display images, but predictions need a running backend.</p>
      )}
      <UploadBox
        file={file}
        disabled={loading || loadingSample}
        onFileChange={(event) => selectFile(event.target.files?.[0])}
      />
      <div className="sample-row">
        <span>Try a test image:</span>
        {SAMPLES.map((name) => (
          <button key={name} type="button" disabled={loading || loadingSample} onClick={() => loadSample(name)}>
            {name}
          </button>
        ))}
      </div>
      {showWebcam ? (
        <WebcamCapture onCapture={handleCapture} onClose={() => setShowWebcam(false)} />
      ) : (
        <button className="open-webcam-btn" type="button" disabled={loading || loadingSample} onClick={() => setShowWebcam(true)}>
          📷 Open Webcam
        </button>
      )}
      <div>
        <button type="button" className="detect-btn" onClick={handleUpload} disabled={!file || loading || loadingSample}>
          {loading ? <><FiLoader className="spin" /> Analyzing PCB…</> : <><FiSearch /> Analyze PCB</>}
        </button>
      </div>
      {message && <p className="inline-warning" role="alert">{message}</p>}
      {preview && (
        <div className="comparison">
          <div className="image-card">
            <h3 className="image-title">Original Image</h3>
            <img src={preview} alt="PCB image selected for inspection" className="preview-image" />
          </div>
          {result && (
            <div className="image-card">
              <h3 className="image-title">Annotated Result</h3>
              <img src={result.result_image_url} alt="PCB with predicted defect bounding boxes" className="result-image" />
            </div>
          )}
        </div>
      )}
      {result && (
        <div className="result-section" aria-live="polite">
          <SummaryCards result={result} />
          <h3>Inspection complete <FiCheckCircle style={{ color: "#22c55e", verticalAlign: "middle" }} /></h3>
          <InspectionReport
            analysis={result.analysis}
            detections={result.detections}
            imageUrl={result.result_image_url}
          />
          <DetectionTable detections={result.detections} />
          <div className="action-buttons">
            <button type="button" className="reset-btn" onClick={reset}><FiRefreshCw /> Analyze Another</button>
            <button type="button" className="download-btn" onClick={downloadAnnotated}><FiDownload /> Download Result Image</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadCard;
