# ai-service — Python FastAPI (YOLO)

Separate microservice called by the Node backend over HTTP.
Returns stub results until the model is trained (`USE_STUB_MODEL=true`).

| Folder | Purpose |
|---|---|
| `app/routers` | Endpoints: pothole detection, repair verification, health |
| `app/services` | Model loading and inference |
| `app/schemas` | Pydantic request/response models |
| `app/core` | Settings / config |
| `weights` | Trained model files (`.pt`) — not committed |
| `datasets` | Training images — not committed |
| `training` | Notebooks and scripts for training/evaluation |
| `tests` | Service tests |

## Setup (always use the venv)
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install <package>        # install one at a time as needed
```
