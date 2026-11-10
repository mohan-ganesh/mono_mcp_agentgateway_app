import { useState } from 'react';
import { useMcpClient } from '../hooks/useMcpClient';
import { Wrench, Play, RefreshCw, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

export default function AgentConsole({ authToken = '' }: { authToken?: string }) {
  const sseUrl = authToken.trim()
    ? `/api/mcp/sse?token=${encodeURIComponent(authToken.trim())}`
    : '/api/mcp/sse';
  const { client, isConnected, error } = useMcpClient(sseUrl);
  const [tools, setTools] = useState<any[]>([]);
  const [result, setResult] = useState<string>('');
  const [loadingTool, setLoadingTool] = useState<string | null>(null);

  // Discover what tools the Java application provides
  const fetchAvailableTools = async () => {
    if (!client || !isConnected) return;
    try {
      const response = await client.listTools();
      setTools(response.tools || []);
    } catch (err) {
      console.error('Error retrieving tools:', err);
    }
  };

  // Trigger an action over the stream
  const executeTool = async (toolName: string) => {
    if (!client || !isConnected) return;
    setLoadingTool(toolName);
    try {
      const runResult = await client.callTool({
        name: toolName,
        arguments: { lookupId: '12345', timeframe: '6m' }
      });
      const textContent = Array.isArray(runResult.content)
        ? runResult.content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
        : JSON.stringify(runResult.content);

      setResult(textContent);
    } catch (err: any) {
      console.error('Execution failed:', err);
      setResult('Error executing tool: ' + (err.message || String(err)));
    } finally {
      setLoadingTool(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            MCP Protocol Inspector & Tool Runner
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Direct SSE channel to Spring Boot MCP Server (Session endpoint + JSON-RPC bidirectional stream)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Connected (SSE Stream Active)
            </span>
          ) : error ? (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 border border-red-200">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              SSE Standby
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
              Connecting...
            </span>
          )}

          <button
            onClick={fetchAvailableTools}
            disabled={!isConnected}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Discover Tools
          </button>
        </div>
      </div>

      {/* Available Tools Grid */}
      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Registered MCP Tools ({tools.length})
        </h4>

        {tools.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
            Click "Discover Tools" to query the Spring Boot MCP Server via JSON-RPC over SSE.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tools.map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-gray-900">{t.name}</div>
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{t.description}</p>
                </div>
                <button
                  onClick={() => executeTool(t.name)}
                  disabled={loadingTool === t.name}
                  className="mt-3 flex items-center justify-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-indigo-600 border border-gray-200 hover:bg-indigo-50 shadow-sm disabled:opacity-50"
                >
                  <Play className="h-3 w-3" />
                  {loadingTool === t.name ? 'Running...' : 'Run Tool'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Console */}
      {result && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
            <Terminal className="h-4 w-4 text-gray-500" />
            Last Execution Output
          </div>
          <div className="rounded-lg bg-slate-900 p-4 text-xs font-mono text-slate-100 overflow-x-auto">
            <pre>{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
