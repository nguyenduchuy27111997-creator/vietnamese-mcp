import { useState } from 'react';
import { Terminal, Play, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SERVERS, type ToolSchema, type ToolParam } from '../lib/tool-schemas.js';
import { useKeys } from '../hooks/useKeys.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

function ParamField({
  param,
  value,
  onChange,
}: {
  param: ToolParam;
  value: string | number | boolean;
  onChange: (val: string | number | boolean) => void;
}) {
  const labelId = `param-${param.name}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={labelId} className="text-sm font-medium flex items-center gap-1">
        {param.name}
        {param.required && <span className="text-destructive">*</span>}
      </label>
      {param.type === 'boolean' ? (
        <div className="flex items-center gap-2">
          <Switch
            id={labelId}
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">
            {value ? 'true' : 'false'}
          </span>
        </div>
      ) : param.type === 'string' && param.enumValues && param.enumValues.length > 0 ? (
        <Select
          value={value as string}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger id={labelId}>
            <SelectValue placeholder={param.required ? 'Select value (required)' : 'Select value (optional)'} />
          </SelectTrigger>
          <SelectContent>
            {param.enumValues.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : param.type === 'number' ? (
        <Input
          id={labelId}
          type="number"
          value={value as number}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={param.required ? 'Enter number (required)' : 'Enter number (optional)'}
        />
      ) : (
        <Input
          id={labelId}
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.required ? 'Enter value (required)' : 'Enter value (optional)'}
        />
      )}
      <p className="text-xs text-muted-foreground">{param.description}</p>
    </div>
  );
}

function initParams(tool: ToolSchema): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const param of tool.params) {
    if (param.type === 'boolean') {
      result[param.name] = param.default !== undefined ? (param.default as boolean) : false;
    } else if (param.type === 'number') {
      result[param.name] = param.default !== undefined ? (param.default as number) : '';
    } else {
      result[param.name] = param.default !== undefined ? (param.default as string) : '';
    }
  }
  return result;
}

export function PlaygroundPage() {
  const { keys } = useKeys();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string | number | boolean>>({});
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<object | null>(null);
  const [response, setResponse] = useState<{ error: boolean; status: number; body: unknown } | null>(null);

  const activeServer = SERVERS.find((s) => s.id === selectedServerId) ?? null;
  const activeTool = activeServer?.tools.find((t) => t.name === selectedToolName) ?? null;
  const activeKeys = keys.filter((k) => !k.revoked_at);

  function handleServerChange(serverId: string) {
    setSelectedServerId(serverId);
    setSelectedToolName(null);
    setParams({});
  }

  function handleToolChange(toolName: string) {
    setSelectedToolName(toolName);
    const tool = activeServer?.tools.find((t) => t.name === toolName);
    if (tool) {
      setParams(initParams(tool));
    }
  }

  function handleParamChange(name: string, value: string | number | boolean) {
    setParams((prev) => ({ ...prev, [name]: value }));
  }

  function buildArgs(): Record<string, unknown> {
    if (!activeTool) return {};
    const args: Record<string, unknown> = {};
    for (const param of activeTool.params) {
      const val = params[param.name];
      if (param.type === 'number') {
        if (val !== '' && val !== undefined) {
          args[param.name] = Number(val);
        } else if (param.required) {
          args[param.name] = Number(val);
        }
      } else if (param.type === 'boolean') {
        args[param.name] = val === true || val === 'true';
      } else {
        // string
        if (val !== '' && val !== undefined) {
          args[param.name] = val;
        } else if (param.required) {
          args[param.name] = val;
        }
      }
    }
    return args;
  }

  async function executeCall() {
    if (!selectedServerId || !selectedToolName || !apiKey) return;

    setLoading(true);
    setResponse(null);

    const requestBody = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call' as const,
      params: {
        name: selectedToolName,
        arguments: buildArgs(),
      },
    };

    setRequest(requestBody);

    const url = `${GATEWAY_URL}/mcp/${selectedServerId}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        setResponse({ error: true, status: res.status, body: errText });
        return;
      }

      // Parse SSE response
      const text = await res.text();
      // SSE format: "event: message\ndata: {json}\n\n"
      const lines = text.split('\n');
      let jsonData: unknown = null;
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            jsonData = JSON.parse(line.slice(6));
          } catch { /* skip non-JSON lines */ }
        }
      }

      // If response is plain JSON (not SSE), try parsing directly
      if (!jsonData) {
        try {
          jsonData = JSON.parse(text);
        } catch {
          jsonData = { raw: text };
        }
      }

      setResponse({ error: false, status: res.status, body: jsonData });
    } catch (err) {
      setResponse({ error: true, status: 0, body: String(err) });
    } finally {
      setLoading(false);
    }
  }

  function copyRequest() {
    if (request) {
      navigator.clipboard.writeText(JSON.stringify(request, null, 2));
    }
  }

  function copyResponse() {
    if (response) {
      const text =
        typeof response.body === 'string'
          ? response.body
          : JSON.stringify(response.body, null, 2);
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Terminal className="h-6 w-6" /> API Playground
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test tool calls against the gateway
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configure Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Server selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Server</label>
              <Select value={selectedServerId ?? ''} onValueChange={handleServerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a server..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVERS.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tool selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tool</label>
              <Select
                value={selectedToolName ?? ''}
                onValueChange={handleToolChange}
                disabled={!selectedServerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedServerId ? 'Select a tool...' : 'Select a server first'} />
                </SelectTrigger>
                <SelectContent>
                  {activeServer?.tools.map((tool) => (
                    <SelectItem key={tool.name} value={tool.name}>
                      <div>
                        <span className="font-mono text-xs">{tool.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          — {tool.description.slice(0, 50)}{tool.description.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parameter form */}
            {activeTool && activeTool.params.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">Parameters</p>
                {activeTool.params.map((param) => (
                  <ParamField
                    key={param.name}
                    param={param}
                    value={params[param.name] ?? (param.type === 'boolean' ? false : '')}
                    onChange={(val) => handleParamChange(param.name, val)}
                  />
                ))}
              </div>
            )}

            {activeTool && activeTool.params.length === 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">This tool has no parameters.</p>
              </div>
            )}

            {/* API key input */}
            <div className="space-y-1.5 border-t pt-4">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_test_..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowApiKey((v) => !v)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste your full API key (from{' '}
                <Link to="/keys" className="text-primary underline">
                  API Keys page
                </Link>
                ). {activeKeys.length > 0 && `You have ${activeKeys.length} active key${activeKeys.length > 1 ? 's' : ''}: ${activeKeys.map(k => `${k.name} (${k.key_prefix}...)`).join(', ')}.`}
              </p>
            </div>

            {/* Execute button */}
            <Button
              onClick={executeCall}
              disabled={!selectedServerId || !selectedToolName || !apiKey || loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Executing...' : 'Execute'}
            </Button>
          </CardContent>
        </Card>

        {/* Right panel: request/response */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-mono">Request / Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response">
              <TabsList className="mb-4">
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>

              <TabsContent value="request">
                {request ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={copyRequest}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="bg-muted rounded-lg p-4 overflow-auto max-h-[600px] text-sm font-mono text-foreground">
                      <code>{JSON.stringify(request, null, 2)}</code>
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm p-4">
                    Execute a tool call to see the request payload.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="response">
                {response ? (
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={response.error ? 'destructive' : 'default'}>
                        {response.status || 'Error'}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={copyResponse}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="bg-muted rounded-lg p-4 overflow-auto max-h-[560px] text-sm font-mono text-foreground">
                      <code>
                        {typeof response.body === 'string'
                          ? response.body
                          : JSON.stringify(response.body, null, 2)}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm p-4">
                    Execute a tool call to see the response here.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
