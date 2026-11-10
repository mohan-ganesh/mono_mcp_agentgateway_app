import { useState, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import AgentConsole from './components/AgentConsole';
import { MessageSquare, Wrench, Cloud, Layers, ShieldCheck, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'mcp' | 'deploy'>('chat');
  const [authToken, setAuthToken] = useState<string>(() => {
    return localStorage.getItem('agent_oauth_token') || '';
  });

  useEffect(() => {
    localStorage.setItem('agent_oauth_token', authToken);
  }, [authToken]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-gray-900">
                  MCP Agent Gateway Monorepo
                </h1>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                  Spring Boot + React + Cloud Run
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Connected to <span className="font-mono text-gray-700">https://highmarkagentgateway.cloud.run/</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Agent Chat (Charts & Tables)
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'mcp'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              MCP SSE Inspector
            </button>

            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'deploy'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              Cloud Run Deploy
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'chat' && (
          <div className="space-y-6">
            <ChatInterface
              authToken={authToken}
              onTokenChange={setAuthToken}
            />
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <AgentConsole authToken={authToken} />
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-indigo-600" />
                Google Cloud Run Deployment & Build Instructions
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                How to compile this monorepo into a single artifact and deploy to Google Cloud Run.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-xs text-gray-800 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  1. Local Monorepo Build
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Frontend is compiled by <code className="text-indigo-600 font-mono">frontend-maven-plugin</code> and copied into Spring Boot static resources:
                </p>
                <div className="rounded bg-slate-900 p-3 text-xs font-mono text-slate-100">
                  mvn clean package<br />
                  java -jar target/mcp-monorepo-app-1.0.0-SNAPSHOT.jar
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-xs text-gray-800 mb-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  2. Deploy to Cloud Run
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Build and submit directly using Google Cloud Build to Cloud Run:
                </p>
                <div className="rounded bg-slate-900 p-3 text-xs font-mono text-slate-100">
                  gcloud run deploy highmark-mcp-app \<br />
                  &nbsp;&nbsp;--source . \<br />
                  &nbsp;&nbsp;--platform managed \<br />
                  &nbsp;&nbsp;--region us-central1 \<br />
                  &nbsp;&nbsp;--allow-unauthenticated
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <h3 className="text-xs font-semibold text-indigo-900 mb-1">Architecture Highlights:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-indigo-800">
                <li><strong>Hybrid Transport:</strong> SSE channel (<code className="font-mono">/api/mcp/sse</code>) + JSON-RPC HTTP POST (<code className="font-mono">/api/mcp/message</code>).</li>
                <li><strong>Spring Boot Orchestrator:</strong> Mediates between React and <code className="font-mono">highmarkagentgateway.cloud.run</code> with OAuth 2.0 Bearer tokens.</li>
                <li><strong>Rich Data Visualization:</strong> Dynamic rendering of tables, KPIs, and distribution charts from MCP tool outputs.</li>
                <li><strong>Single Artifact:</strong> Cloud Run runs a standard Java 17 container on port <code className="font-mono">$PORT</code>.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

