import { useState } from 'react';
import { Terminal, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SERVERS, type ToolSchema, type ToolParam } from '../lib/tool-schemas.js';
import { useKeys } from '../hooks/useKeys.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

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

            {/* API key selector */}
            <div className="space-y-1.5 border-t pt-4">
              <label className="text-sm font-medium">API Key</label>
              {activeKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active keys.{' '}
                  <Link to="/keys" className="text-primary underline">
                    Create an API key first
                  </Link>
                  .
                </p>
              ) : (
                <Select value={selectedKeyId ?? ''} onValueChange={setSelectedKeyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an API key..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeKeys.map((key) => (
                      <SelectItem key={key.id} value={key.id}>
                        {key.name} ({key.key_prefix}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Execute button (disabled — Plan 02 wires this) */}
            <Button disabled className="w-full">
              <Play className="h-4 w-4" />
              Execute
            </Button>
          </CardContent>
        </Card>

        {/* Right panel: response preview */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-mono">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground font-mono text-center">
                Execute a tool call to see the request and response here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
