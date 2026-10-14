
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


app = FastAPI(
    title="RoadShield AI",
    description="Road damage detection service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(
    os.getenv("ROAD_DAMAGE_MODEL", str(BASE_DIR / "best.pt"))
)

MAX_IMAGE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

model = None


def get_model():
    """Load the road-damage model only when needed."""
    global model

    if model is not None:
        return model

    if not MODEL_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model file not found: {MODEL_PATH}. "
                "Add a road-damage-trained best.pt file."
            ),
        )

    try:
        model = YOLO(str(MODEL_PATH))
        return model
    except Exception as exc:
        print(f"Model loading error: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Could not load the AI model. Check the model file.",
        )


def normalize_class_name(name):
    """Map common RDD-style labels to backend severity labels."""
    label = str(name).strip()
    key = label.lower().replace("_", " ").replace("-", " ")

    mappings = {
        "d00": "Longitudinal Crack",
        "d10": "Transverse Crack",
        "d20": "Alligator Crack",
        "d40": "Pothole",
        "pothole": "Pothole",
        "longitudinal crack": "Longitudinal Crack",
        "transverse crack": "Transverse Crack",
        "alligator crack": "Alligator Crack",
        "damaged surface": "Damaged Surface",
        "uneven road": "Uneven Road",
        "road crack": "Road Crack",
    }

    return mappings.get(key, label)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "RoadShield AI Python Service",
        "status": "online",
        "modelConfigured": MODEL_PATH.is_file(),
        "modelLoaded": model is not None,
    }


@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG or WEBP image.",
        )

    content = await image.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum image size is 10 MB.",
        )

    # Validate the actual image before passing it to the model.
    try:
        from io import BytesIO

        with Image.open(BytesIO(content)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    suffix = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[image.content_type]

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        detector = get_model()

        results = detector.predict(
            source=temp_path,
            conf=0.25,
            verbose=False,
        )

        detections = []

        for result in results:
            boxes = result.boxes

            if boxes is None:
                continue

            for box in boxes:
                class_id = int(box.cls.item())
                confidence = float(box.conf.item())

                class_names = result.names
                raw_name = class_names.get(
                    class_id, str(class_id)
                )

                coords = [
                    round(float(value), 2)
                    for value in box.xyxy[0].tolist()
                ]

                detections.append({
                    "type": normalize_class_name(raw_name),
                    "class_name": str(raw_name),
                    "confidence": round(confidence, 4),
                    "bbox": coords,
                    "simulated": False,
                })

        return {
            "success": True,
            "model": MODEL_PATH.name,
            "simulated": False,
            "count": len(detections),
            "detections": detections,
            "message": (
                "Analysis complete."
                if detections
                else "No objects detected at the configured confidence threshold."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Inference error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="AI inference failed. Check the model and server logs.",
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await image.close()
