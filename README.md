# MCP Agent Gateway Monorepo (Spring Boot + React)

A single-repository application integrating a **React frontend** with a **Spring Boot AI Orchestrator backend** via the **Model Context Protocol (MCP)**, connecting upstream to Highmark's Agent Gateway at `https://highmarkagentgateway.cloud.run/`.

---

## 🏗️ Architecture Overview

```
mono_mcp_agenatgateway_app/
├── pom.xml                               # Root Maven build file
├── Dockerfile                            # Multi-stage Cloud Run container build
├── frontend/                             # React (Vite + TypeScript + MCP SDK)
│   ├── package.json
│   ├── vite.config.ts                    # Reverse proxy to :8080
│   └── src/
│       ├── hooks/useMcpClient.ts         # MCP SSEClientTransport hook
│       ├── components/
│       │   ├── AgentConsole.tsx          # MCP tool inspector & runner
│       │   ├── ChatInterface.tsx         # Conversational UI with Bearer token input
│       │   └── DataVisualizer.tsx        # Tables & distribution charts
│       └── App.tsx                       # Tabbed interface
└── src/                                  # Spring Boot Application (Java 17)
    └── main/
        ├── java/com/example/mcp/
        │   ├── McpApplication.java       # Main entry point
        │   ├── config/
        │   │   └── SpaWebMvpConfig.java  # Serves React SPA & forwards non-API routes
        │   ├── controller/
        │   │   ├── McpSseController.java # /api/mcp/sse & /api/mcp/message
        │   │   └── ChatController.java   # /api/chat/query & /api/chat/config
        │   └── service/
        │       └── AgentGatewayService.java # Gateway client, OAuth tokens & MCP tools
        └── resources/
            ├── application.yml
            └── static/                   # Compiled React assets (dist)
```

---

## ⚡ Features

1. **MCP Bidirectional Transport over SSE**:
   - `GET /api/mcp/sse`: Establishes persistent Server-Sent Events connection and sends the session `endpoint` event.
   - `POST /api/mcp/message?sessionId=<id>`: Receives JSON-RPC 2.0 requests (`initialize`, `tools/list`, `tools/call`, `ping`) and streams responses over SSE.
2. **AI Orchestrator with OAuth 2.0 Token Passing**:
   - Dynamic Bearer token input in the UI or via HTTP `Authorization: Bearer <token>` header.
   - Forwards agent requests to `https://highmarkagentgateway.cloud.run/v1/chat/completions`.
   - Includes automatic prototype simulation mode with rich healthcare data when running offline or before a token is provided.
3. **Data Visualization (Charts & Tables)**:
   - Dynamic table renderer with status badges (Approved, Pending, In-Process).
   - SVG-based distribution bar charts showing claims, inquiry volume, and hospital utilization.
4. **Single Runnable Monorepo**:
   - React assets compile directly into Spring Boot's `classpath:/static/` directory.

---

## 🚀 Running Locally

### Development Mode (with Vite HMR)
- **Terminal 1 (Backend)**: Run the Spring Boot application on port 8080:
  ```bash
  mvn spring-boot:run
  ```
- **Terminal 2 (Frontend)**: Run Vite on port 5173 with proxy to backend:
  ```bash
  cd frontend
  npm run dev
  ```
  Open `http://localhost:5173`.

### Production Build (Single Jar)
From the root directory:
```bash
mvn clean package
java -jar target/mcp-monorepo-app-1.0.0-SNAPSHOT.jar
```
Visit `http://localhost:8080` to access the full application.

---

## ☁️ Deploy to Google Cloud Run

Deploy directly using the included multi-stage `Dockerfile`:

```bash
gcloud run deploy highmark-mcp-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

