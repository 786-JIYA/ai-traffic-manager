# AI Traffic Manager

An AI-powered traffic monitoring and simulation platform designed to analyze vehicle movement at a five-approach intersection, calculate traffic conditions, and visualize traffic activity through an interactive control-room dashboard.

The system combines computer vision, vehicle tracking, traffic analytics, backend data management, real-time communication, and 3D visualization.

## 1. Project Overview

AI Traffic Manager uses a recorded traffic video as its input source and processes it using a Python-based computer vision engine.

The system is designed to:

- Detect vehicles using YOLO.
- Track detected vehicles using ByteTrack.
- Classify vehicles into categories such as cars, motorcycles, buses, and trucks.
- Analyze vehicle movement and waiting conditions.
- Calculate traffic arrivals, congestion, and approach-wise statistics.
- Simulate traffic signal states.
- Store traffic analytics in PostgreSQL.
- Broadcast updates using Socket.IO.
- Display traffic conditions through a React dashboard.
- Visualize the intersection and congestion patterns using Three.js.

**Project scope:** This is a software-based traffic monitoring and signal simulation system. It does not directly control physical traffic signals.

## 2. System Architecture

```text
                  RECORDED TRAFFIC VIDEO
                            |
                            v
                  PYTHON AI ENGINE
                  YOLO + ByteTrack
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
        Detection       Tracking       Video Processing
             |              |              |
             +--------------+--------------+
                            |
                            v
                    TRAFFIC ANALYTICS
              Queue / Arrivals / Congestion
                            |
                            v
                   NODE.JS BACKEND
                 Express + Socket.IO
                            |
                 +----------+----------+
                 |                     |
                 v                     v
           PostgreSQL             Real-time Events
                 |                     |
                 +----------+----------+
                            |
                            v
                   REACT DASHBOARD
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
          Dashboard    Live Monitoring  Analytics
                            |
                            v
                    3D Visualizations
```

<img width="1920" height="920" alt="Screenshot (330)" src="https://github.com/user-attachments/assets/3fc3ec04-442d-4027-a791-9c87740bba6e" />
<img width="1920" height="907" alt="Screenshot (331)" src="https://github.com/user-attachments/assets/b94e74b6-d13b-4184-ab4d-9bdd6cad1920" />
<img width="1551" height="899" alt="Screenshot (332)" src="https://github.com/user-attachments/assets/41e9f87a-bee7-457f-8a27-fb2d572e924f" />
<img width="1920" height="920" alt="Screenshot (333)" src="https://github.com/user-attachments/assets/b14eafbe-ed2d-4e2f-acbf-284fbae47fcc" />



### Main components

| Component | Technology | Responsibility |
|---|---|---|
| AI Engine | Python, YOLO, OpenCV | Vehicle detection and video processing |
| Tracking | ByteTrack | Tracking vehicles across video frames |
| Analytics | Python | Queue, arrivals, movement and congestion statistics |
| Backend | Node.js, Express | REST APIs and application logic |
| Database | PostgreSQL | Persistent traffic and signal records |
| Real-time communication | Socket.IO | Broadcasting traffic and signal updates |
| Frontend | React, Vite | Monitoring dashboard |
| 3D visualization | Three.js | Interactive intersection and congestion visualization |

## 3. AI Engine

The Python AI engine processes the recorded traffic video frame by frame.

### Vehicle detection

YOLO detects vehicles in the video and identifies their classes.

Supported vehicle classes:

- Car
- Motorcycle
- Bus
- Truck

### Vehicle tracking

ByteTrack maintains tracking IDs across video frames.

This allows the system to track detected vehicles over time rather than treating every frame detection as a new vehicle.

### Intersection approaches

The current intersection configuration contains five approaches:

| Approach ID | Description |
|---|---|
| `bottom_left` | Bottom-left approach |
| `top_center` | Top-center approach |
| `left_side` | Left-side approach |
| `right_side` | Right-side approach |
| `bottom_right_slip` | Bottom-right slip road |

Approach regions are configured using:

`ai-engine/src/config/intersection_rois.json`

### Video processing

The engine generates processed frames containing vehicle detection and traffic information.

The video streaming server exposes:

| Endpoint | Purpose |
|---|---|
| `/video/original` | Original video stream |
| `/video/processed` | AI-processed video stream |
| `/video/health` | Video streaming service health |

Default local streaming address:

`http://localhost:8000`

## 4. Traffic Analytics

The analytics module calculates traffic conditions using vehicle detections and tracking information.

### Current analytics

**Vehicle statistics**
- Total detected vehicles
- Waiting vehicles
- Moving vehicles

**Arrival analysis**
- Tracks newly appearing vehicles.
- Maintains a rolling arrival-rate window.
- Uses video timestamps during recorded-video processing.

**Congestion analysis**
- Calculates waiting-vehicle percentages.
- Determines congestion levels.
- Provides approach-wise congestion information.

### Congestion calculation

\[
\text{Congestion Percentage}
=
\frac{\text{Waiting Vehicles}}{\text{Total Vehicles}}
\times 100
\]

The current traffic statistics module classifies congestion using configurable vehicle-count thresholds.

### Analytics modules

```text
ai-engine/src/analytics/
    arrival_rate_tracker.py
    traffic_analyzer.py
    traffic_statistics.py
```

The system distinguishes between waiting vehicles, moving vehicles, and total detected vehicles.

Arrival-rate estimates based on newly appearing tracks are proxies and should not be interpreted as validated boundary-crossing counts.

## 5. Traffic Signal Simulation

The backend maintains traffic signal state information for the intersection.

Supported signal states:

- GREEN
- YELLOW
- ALL_RED

Signal information includes:

- Active approach
- Signal state
- Green duration
- Elapsed time
- Observation timestamp
- Simulation mode

The current implementation supports reporting and displaying signal states and transition history.

The broader adaptive signal-control design includes conflict management, clearance transitions, pedestrian safety, minimum and maximum green durations, and fairness between approaches.

**Safety note:** Signal simulation is not equivalent to a validated real-world traffic controller. Physical signal operation is outside this project's scope.

## 6. Backend

The backend is built using Node.js and Express.

It receives analytics from the Python engine, stores records in PostgreSQL, and broadcasts updates to connected frontend clients.

### Backend responsibilities

- Receive traffic analytics.
- Validate incoming traffic data.
- Store traffic snapshots.
- Retrieve latest traffic statistics.
- Retrieve traffic history.
- Receive signal-state updates.
- Store signal history.
- Broadcast traffic and signal updates using Socket.IO.

### REST API endpoints

Base URL:

`http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/traffic/analytics` | Submit traffic analytics |
| GET | `/traffic/latest` | Retrieve latest traffic statistics |
| GET | `/traffic/history` | Retrieve traffic history |
| POST | `/signals/state` | Submit signal-state information |
| GET | `/signals/latest` | Retrieve latest signal state |
| GET | `/signals/history` | Retrieve signal transition history |

### Real-time events

Socket.IO broadcasts:

- `traffic:update`
- `signal:update`

The frontend subscribes to these events to receive updated traffic and signal information.

## 7. Database

PostgreSQL stores traffic and signal information.

### Main database entities

- Intersections
- Approaches
- Traffic snapshots
- Signal state history

### Database migrations

```text
backend/migrations/
    001_initial_schema.sql
    002_signal_state_history.sql
```

The database stores traffic measurements, approach information, timestamps, and signal-state records.

## 8. Frontend: Control-Room Dashboard

The frontend provides a control-room interface for monitoring the five-approach intersection.

Built with:

- React
- Vite
- React Router
- Socket.IO Client
- lucide-react
- Three.js
- Recharts

### Dashboard pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | KPIs, approach-wise traffic and system status |
| `/live-monitoring` | Live Monitoring | Original and AI-processed video comparison |
| `/analytics` | Analytics | Traffic statistics, trends and arrival analysis |
| `/signals` | Signal Management | Current signal state, demo mode and transition history |

Press **Ctrl + K** (⌘ + K on Mac) to open the command palette and navigate between pages.

### 3D Visualizations

The dashboard includes two interactive Three.js visualizations.

#### Junction model

File: `src/components/three/Intersection3D.jsx`

Features:

- Five-approach intersection visualization.
- Signal-state visualization.
- Active-lane highlighting.
- Waiting vehicle queues.
- Moving vehicle simulation.
- Congestion-based vehicle colours.
- Angled and top-down camera views.

#### Congestion field

File: `src/components/three/CongestionBars3D.jsx`

Features:

- Three-dimensional congestion visualization.
- Time-based traffic snapshots.
- Approach-wise congestion comparison.
- Interactive bar details.
- Automatic rotation controls.

Both visualizations use plain Three.js with OrbitControls rather than React Three Fiber.

They also support reduced-motion preferences, pause when not visible, and provide a fallback when WebGL is unavailable.

### Frontend project structure

```text
frontend/
|
|-- public/
|
|-- src/
|   |
|   |-- assets/
|   |
|   |-- components/
|   |   |
|   |   |-- common/
|   |   |   |-- Sidebar.jsx
|   |   |   |-- Topbar.jsx
|   |   |   |-- CommandPalette.jsx
|   |   |   |-- navigation.js
|   |   |
|   |   |-- dashboard/
|   |   |   |-- ApproachRow.jsx
|   |   |
|   |   |-- three/
|   |       |-- useThreeScene.js
|   |       |-- Intersection3D.jsx
|   |       |-- CongestionBars3D.jsx
|   |       |-- labels.js
|   |   |
|   |   |-- traffic/
|   |       |-- VideoComparison.jsx
|   |
|   |-- context/
|   |-- hooks/
|   |   |-- useTrafficUpdates.js
|   |   |-- useSignalUpdates.js
|   |
|   |-- layouts/
|   |   |-- MainLayout.jsx
|   |
|   |-- pages/
|   |   |-- Dashboard.jsx
|   |   |-- LiveMonitoring.jsx
|   |   |-- Analytics.jsx
|   |   |-- Analytics.css
|   |   |-- SignalManagement.jsx
|   |   |-- NotFound.jsx
|   |
|   |-- services/
|   |   |-- api.js
|   |   |-- socket.js
|   |
|   |-- utils/
|       |-- traffic.js
|
|-- index.html
|-- package.json
|-- vite.config.js
```

## 9. Installation and Setup

### Prerequisites

Install the following:

- Python
- Node.js and npm
- PostgreSQL
- Git

### Step 1: Clone the repository

```bash
git clone https://github.com/786-JIYA/ai-traffic-manager.git

cd ai-traffic-manager
```

### Step 2: Set up the Python environment

```powershell
cd ai-engine

python -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
```

Install the Python dependencies used by the project:

```powershell
pip install ultralytics opencv-python fastapi "uvicorn[standard]" python-dotenv requests
```

If a project requirements file is provided, use that file as the authoritative dependency list.

### Step 3: Configure PostgreSQL

Create a PostgreSQL database named:

`ai_traffic_manager`

Execute the SQL migrations in order:

```text
backend/migrations/001_initial_schema.sql
backend/migrations/002_signal_state_history.sql
```

Configure the backend database connection using the environment-variable names expected by:

`backend/src/config/db.js`

Run the backend seed script to initialize the intersection and its five approaches.

### Step 4: Set up the backend

Open a new terminal:

```powershell
cd backend

npm install
```

Configure the backend environment using its database configuration and server settings.

Start the backend using the project's configured start command.

The default local backend address is:

`http://localhost:5000`

### Step 5: Set up the frontend

Open another terminal:

```powershell
cd frontend

npm install

npm run dev
```

The Vite development server will display its local URL, normally:

`http://localhost:5173`

## 10. Environment Variables

### Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_AI_STREAM_URL=http://localhost:8000
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | REST API base URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.IO server |
| `VITE_AI_STREAM_URL` | `http://localhost:8000` | Original and processed video streams |

These values are optional when using the local defaults.

Restart Vite after changing environment variables.

Do not commit environment files containing passwords, API keys, or private credentials.

## 11. Running the Complete System

The system uses separate processes for the frontend, backend, and Python engine.

Start them in separate terminals.

**Terminal 1 — PostgreSQL**

Ensure the PostgreSQL service is running and the database is accessible.

**Terminal 2 — Backend**

Start the Node.js Express and Socket.IO server.

**Terminal 3 — Python AI engine**

From the `ai-engine` directory, activate the virtual environment and run:

```powershell
python .\live_traffic_simulation.py
```

The Python engine processes the recorded video and communicates with the backend.

**Terminal 4 — Frontend**

From the `frontend` directory:

```powershell
npm run dev
```

Open the frontend URL displayed by Vite.

## 12. Testing and Validation

### Python compilation check

From `ai-engine`:

```powershell
python -m compileall -q .
```

### Traffic statistics test

```powershell
python .\test_traffic_statistics.py
```

### Frontend production build

From `frontend`:

```powershell
npm run build
```

### Frontend lint

```powershell
npm run lint
```

### Backend health

Check:

`http://localhost:5000/api/health`

### Video streaming health

Check:

`http://localhost:8000/video/health`

## 13. Deployment

The deployment goal is to make the AI Traffic Manager publicly accessible with the actual YOLO-processed recorded traffic video.

### Planned free deployment architecture

| Component | Deployment approach |
|---|---|
| React frontend | Vercel |
| Processed traffic video | Suitable free static or video hosting |
| Backend | Free-tier Node.js hosting, subject to service limitations |
| Database | Neon PostgreSQL free tier |

### Public demo approach

The intended public demonstration uses a video processed in advance by the actual Python YOLO engine.

The resulting video contains genuine vehicle detection, tracking IDs, class labels, and traffic analytics overlays.

The frontend can play this saved output continuously using video looping.

This approach avoids requiring a continuously running Python inference server for every website visitor.

**Important distinction:** A saved YOLO-processed video demonstrates actual YOLO inference performed during video generation. It is not equivalent to running YOLO inference live in the browser or continuously on a cloud server.

Free hosting providers may impose file-size, bandwidth, storage, execution-time, and sleep limitations. Deployment choices must be validated against their current free-tier limits.

## 14. Future Enhancements

Planned improvements include:

- Validated vehicle arrival and departure counting.
- Origin-to-destination throughput analysis.
- Intersection movement-zone configuration.
- Improved traffic congestion trends.
- Adaptive traffic signal optimization.
- Conflict-aware signal phase groups.
- Yellow and all-red clearance transitions.
- Pedestrian clearance and fairness mechanisms.
- Fixed-time versus adaptive signal performance comparison.
- Traffic violation management with manual administrator review.
- Improved cloud deployment and documentation.

## 15. Project Information

**Project:** AI Traffic Manager

**Repository:** [786-JIYA/ai-traffic-manager](https://github.com/786-JIYA/ai-traffic-manager)

**Project type:** AI-powered traffic monitoring and simulation

**Primary technologies:** Python, YOLO, OpenCV, ByteTrack, Node.js, Express, PostgreSQL, React, Vite, Socket.IO, Three.js.

---

*AI Traffic Manager — Intelligent Traffic Monitoring and Simulation.*
