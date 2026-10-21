"""Human-readable inspection summary; not a substitute for electrical testing."""
from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4


def generate_analysis(detections, filename, threshold=0.25):
    now = datetime.now(timezone.utc)
    confidences = [float(item["confidence"]) for item in detections]
    distribution = dict(Counter(item["type"] for item in detections))
    total = len(detections)
    highest = round(max(confidences) * 100, 2) if confidences else 0
    average = round(sum(confidences) * 100 / total, 2) if confidences else 0
    most_common = (
        max(distribution, key=lambda key: (distribution[key], key))
        if distribution else None
    )
    if total:
        status = "MANUAL INSPECTION"
        recommendation = (
            "The model detected possible manufacturing defects. "
            "Inspect each flagged area and verify with approved electrical/visual tests. "
            "Do not reject or accept a board solely on AI predictions."
        )
    else:
        status = "PASS"
        recommendation = (
            "No defects were detected at the selected confidence threshold. "
            "This is not certification of a defect-free PCB; carry out normal QA tests."
        )
    observations = [
        f"Total potential defects: {total}",
        f"Highest detection confidence: {highest}%",
        f"Average detection confidence: {average}%",
    ]
    if most_common:
        observations.append(f"Most common predicted defect: {most_common}")
    observations.append("This report is an AI-assisted preliminary inspection.")
    return {
        "inspection_id": "PCB-" + now.strftime("%Y%m%d-%H%M%S-") + uuid4().hex[:6].upper(),
        "timestamp": now.strftime("%d %b %Y, %I:%M %p UTC"),
        "filename": filename,
        "total_defects": total,
        "highest_confidence": highest,
        "average_confidence": average,
        "distribution": distribution,
        "most_common_defect": most_common,
        "inspection_status": status,
        "confidence_threshold": round(threshold * 100, 2),
        "recommendation": recommendation,
        "observations": observations,
    }
