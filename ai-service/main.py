
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
    version="1.0.0",
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
CONFIDENCE_THRESHOLD = 0.25

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
        print(f"Classes: {model.names}")
        return model
    except Exception as exc:
        print(f"Model loading error: {exc}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not load YOLO model: {exc}",
        )


def normalize_class_name(name):
    key = str(name).strip().lower().replace("_", " ").replace("-", " ")

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

    return labels.get(key, str(name))


def get_severity(class_name, confidence):
    name = class_name.lower()

    # Initial inspection priority rules; calibrate for real-world use.
    if "pothole" in name or "alligator" in name:
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
    }


@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    temp_path = None

    try:
        # Read one extra byte to enforce the upload limit.
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

        # Validate the actual file instead of trusting its MIME type.
        try:
            with Image.open(BytesIO(content)) as img:
                image_format = img.format
                img.verify()
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid image. Upload a JPG, PNG or WEBP file.",
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

        # Save temporarily because YOLO accepts an image path.
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        detector = get_model()

        results = detector.predict(
            source=temp_path,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False,
        )

        detections = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls.item())
                confidence = float(box.conf.item())

                names = result.names
                raw_name = (
                    names.get(class_id, str(class_id))
                    if isinstance(names, dict)
                    else names[class_id]
                )

                class_name = normalize_class_name(raw_name)
                bbox = [
                    round(float(value), 2)
                    for value in box.xyxy[0].tolist()
                ]

                detections.append({
                    "type": class_name,
                    "class_name": str(raw_name),
                    "confidence": round(confidence, 4),
                    "severity": get_severity(class_name, confidence),
                    "bbox": bbox,
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
                else "No road damage detected. Try another image or review the confidence threshold."
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
