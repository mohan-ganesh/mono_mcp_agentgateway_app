package com.example.mcp.controller;

import com.example.mcp.service.AgentGatewayService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/mcp")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class McpSseController {

    private final AgentGatewayService agentGatewayService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Store active streams mapped to their unique MCP session IDs
    private final Map<String, SseEmitter> activeSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionTokens = new ConcurrentHashMap<>();

    public McpSseController(AgentGatewayService agentGatewayService) {
        this.agentGatewayService = agentGatewayService;
    }

    // 1. Establish the persistent bidirectional stream
    @GetMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleSseConnect(
            @RequestParam(value = "token", required = false) String token,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String mcpSessionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(1800000L);

        activeSessions.put(mcpSessionId, emitter);

        String tokenToStore = null;
        if (token != null && !token.isBlank()) {
            tokenToStore = token.trim();
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            tokenToStore = authHeader.substring(7).trim();
        }

        if (tokenToStore != null) {
            sessionTokens.put(mcpSessionId, tokenToStore);
        }

        emitter.onCompletion(() -> {
            activeSessions.remove(mcpSessionId);
            sessionTokens.remove(mcpSessionId);
        });
        emitter.onTimeout(() -> {
            activeSessions.remove(mcpSessionId);
            sessionTokens.remove(mcpSessionId);
        });
        emitter.onError((ex) -> {
            activeSessions.remove(mcpSessionId);
            sessionTokens.remove(mcpSessionId);
        });

        try {
            // Mandated by MCP Spec: Send the initialization endpoint event down the channel
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data("/api/mcp/message?sessionId=" + mcpSessionId));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    // 2. Receive JSON-RPC client messages (Tools execution, responses)
    @PostMapping("/message")
    public ResponseEntity<Void> handleMcpMessage(
            @RequestParam("sessionId") String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody String jsonRpcPayload) {

        SseEmitter clientEmitter = activeSessions.get(sessionId);
        if (clientEmitter == null) {
            return ResponseEntity.notFound().build();
        }

        String token = sessionTokens.get(sessionId);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        }

        // Process MCP JSON-RPC protocol dynamically
        try {
            JsonNode rootNode = objectMapper.readTree(jsonRpcPayload);
            JsonNode idNode = rootNode.get("id");
            String method = rootNode.has("method") ? rootNode.get("method").asText() : "";

            Map<String, Object> rpcResponse = new LinkedHashMap<>();
            rpcResponse.put("jsonrpc", "2.0");
            if (idNode != null) {
                rpcResponse.put("id", idNode.isNumber() ? idNode.asLong() : idNode.asText());
            }

            if ("initialize".equalsIgnoreCase(method)) {
                rpcResponse.put("result", Map.of(
                        "protocolVersion", "2024-11-05",
                        "capabilities", Map.of(
                                "tools", Map.of("listChanged", true),
                                "resources", Map.of(),
                                "prompts", Map.of()
                        ),
                        "serverInfo", Map.of(
                                "name", "AgentGateway-MCP-Proxy",
                                "version", "1.0.0"
                        )
                ));
                sendSseMessage(clientEmitter, rpcResponse);

            } else if ("notifications/initialized".equalsIgnoreCase(method)) {
                return ResponseEntity.accepted().build();

            } else if ("ping".equalsIgnoreCase(method)) {
                rpcResponse.put("result", Map.of());
                sendSseMessage(clientEmitter, rpcResponse);

            } else if ("tools/list".equalsIgnoreCase(method)) {
                // Dynamically fetch tools from remote Agent Gateway
                List<Map<String, Object>> tools = agentGatewayService.getDynamicMcpTools(token);
                rpcResponse.put("result", Map.of("tools", tools));
                sendSseMessage(clientEmitter, rpcResponse);

            } else if ("tools/call".equalsIgnoreCase(method)) {
                // Dynamically execute tool on remote Agent Gateway
                JsonNode params = rootNode.get("params");
                String toolName = params != null && params.has("name") ? params.get("name").asText() : "";
                Map<String, Object> arguments = new HashMap<>();
                if (params != null && params.has("arguments")) {
                    arguments = objectMapper.convertValue(params.get("arguments"), Map.class);
                }

                Map<String, Object> dynamicToolResult = agentGatewayService.executeDynamicTool(toolName, arguments, token);

                rpcResponse.put("result", Map.of(
                        "content", List.of(
                                Map.of(
                                        "type", "text",
                                        "text", objectMapper.writeValueAsString(dynamicToolResult)
                                )
                        ),
                        "isError", false
                ));
                sendSseMessage(clientEmitter, rpcResponse);

            } else {
                rpcResponse.put("result", Map.of("status", "ok", "method", method));
                sendSseMessage(clientEmitter, rpcResponse);
            }

        } catch (Exception ex) {
            Map<String, Object> errorResponse = Map.of(
                    "jsonrpc", "2.0",
                    "error", Map.of(
                            "code", -32603,
                            "message", "MCP Proxy Error: " + ex.getMessage()
                    )
            );
            sendSseMessage(clientEmitter, errorResponse);
        }

        return ResponseEntity.accepted().build();
    }

    private void sendSseMessage(SseEmitter emitter, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(json));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }
}
