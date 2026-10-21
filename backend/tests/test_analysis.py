import unittest

from services.analysis import generate_analysis


class AnalysisTests(unittest.TestCase):
    def test_zero_detections_does_not_certify_board(self):
        report = generate_analysis([], "clean.png")
        self.assertEqual(report["inspection_status"], "PASS")
        self.assertEqual(report["total_defects"], 0)
        self.assertEqual(report["distribution"], {})
        self.assertIsNone(report["most_common_defect"])
        self.assertIn("not certification", report["recommendation"])

    def test_detected_defect_requires_review(self):
        report = generate_analysis(
            [
                {"type": "short", "confidence": 0.94},
                {"type": "short", "confidence": 0.83},
                {"type": "open", "confidence": 0.65},
            ],
            "board.png",
            0.25,
        )
        self.assertEqual(report["inspection_status"], "MANUAL INSPECTION")
        self.assertEqual(report["total_defects"], 3)
        self.assertEqual(report["distribution"]["short"], 2)
        self.assertEqual(report["most_common_defect"], "short")
        self.assertEqual(report["highest_confidence"], 94)
        self.assertEqual(report["confidence_threshold"], 25)

    def test_ids_are_unique(self):
        self.assertNotEqual(
            generate_analysis([], "x.png")["inspection_id"],
            generate_analysis([], "x.png")["inspection_id"],
        )


if __name__ == "__main__":
    unittest.main()
