import { useRef } from "react";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import "./WebcamCapture.css";

function WebcamCapture({ onCapture, onClose }) {
  const webcamRef = useRef(null);

  function captureImage() {
    const image = webcamRef.current?.getScreenshot();
    if (!image) {
      toast.error("No camera image available. Allow camera access and try again.");
      return;
    }
    onCapture(image);
  }

  return (
    <div className="webcam-container">
      <h2>Capture a PCB image</h2>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "environment" }}
        className="webcam"
        onUserMediaError={() => toast.error("Camera access denied or unavailable. Try image upload.")}
      />
      <div className="action-buttons">
        <button type="button" className="capture-btn" onClick={captureImage}>📷 Capture</button>
        <button type="button" className="reset-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default WebcamCapture;
