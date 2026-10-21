import "./DetectionTable.css";

function DetectionTable({ detections = [] }) {
  if (detections.length === 0) {
    return (
      <div className="empty-state">
        <h3>No model detections</h3>
        <p>No defects were detected above the chosen model confidence threshold. Continue normal QA checks.</p>
      </div>
    );
  }

  return (
    <section className="table-container">
      <h2 className="table-title">Predicted Defects</h2>
      <div className="table-wrapper">
        <table className="detection-table">
          <thead><tr><th>#</th><th>Defect class</th><th>Confidence</th><th>Bounding box (pixels)</th></tr></thead>
          <tbody>
            {detections.map((item, index) => {
              const score = item.confidence * 100;
              const level = score >= 80 ? "high" : score >= 50 ? "medium" : "low";
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.type}</td>
                  <td><span className={`confidence ${level}`}>{score.toFixed(2)}%</span></td>
                  <td>{item.bbox?.join(", ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DetectionTable;
