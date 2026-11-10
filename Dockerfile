# Stage 1: Build with Maven and JDK 17
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace

# Copy pom.xml and frontend sources
COPY pom.xml .
COPY frontend/package.json frontend/
COPY frontend/ frontend/
COPY src/ src/

# Package the application (frontend-maven-plugin will install node, compile React, copy to static resources)
RUN mvn clean package -DskipTests

# Stage 2: Lightweight JRE runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the fat jar from builder
COPY --from=builder /workspace/target/mcp-monorepo-app-1.0.0-SNAPSHOT.jar app.jar

# Cloud Run defaults
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]

