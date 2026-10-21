import "./UploadBox.css";
import { FiUploadCloud } from "react-icons/fi";

function UploadBox({ file, onFileChange, disabled = false }) {
  return (
    <div className="upload-box">
      <label htmlFor="pcb-upload" className="upload-label">
        <div className="upload-icon"><FiUploadCloud /></div>
        <h3>Choose a PCB image</h3>
        <p>Click to browse or replace your image</p>
        <small>JPG, JPEG or PNG • Maximum 10 MB • Maximum 24 MP</small>
        <div className="file-name">{file ? `Selected: ${file.name}` : "No file selected"}</div>
      </label>
      <input
        id="pcb-upload"
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        disabled={disabled}
        onChange={onFileChange}
      />
    </div>
  );
}

export default UploadBox;
