package com.example.mcp;

import com.example.mcp.service.AgentGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class McpApplicationTests {

    @Autowired
    private AgentGatewayService agentGatewayService;

    @Test
    void contextLoads() {
        assertNotNull(agentGatewayService);
    }

    @Test
    void testDynamicMcpTools() {
        List<Map<String, Object>> tools = agentGatewayService.getDynamicMcpTools(null);
        assertNotNull(tools);
        assertTrue(tools.size() >= 1);
        assertTrue(tools.stream().anyMatch(t -> "query_claims".equals(t.get("name"))));
    }

    @Test
    void testDynamicToolExecution() {
        Map<String, Object> result = agentGatewayService.executeDynamicTool("query_claims", Map.of("status", "APPROVED"), null);
        assertNotNull(result);
        assertEquals("query_claims", result.get("tool"));
    }

    @Test
    void testAgentQuerySimulation() {
        Map<String, Object> response = agentGatewayService.executeAgentQuery("Please analyze recent claims", null);
        assertNotNull(response);
        assertTrue((Boolean) response.get("success"));
        String content = (String) response.get("content");
        assertTrue(content.contains("json:table"));
        assertTrue(content.contains("json:chart"));
    }
}
