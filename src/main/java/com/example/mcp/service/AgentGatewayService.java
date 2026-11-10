package com.example.mcp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * Mediates between React MCP client and Highmark Agent Gateway.
 * Proxies dynamic MCP protocol calls (tools/list, tools/call) and AI orchestrator queries.
 */
@Service
public class AgentGatewayService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${agentgateway.url:https://highmarkagentgateway.cloud.run}")
    private String gatewayUrl;

    @Value("${agentgateway.token:}")
    private String defaultToken;

    public String getGatewayUrl() {
        return gatewayUrl;
    }

    public void setGatewayUrl(String gatewayUrl) {
        this.gatewayUrl = gatewayUrl;
    }

    /**
     * Probes the remote Agent Gateway with a Bearer token to test authorization.
     */
    public Map<String, Object> testGatewayToken(String token) {
        if (token == null || token.isBlank()) {
            return Map.of("valid", false, "message", "No Bearer token provided");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayUrl.replaceAll("/+$", "") + "/"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token.trim())
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            boolean isValid = response.statusCode() != 401 && response.statusCode() != 403;

            return Map.of(
                    "valid", isValid,
                    "statusCode", response.statusCode(),
                    "message", isValid
                            ? "Connected successfully to Highmark Agent Gateway (HTTP " + response.statusCode() + ")"
                            : "Authentication failed: Gateway returned HTTP " + response.statusCode()
            );
        } catch (Exception ex) {
            return Map.of(
                    "valid", false,
                    "error", ex.getMessage(),
                    "message", "Connection error reaching " + gatewayUrl + ": " + ex.getMessage()
            );
        }
    }

    /**
     * Dynamically fetches tools from the remote Agent Gateway MCP server.
     */
    public List<Map<String, Object>> getDynamicMcpTools(String userToken) {
        String tokenToUse = (userToken != null && !userToken.isBlank()) ? userToken.trim() : defaultToken;

        if (tokenToUse != null && !tokenToUse.isBlank()) {
            try {
                // MCP JSON-RPC 2.0 payload to list tools dynamically
                Map<String, Object> rpcPayload = Map.of(
                        "jsonrpc", "2.0",
                        "id", UUID.randomUUID().toString(),
                        "method", "tools/list",
                        "params", Map.of()
                );

                String responseBody = forwardMcpRpcToGateway(rpcPayload, tokenToUse);
                JsonNode root = objectMapper.readTree(responseBody);
                if (root.has("result") && root.get("result").has("tools")) {
                    List<Map<String, Object>> tools = new ArrayList<>();
                    for (JsonNode toolNode : root.get("result").get("tools")) {
                        tools.add(objectMapper.convertValue(toolNode, Map.class));
                    }
                    return tools;
                }
            } catch (Exception ex) {
                System.err.println("Could not dynamically fetch tools from gateway: " + ex.getMessage());
            }
        }

        // Informational fallback when unauthenticated or during local prototyping
        return List.of(
                Map.of(
                        "name", "query_claims",
                        "description", "Dynamic claims inquiry (dispatched to Agent Gateway)",
                        "inputSchema", Map.of(
                                "type", "object",
                                "properties", Map.of("status", Map.of("type", "string"))
                        )
                ),
                Map.of(
                        "name", "get_patient_metrics",
                        "description", "Dynamic patient KPI inquiry (dispatched to Agent Gateway)",
                        "inputSchema", Map.of(
                                "type", "object",
                                "properties", Map.of("timeframe", Map.of("type", "string"))
                        )
                ),
                Map.of(
                        "name", "network_utilization",
                        "description", "Dynamic provider network analysis (dispatched to Agent Gateway)",
                        "inputSchema", Map.of(
                                "type", "object",
                                "properties", Map.of("region", Map.of("type", "string"))
                        )
                )
        );
    }

    /**
     * Forwards an MCP tool invocation dynamically to the remote Agent Gateway.
     */
    public Map<String, Object> executeDynamicTool(String toolName, Map<String, Object> arguments, String userToken) {
        String tokenToUse = (userToken != null && !userToken.isBlank()) ? userToken.trim() : defaultToken;

        if (tokenToUse != null && !tokenToUse.isBlank()) {
            try {
                Map<String, Object> rpcPayload = Map.of(
                        "jsonrpc", "2.0",
                        "id", UUID.randomUUID().toString(),
                        "method", "tools/call",
                        "params", Map.of(
                                "name", toolName,
                                "arguments", arguments != null ? arguments : Map.of()
                        )
                );

                String responseBody = forwardMcpRpcToGateway(rpcPayload, tokenToUse);
                JsonNode root = objectMapper.readTree(responseBody);
                if (root.has("result")) {
                    return objectMapper.convertValue(root.get("result"), Map.class);
                } else if (root.has("error")) {
                    return Map.of("error", root.get("error").toString());
                }
                return Map.of("response", responseBody);
            } catch (Exception ex) {
                return Map.of("error", "Failed to forward tool call to Agent Gateway: " + ex.getMessage());
            }
        }

        // Prototype fallback response for UI demonstration when token is absent
        return Map.of(
                "tool", toolName,
                "status", "simulated",
                "note", "Provide OAuth Bearer token to execute dynamically on Highmark Agent Gateway",
                "arguments", arguments != null ? arguments : Map.of()
        );
    }

    /**
     * Forwards raw JSON-RPC to the Agent Gateway MCP endpoint.
     */
    private String forwardMcpRpcToGateway(Map<String, Object> payload, String token) throws Exception {
        String requestBody = objectMapper.writeValueAsString(payload);
        String url = gatewayUrl.replaceAll("/+$", "") + "/mcp/message";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    /**
     * Dispatches chat prompt to Agent Gateway with OAuth 2.0 Bearer token.
     */
    public Map<String, Object> executeAgentQuery(String prompt, String userToken) {
        String tokenToUse = (userToken != null && !userToken.isBlank()) ? userToken.trim() : defaultToken;

        if (tokenToUse != null && !tokenToUse.isBlank()) {
            try {
                Map<String, Object> payload = Map.of(
                        "prompt", prompt,
                        "stream", false
                );

                String requestBody = objectMapper.writeValueAsString(payload);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(gatewayUrl.replaceAll("/+$", "") + "/v1/chat/completions"))
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenToUse)
                        .timeout(Duration.ofSeconds(60))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    JsonNode node = objectMapper.readTree(response.body());
                    return Map.of(
                            "success", true,
                            "content", node.has("response") ? node.get("response").asText() : response.body(),
                            "raw", response.body()
                    );
                } else {
                    return Map.of(
                            "success", false,
                            "statusCode", response.statusCode(),
                            "error", "Agent Gateway responded with status: " + response.statusCode(),
                            "details", response.body()
                    );
                }
            } catch (Exception ex) {
                return Map.of(
                        "success", false,
                        "error", "Gateway connection failed: " + ex.getMessage(),
                        "fallback", generateSimulatedResponse(prompt)
                );
            }
        }

        return Map.of(
                "success", true,
                "note", "Using built-in Agent Gateway prototype orchestrator (OAuth token not set)",
                "content", generateSimulatedResponse(prompt)
        );
    }

    private String generateSimulatedResponse(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("claim") || lower.contains("cost") || lower.contains("billing")) {
            return "Here is the claims breakdown requested from Highmark Agent Gateway:\n\n" +
                    "### Claims Summary\n" +
                    "We identified 4 recent claims in this cycle. Total requested coverage amount is **$13,590.00**.\n\n" +
                    "```json:table\n" +
                    "[\n" +
                    "  {\"claimId\": \"CLM-90210\", \"patient\": \"John Doe\", \"department\": \"Cardiology\", \"amount\": \"$1,450.00\", \"status\": \"APPROVED\"},\n" +
                    "  {\"claimId\": \"CLM-90211\", \"patient\": \"Sarah Jenkins\", \"department\": \"Radiology\", \"amount\": \"$620.00\", \"status\": \"PENDING\"},\n" +
                    "  {\"claimId\": \"CLM-90212\", \"patient\": \"Robert Smith\", \"department\": \"Orthopedics\", \"amount\": \"$3,120.00\", \"status\": \"APPROVED\"},\n" +
                    "  {\"claimId\": \"CLM-90213\", \"patient\": \"Maria Gonzalez\", \"department\": \"Oncology\", \"amount\": \"$8,400.00\", \"status\": \"IN_PROCESS\"}\n" +
                    "]\n" +
                    "```\n\n" +
                    "```json:chart\n" +
                    "[\n" +
                    "  {\"label\": \"Cardiology\", \"value\": 1450},\n" +
                    "  {\"label\": \"Radiology\", \"value\": 620},\n" +
                    "  {\"label\": \"Orthopedics\", \"value\": 3120},\n" +
                    "  {\"label\": \"Oncology\", \"value\": 8400}\n" +
                    "]\n" +
                    "```\n";
        }

        return "Agent Orchestrator processed your query: \"" + prompt + "\".\n\n" +
                "### Performance & Network Health\n" +
                "Overall provider response rate is currently at 94.6%.\n\n" +
                "```json:chart\n" +
                "[\n" +
                "  {\"label\": \"Jan\", \"value\": 420},\n" +
                "  {\"label\": \"Feb\", \"value\": 530},\n" +
                "  {\"label\": \"Mar\", \"value\": 610},\n" +
                "  {\"label\": \"Apr\", \"value\": 580},\n" +
                "  {\"label\": \"May\", \"value\": 720}\n" +
                "]\n" +
                "```\n\n" +
                "```json:table\n" +
                "[\n" +
                "  {\"kpi\": \"Average Turnaround\", \"current\": \"18.4 hrs\", \"target\": \"24.0 hrs\", \"status\": \"NORMAL\"},\n" +
                "  {\"kpi\": \"Resolution Rate\", \"current\": \"91.2%\", \"target\": \"88.0%\", \"status\": \"OPTIMAL\"},\n" +
                "  {\"kpi\": \"Member CSAT\", \"current\": \"4.85 / 5\", \"target\": \"4.50 / 5\", \"status\": \"OPTIMAL\"}\n" +
                "]\n" +
                "```\n";
    }
}
