
import os
import tempfile
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


app = FastAPI(
    title="RoadShield AI",
    description="AI-based road damage detection",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(
    os.getenv("ROAD_DAMAGE_MODEL", str(BASE_DIR / "best.pt"))
)

MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Higher resolution can help detect small cracks.
IMAGE_SIZE = 1280

# Lower than the old 0.25 threshold, but avoids
# accepting the extremely weak boxes from conf=0.001.
CONFIDENCE_THRESHOLD = 0.15
IOU_THRESHOLD = 0.50
MAX_DETECTIONS = 50

model = None


def get_model():
    global model

    if model is not None:
        return model

    if not MODEL_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Model file not found: {MODEL_PATH}",
        )

    try:
        model = YOLO(str(MODEL_PATH))
        print(f"YOLO model loaded: {MODEL_PATH}")
        print(f"Model classes: {model.names}")
        return model
    except Exception as exc:
        print(f"Model loading error: {exc}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not load YOLO model: {exc}",
        )


def normalize_class_name(name):
    key = str(name).strip().lower().replace("_", " ").replace("-", " ")
    key = " ".join(key.split())

    labels = {
        "d00": "Longitudinal Crack",
        "d10": "Transverse Crack",
        "d20": "Alligator Crack",
        "d40": "Pothole",
        "longitudinal crack": "Longitudinal Crack",
        "transverse crack": "Transverse Crack",
        "alligator crack": "Alligator Crack",
        "pothole": "Pothole",
    }

    return labels.get(key, str(name).strip().title())


def get_severity(class_name, confidence):
    name = class_name.lower()

    if "pothole" in name or "alligator crack" in name:
        return "High" if confidence >= 0.50 else "Medium"

    if "crack" in name:
        return "Medium" if confidence >= 0.50 else "Low"

    return "Medium"


@app.get("/")
def root():
    return {
        "success": True,
        "service": "RoadShield AI",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "RoadShield AI Python Service",
        "status": "online",
        "modelConfigured": MODEL_PATH.is_file(),
        "modelLoaded": model is not None,
        "model": MODEL_PATH.name,
        "classes": model.names if model is not None else None,
        "imageSize": IMAGE_SIZE,
        "confidenceThreshold": CONFIDENCE_THRESHOLD,
    }


@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    temp_path = None

    try:
        content = await image.read(MAX_IMAGE_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty.",
            )

        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Maximum image size is 10 MB.",
            )

        try:
            with Image.open(BytesIO(content)) as img:
                image_format = img.format
                img.verify()
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid image. Upload JPG, PNG or WEBP.",
            )

        suffixes = {
            "JPEG": ".jpg",
            "PNG": ".png",
            "WEBP": ".webp",
        }

        suffix = suffixes.get(image_format)

        if suffix is None:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are supported.",
            )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        detector = get_model()

        results = detector.predict(
            source=temp_path,
            imgsz=IMAGE_SIZE,
            conf=CONFIDENCE_THRESHOLD,
            iou=IOU_THRESHOLD,
            max_det=MAX_DETECTIONS,
            augment=False,
            verbose=False,
        )

        detections = []

        for result in results:
            if result.boxes is None:
                continue

            names = result.names

            for box in result.boxes:
                class_id = int(box.cls.item())
                confidence = float(box.conf.item())

                if isinstance(names, dict):
                    raw_name = names.get(class_id, str(class_id))
                else:
                    raw_name = names[class_id]

                class_name = normalize_class_name(raw_name)

                bbox = [
                    round(float(value), 2)
                    for value in box.xyxy[0].tolist()
                ]

                detections.append({
                    "type": class_name,
                    "class_name": str(raw_name),
                    "confidence": round(confidence, 4),
                    "severity": get_severity(
                        class_name,
                        confidence,
                    ),
                    "bbox": bbox,
                    "simulated": False,
                })

        detections.sort(
            key=lambda item: item["confidence"],
            reverse=True,
        )

        count = len(detections)

        return {
            "success": True,
            "model": MODEL_PATH.name,
            "simulated": False,
            "count": count,
            "detections": detections,
            "settings": {
                "imageSize": IMAGE_SIZE,
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
                "iouThreshold": IOU_THRESHOLD,
            },
            "message": (
                "Analysis complete."
                if count
                else (
                    "No detections passed the confidence threshold. "
                    "Try a clear road image with visible potholes or cracks."
                )
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Inference error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"AI inference failed: {type(exc).__name__}: {exc}",
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await image.close()
