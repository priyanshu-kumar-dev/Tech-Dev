# 🚧 AI-Based Road Damage Detection and Severity Mapping

An intelligent road monitoring platform that uses Artificial Intelligence to detect road damage, classify its severity, and map reported issues to support smarter infrastructure maintenance.

## 📌 Overview

RoadGuard AI aims to simplify road inspection by allowing users to upload road images, detect potholes and cracks using AI, and visualize reported damage on a location-based map. An interactive dashboard helps track reported issues and prioritize road maintenance.

## ✨ Key Features

- **📸 Image Upload:** Upload road images for damage analysis.
- **🤖 AI-Powered Detection:** Detect potholes, cracks, and other road surface damage.
- **⚠️ Severity Classification:** Classify detected damage by severity to help prioritize repairs.
- **🧭 Explainable Risk Score:** Rank each unresolved report from 0–100 using its strongest severity/confidence score, a capped multiple-defect bonus, and an unresolved-status bonus; show the reasons alongside the score.
- **📋 Unresolved Priority Queue:** Sort open reports by prototype risk score and flag records that need location verification.
- **📊 Issue Dashboard:** View and manage reported road damage.
- **📈 Analytics and Operations:** Review report trends, defect severity, common defect types, and a searchable inspection queue.
- **🗺️ Location-Based Mapping:** Visualize reported issues by geographical location.
- **🔥 City/Ward Heatmap:** Compare geolocated damage concentration by city or ward.
- **♻️ Duplicate Review:** Flag identical uploaded images reported within 100 metres for operator review.
- **🔧 Maintenance Lifecycle:** Track Reported → Verified → Assigned → In Progress → Resolved, with an assignee, audit history, and repair-photo comparison.
- **🚨 Critical Alerts:** Put model-generated critical damage into the administrator dashboard and ahead of resolved work in the priority queue.
- **📉 Model Performance:** Show measured inference time. Precision, recall, mAP, and false detections stay unavailable until labeled evaluation results exist.
- **🐳 Dockerized Services:** Containerize application services for consistent deployment.
- **🔄 CI/CD Pipeline:** Automate testing and application delivery.
- **☁️ Cloud Deployment:** Deploy the application to a cloud environment.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI/ML | Python, FastAPI, Computer Vision |
| Maps | React Leaflet, OpenStreetMap |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Cloud | AWS or another supported cloud platform |
| Version Control | Git, GitHub |

*The technology stack can be adjusted to match the actual implementation.*

Report records and maintenance history are stored in MongoDB. Only accounts
with the `admin` role can change status or upload a repair photo. Newly
registered accounts default to the `user` role; a trusted database operator
can grant administrator access in `mongosh`:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Duplicate matching requires the same exact uploaded-image SHA-256 hash and
coordinates within 100 metres. Visually similar but re-encoded images are not
automatically matched. Reports can optionally include city and ward labels for
the heatmap.

The repository does not include labeled evaluation output. Therefore precision,
recall, mAP, and false-detection counts display as unavailable rather than
invented accuracy values. Inference time is recorded from actual Python model
prediction runs only; demo-mode timing is excluded.

The dashboard's 0–100 risk score is a prototype triage aid, not a validated
safety prediction. It starts with the highest detection priority score (which
already reflects severity and model confidence), adds 5 points for each
additional defect up to 15 points, then adds 10 points while the report remains
unresolved; the result is capped at 100. The queue excludes resolved reports
and sorts the remainder by score. Displayed reasons identify severity,
high-confidence detections, multiple defects, unresolved status, and missing or
invalid coordinates that need location verification. A missing location is a
review reason, not an invented risk measurement.

## 🏗️ System Architecture

```text
                 ┌─────────────────────┐
                 │     React Frontend  │
                 │ Upload & Dashboard  │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Node.js + Express  │
                 │       REST API      │
                 └─────┬─────────┬────┘
                       │         │
              ┌────────▼───┐  ┌──▼────────────┐
              │  MongoDB   │  │  AI Service  │
              │ Road Issues│  │ Python / ML  │
              └────────────┘  └───────────────┘
                       │
                 ┌─────▼──────────────┐
                 │  Location-Based    │
                 │   Damage Map       │
                 └────────────────────┘

        Docker + Automated Tests + CI/CD + Cloud
```

## 🔄 How It Works

1. **Upload:** A user uploads an image of a damaged road.
2. **Analyze:** The backend sends the image to the AI service for analysis.
3. **Detect:** The AI model identifies potholes, cracks, or other supported damage types.
4. **Classify:** The system assigns a severity category based on the model's predictions.
5. **Store:** The issue details, image reference, classification, and available location data are saved.
6. **Visualize:** Users review reported issues on the dashboard and map.
7. **Deploy:** Docker and CI/CD workflows support testing and deployment.

## 🎬 End-to-end demo recording

Use this sequence for a screen recording that demonstrates the complete
upload-to-repair-priority flow:

1. Start the Compose stack and wait until the AI service reports that `best.pt`
   is loaded. Keep `AI_MODE=python`; demo mode uses explicitly simulated data.
2. Open **Analyze Road**, select a real road-damage photo, and attach GPS with
   the browser location button or the photo's EXIF metadata. Manual coordinates
   are also supported.
3. Submit the report and show each returned detection's severity and model
   confidence. The result must be labeled as model-generated, not **DEMO**.
4. On the map, open the report marker to show its coordinates and GPS source.
5. Show the new report in the unresolved priority queue, including the score
   and its prioritization reasons. The score formula is displayed above the
   queue and is explicitly marked as a prototype.

If the AI service is unavailable, stop at the clearly marked **DEMO** result;
do not present simulated detections as model predictions. A screen recorder
must be started separately in the operating system or browser. Detection
quality metrics still require a labeled evaluation set; inference and a demo
recording alone do not establish accuracy.

## 🚀 Getting Started

### Prerequisites

Install the following tools before running the project:

- Node.js and npm
- MongoDB
- Python 3.10+ (if using a Python-based AI service)
- Git
- Docker Desktop (optional for local containerized deployment)

### 1. Clone the Repository

```bash
git clone https://github.com/priyanshu-kumar-dev/Tech-Dev.git
cd Tech-Dev
```

### Local development with Docker Compose

```bash
docker compose up --build
```

The development stack includes MongoDB (persistent named volume), the backend,
frontend, and Python AI service. Visit `http://localhost:5173`; the API is at
`http://localhost:5001` by default. The API container listens on port 5000; if
that host port is available and you prefer it, set `API_PORT=5000` in the root
`.env` file. If port 5001 is busy too, choose another available port such as
`API_PORT=5002`; the frontend API URL follows this setting automatically. Keep
the root `.env` private and never push it to GitHub. Set a strong `JWT_SECRET`
there to enable sign-in. Python model analysis is the default; make sure the AI
service is running before uploading images. Set `AI_MODE=demo` only when you
explicitly want sample results marked as simulated.

For manual local development, start MongoDB and the AI service with Compose,
then run the backend and frontend npm scripts from their lowercase directories.

```bash
docker compose up -d mongodb ai-service
cd backend
npm ci
npm run dev
```

In another terminal, run the frontend:

```bash
cd frontend
npm ci
npm run dev
```

For manual backend execution, configure `MONGO_URL`, `JWT_SECRET`, and
`FRONTEND_URL` in the root `.env` file. The backend loads the root file first
and falls back to `backend/.env` for unset values; the local MongoDB default is
the `roadshield-debug` database. Keep credentials, database passwords, API keys,
and secret tokens out of GitHub.

## 🐳 Production Docker deployment

Create a private root `.env` containing a strong `JWT_SECRET`, then start the
production stack:

```bash
docker compose -f docker-compose.prod.yaml up --build -d
```

This builds and serves the frontend from the backend container, keeps report
images and MongoDB data in named volumes, and runs the bundled `best.pt` model
in the AI container. The AI container checks that the model loads before
becoming healthy. By default the app is exposed on port 80; set `APP_PORT` to
change the host port. Do not expose MongoDB or the AI service directly to the
internet.

Stop the stack using:

```bash
docker compose -f docker-compose.prod.yaml down
```

## 🧪 Tests and CI

Run backend tests (including persistence and duplicate integration checks when
`MONGO_URL` points at a test database) and frontend checks:

```bash
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
python -m compileall -q ai-service
```

GitHub Actions also starts MongoDB, runs backend tests and frontend lint/build,
checks Python syntax, and builds both application and AI Docker images. Labeled
model evaluation is intentionally not fabricated by CI.

## ☁️ AWS and Kubernetes

The Terraform AWS deployment builds the production Compose stack on an EC2
instance, generates a private JWT secret on the instance, persists MongoDB and
uploads in Docker volumes, and uses the included `ai-service/best.pt` weights.
The default instance is `t3.large` for CPU inference. It exposes HTTP only;
configure TLS through a production reverse proxy or load balancer before
handling public traffic.

For Kubernetes, build and publish the `roadshield-app` and `roadshield-ai`
images, update their image references in `k8s/deployment.yaml`, create the
`roadshield-secrets` Secret with key `jwt-secret`, then apply `k8s/` manifests.
The backend/AI/MongoDB services are cluster-internal except for the backend
LoadBalancer; MongoDB and uploaded images use persistent volume claims.

## 🌍 Applications

- Smart-city road maintenance
- Municipal infrastructure monitoring
- Pothole and crack reporting
- Road inspection assistance
- Geographic visualization of infrastructure issues
- Data-driven maintenance prioritization

## 🔮 Future Enhancements

- Labeled, reproducible model evaluation to publish measured precision, recall, mAP, and false-detection counts.
- Perceptual-image similarity to catch re-encoded or visually similar duplicate reports.
- Reverse geocoding to suggest city and ward labels from GPS coordinates.
- Notifications to municipal teams when critical reports arrive or change lifecycle state.
- Mobile-friendly progressive web application.
- Cloud-based image storage and scalable AI inference.

## 👨‍💻 Author

**Prince Kumar**

- GitHub: [Princekumarsahu-321](https://github.com/Princekumarsahu-321)
- Project: [RoadGuard-AI](https://github.com/Princekumarsahu-321/RoadGuard-AI)

## 📄 License

This project can be distributed under the MIT License once the license is added to the repository.

---

**RoadGuard AI: Detect damage. Map the problem. Prioritize safer roads.** 🚧