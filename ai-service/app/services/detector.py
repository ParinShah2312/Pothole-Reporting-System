"""
Pothole detection and repair verification.

Phase 0 uses a STUB: it returns a fixed confidence so the full workflow can be demoed
before the YOLO model is trained (Phase 4). For demos, the uploaded file name can steer
the stub result:
  - name contains "reject"  -> low confidence  (report gets rejected / repair not confirmed)
  - name contains "review"  -> middle confidence (manual review)
"""
import asyncio

from app.core.config import settings
from app.schemas.results import DetectionResult, RepairResult

STUB_VERSION = "stub-0.1"


def _stub_confidence(filename: str | None) -> float:
    name = (filename or "").lower()
    if "reject" in name:
        return 0.12
    if "review" in name:
        return 0.5
    return settings.stub_confidence


async def detect_pothole(image: bytes, filename: str | None) -> DetectionResult:
    if not settings.use_stub_model:
        raise NotImplementedError("YOLO model is not trained yet (Phase 4); set USE_STUB_MODEL=true")
    await asyncio.sleep(settings.stub_delay_seconds)  # simulate inference time
    confidence = _stub_confidence(filename)
    boxes = [] if confidence < 0.5 else [{"x1": 0.3, "y1": 0.5, "x2": 0.7, "y2": 0.8, "confidence": confidence}]
    return DetectionResult(detected=confidence >= 0.5, confidence=confidence, boxes=boxes, model_version=STUB_VERSION)


async def verify_repair(completion: bytes, filename: str | None, original: bytes | None) -> RepairResult:
    if not settings.use_stub_model:
        raise NotImplementedError("Repair verification model is not ready yet (Phase 4); set USE_STUB_MODEL=true")
    await asyncio.sleep(settings.stub_delay_seconds)
    confidence = _stub_confidence(filename)
    return RepairResult(repaired=confidence >= 0.5, confidence=confidence, model_version=STUB_VERSION)
