"""Settings read from environment variables (and ai-service/.env if present)."""
import os
from dataclasses import dataclass
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def _load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_env_file()


@dataclass(frozen=True)
class Settings:
    model_path: str = os.getenv("MODEL_PATH", "weights/best.pt")
    use_stub_model: bool = os.getenv("USE_STUB_MODEL", "true").lower() == "true"
    stub_confidence: float = float(os.getenv("STUB_CONFIDENCE", "0.87"))
    stub_delay_seconds: float = float(os.getenv("STUB_DELAY_SECONDS", "1.5"))
    max_image_mb: int = int(os.getenv("MAX_IMAGE_MB", "10"))


settings = Settings()
