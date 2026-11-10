# Monorepo MCP Agent Gateway Project

The goal of this project is to create a monorepo for building and deploying AI agents that demonstrates the following capabilities:

1. **Connects to Highmark Agent Gateway using MCP**:
   - Upstream URL: `https://highmarkagentgateway.cloud.run/`
   - Spring Boot acts as an authenticated protocol bridge and dynamic MCP proxy.
   - Dynamic tool discovery (`tools/list`) and dynamic tool execution (`tools/call`) are forwarded with OAuth 2.0 Bearer tokens.

2. **Monorepo Architecture (Spring Boot 3 + React + Vite)**:
   - Root `pom.xml` uses `frontend-maven-plugin` to compile React assets into Spring Boot's static classpath (`/static`).
   - Single executable fat JAR: `target/mcp-monorepo-app-1.0.0-SNAPSHOT.jar`.
   - Supports local hot reloading with Vite proxy to `:8080`.

3. **Conversational UI with Charts and Tables**:
   - React interface built with `@modelcontextprotocol/sdk` and TailwindCSS.
   - In-app OAuth 2.0 Bearer token configuration bar.
   - Intelligent visualizer for streaming responses: renders structured tables with status chips and distribution bar charts.
   - Interactive MCP Tool Runner and Inspector over Server-Sent Events (`/api/mcp/sse`).

4. **Cloud Run Deployment Ready**:
   - `Dockerfile`: Multi-stage build (Maven 3.9 + Java 17 Temurin) with `$PORT` binding.
   - `cloudbuild.yaml`: Automated Google Cloud Build CI/CD pipeline.

---

### Quick Start

```bash
# Build the unified monorepo jar
mvn clean package

# Run locally
java -jar target/mcp-monorepo-app-1.0.0-SNAPSHOT.jar

# Deploy to Google Cloud Run
gcloud run deploy highmark-mcp-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```
