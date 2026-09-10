import unittest

from fastapi import HTTPException

from app.api.routes.analysis import analyze_email_batch
from app.models.schemas import BatchAnalysisRequest, BatchEmailItem


def sample_email(position):
    return BatchEmailItem(
        id=f"test-{position}",
        source="test",
        sender=f"sender{position}@example.com",
        subject=f"Urgent verification {position}",
        email_text=(
            f"From: sender{position}@example.com\n"
            f"Subject: Urgent verification {position}\n\n"
            "Verify your login at https://different.example/login"
        ),
    )


class BatchAnalysisTests(unittest.TestCase):
    def test_five_emails_receive_separate_results(self):
        request = BatchAnalysisRequest(
            emails=[sample_email(index) for index in range(1, 6)]
        )

        report = analyze_email_batch(request)

        self.assertEqual(report["summary"]["total_emails"], 5)
        self.assertEqual(report["summary"]["successful_analyses"], 5)
        self.assertEqual(len(report["results"]), 5)
        self.assertTrue(
            all(item["analysis"] is not None for item in report["results"])
        )

    def test_fewer_than_five_emails_is_rejected(self):
        request = BatchAnalysisRequest(
            emails=[sample_email(index) for index in range(1, 5)]
        )

        with self.assertRaises(HTTPException) as context:
            analyze_email_batch(request)

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
