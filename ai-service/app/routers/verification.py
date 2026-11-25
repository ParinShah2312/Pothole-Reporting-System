from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.results import DetectionResult, RepairResult
from app.services import detector

router = APIRouter(tags=["verification"])


async def _read_image(upload: UploadFile) -> bytes:
    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(data) > settings.max_image_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large")
    return data


@router.post("/detect/pothole", response_model=DetectionResult)
async def detect_pothole(image: UploadFile = File(...)):
    """Initial report verification: does the citizen's photo contain a pothole?"""
    return await detector.detect_pothole(await _read_image(image), image.filename)


@router.post("/verify/repair", response_model=RepairResult)
async def verify_repair(completion_image: UploadFile = File(...), original_image: UploadFile | None = File(None)):
    """Repair verification: does the completion photo show the pothole fixed?
    (Same-location checking by GPS distance is done by the Node backend.)"""
    original = await _read_image(original_image) if original_image else None
    return await detector.verify_repair(await _read_image(completion_image), completion_image.filename, original)
