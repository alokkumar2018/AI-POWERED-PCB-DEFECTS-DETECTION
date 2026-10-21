import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import "./DownloadReportButton.css";

function imageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve({
        data: canvas.toDataURL("image/jpeg", 0.9),
        width: canvas.width,
        height: canvas.height,
      });
    };
    image.onerror = reject;
    image.src = src;
  });
}

function DownloadReportButton({ analysis, detections = [], imageUrl }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPDF() {
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const bottom = doc.internal.pageSize.getHeight() - 20;
      let y = 20;
      function ensure(height) {
        if (y + height > bottom) {
          doc.addPage();
          y = 20;
        }
      }
      function section(title) {
        ensure(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(title, 20, y);
        y += 9;
      }
      function paragraph(text) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(String(text), pageWidth - 40);
        ensure(lines.length * 5 + 6);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("PCB INSPECTION REPORT", 20, y);
      y += 12;
      paragraph("AI-Powered PCB Defect Detection | YOLOv8");
      paragraph(`Inspection ID: ${analysis.inspection_id}`);
      paragraph(`Generated: ${analysis.timestamp}`);
      section("Inspection summary");
      paragraph(`Status: ${analysis.inspection_status} | Potential defects: ${analysis.total_defects}`);
      paragraph(`Highest confidence: ${analysis.highest_confidence}% | Average: ${analysis.average_confidence}%`);
      paragraph(`Detection threshold: ${analysis.confidence_threshold}%`);
      paragraph(`Most common class: ${analysis.most_common_defect || "None"}`);
      section("Recommendation");
      paragraph(analysis.recommendation);
      section("Observations");
      for (const item of (analysis.observations || [])) paragraph(`- ${item}`);

      section("Detected defects");
      autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Class", "Confidence", "Bounding box"]],
        body: detections.length
          ? detections.map((item, index) => [
            String(index + 1),
            item.type,
            `${(item.confidence * 100).toFixed(2)}%`,
            (item.bbox || []).join(", "),
          ])
          : [["-", "No detections", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
      });
      y = (doc.lastAutoTable?.finalY || y) + 14;

      section("Annotated PCB image");
      try {
        const image = await imageAsDataUrl(imageUrl);
        const scale = Math.min(170 / image.width, 108 / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ensure(height + 12);
        doc.addImage(image.data, "JPEG", (pageWidth - width) / 2, y, width, height);
        y += height + 10;
      } catch {
        paragraph("Annotated image could not be embedded. Review the dashboard image separately.");
      }
      paragraph("AI-assisted preliminary inspection only; not proof of electrical functionality.");

      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(110);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - 20, 289, { align: "right" });
      }
      doc.save(`PCB_Inspection_${analysis.inspection_id}.pdf`);
      toast.success("Inspection report downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("Could not create PDF report.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button className="download-report-btn" type="button" onClick={downloadPDF} disabled={downloading}>
      {downloading ? "Preparing PDF…" : "Download Inspection PDF"}
    </button>
  );
}

export default DownloadReportButton;
