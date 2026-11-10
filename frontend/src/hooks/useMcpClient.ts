import { useEffect, useState, useRef } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export function useMcpClient(sseUrl: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const transportRef = useRef<SSEClientTransport | null>(null);

  useEffect(() => {
    // 1. Create the SSE transport layer pointing to the Java backend
    const transport = new SSEClientTransport(new URL(sseUrl, window.location.origin));
    transportRef.current = transport;

    // 2. Instantiate the standard MCP Client container
    const mcpClient = new Client(
      { name: 'react-embedded-client', version: '1.0.0' },
      { capabilities: { sampling: {} } }
    );

    async function startMcp() {
      try {
        // 3. Connect and perform the handshake
        await mcpClient.connect(transport);
        setClient(mcpClient);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.warn('MCP connection attempt:', err);
        setError(err instanceof Error ? err : new Error('Failed to connect to MCP Server'));
      }
    }

    startMcp();

    // Cleanup hook on unmount
    return () => {
      if (transportRef.current) {
        transportRef.current.close().catch(console.error);
      }
      setIsConnected(false);
      setClient(null);
    };
  }, [sseUrl]);

  return { client, isConnected, error };
}
