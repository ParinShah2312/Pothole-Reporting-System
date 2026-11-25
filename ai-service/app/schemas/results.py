from pydantic import BaseModel, Field


class Box(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float


class DetectionResult(BaseModel):
    detected: bool
    confidence: float = Field(ge=0, le=1, description="Probability that the image contains a pothole")
    boxes: list[Box] = []
    model_version: str


class RepairResult(BaseModel):
    repaired: bool
    confidence: float = Field(ge=0, le=1, description="Confidence in the repaired / not-repaired decision")
    model_version: str
