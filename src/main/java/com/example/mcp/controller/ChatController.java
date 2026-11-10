package com.example.mcp.controller;

import com.example.mcp.service.AgentGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class ChatController {

    private final AgentGatewayService agentGatewayService;

    public ChatController(AgentGatewayService agentGatewayService) {
        this.agentGatewayService = agentGatewayService;
    }

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> handleChatQuery(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> request) {

        String prompt = request.getOrDefault("prompt", "");
        String tokenFromPayload = request.get("token");

        String token = null;
        if (tokenFromPayload != null && !tokenFromPayload.isBlank()) {
            token = tokenFromPayload;
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        Map<String, Object> response = agentGatewayService.executeAgentQuery(prompt, token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of(
                "gatewayUrl", agentGatewayService.getGatewayUrl(),
                "mcpSseEndpoint", "/api/mcp/sse",
                "status", "ONLINE"
        ));
    }
}

