import { useState } from 'react';
import { Rocket, Check, Copy, ClipboardCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useKeys } from '../hooks/useKeys.js';
import { useNavigate } from 'react-router-dom';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? 'https://your-gateway.workers.dev';

function StepCircle({ step, current, complete }: { step: number; current: number; complete: boolean }) {
  if (complete) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white shrink-0">
        <Check className="h-4 w-4" />
      </div>
    );
  }
  if (step === current) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground shrink-0">
        <span className="text-sm font-bold">{step}</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
      <span className="text-sm font-bold">{step}</span>
    </div>
  );
}

export function QuickstartPage() {
  const { createKey } = useKeys();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('My First Key');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<'key' | 'config' | null>(null);
  const [step3Done, setStep3Done] = useState(false);

  const configJson = JSON.stringify(
    {
      mcpServers: {
        'vietnamese-mcp': {
          type: 'streamable-http',
          url: `${GATEWAY_URL}/mcp/momo`,
          headers: {
            Authorization: `Bearer ${createdKey ?? 'your-api-key'}`,
          },
        },
      },
    },
    null,
    2
  );

  const curlExample = `curl -X POST ${GATEWAY_URL}/mcp/momo \\
  -H "Authorization: Bearer ${createdKey ?? 'your-api-key'}" \\
  -H "Content-Type: application/json" \\
  -d '{"method": "tools/list"}'`;

  const copyToClipboard = async (text: string, type: 'key' | 'config') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateKey = async () => {
    setCreating(true);
    const key = await createKey(keyName);
    if (key) {
      setCreatedKey(key);
      setCurrentStep(2);
    }
    setCreating(false);
  };

  const handleMarkComplete = () => {
    setStep3Done(true);
    setTimeout(() => navigate('/'), 1500);
  };

  const step1Complete = createdKey !== null;
  const step2Complete = currentStep > 2;
  const step3Complete = step3Done;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Rocket className="h-6 w-6" /> Get Started
        </h1>
        <p className="text-muted-foreground">Set up your first MCP integration in 3 steps.</p>
      </div>

      {/* Vertical stepper */}
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Step 1: Create API Key */}
        <div className="flex gap-4 items-start">
          <StepCircle step={1} current={currentStep} complete={step1Complete} />
          <Card className={`flex-1 ${currentStep < 1 ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
              <CardTitle>Create an API Key</CardTitle>
              <CardDescription>Generate your first key to authenticate with the gateway.</CardDescription>
            </CardHeader>
            <CardContent>
              {!step1Complete ? (
                <div className="space-y-3">
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="My First Key"
                  />
                  <Button onClick={handleCreateKey} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <Check className="h-4 w-4" /> Key created!
                  </p>
                  <pre className="bg-muted p-3 rounded-md text-sm font-mono break-all">{createdKey}</pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdKey!, 'key')}
                  >
                    {copied === 'key' ? (
                      <><ClipboardCheck className="h-4 w-4 mr-2" /> Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copy Key</>
                    )}
                  </Button>
                  <Alert>
                    <AlertDescription>
                      Save this key now. You won't be able to see it again.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Configure .mcp.json */}
        <div className="flex gap-4 items-start">
          <StepCircle step={2} current={currentStep} complete={step2Complete} />
          <Card className={`flex-1 ${currentStep < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
              <CardTitle>Configure .mcp.json</CardTitle>
              <CardDescription>Add this to your Claude Code configuration.</CardDescription>
            </CardHeader>
            <CardContent>
              {!step2Complete ? (
                <div className="space-y-3">
                  <pre className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">{configJson}</pre>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(configJson, 'config')}
                    >
                      {copied === 'config' ? (
                        <><ClipboardCheck className="h-4 w-4 mr-2" /> Copied!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-2" /> Copy Config</>
                      )}
                    </Button>
                    <Button onClick={() => setCurrentStep(3)}>
                      I've configured it
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <Check className="h-4 w-4" /> Configuration ready
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 3: Test Your Setup */}
        <div className="flex gap-4 items-start">
          <StepCircle step={3} current={currentStep} complete={step3Complete} />
          <Card className={`flex-1 ${currentStep < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
              <CardTitle>Test Your Setup</CardTitle>
              <CardDescription>Make your first tool call to verify everything works.</CardDescription>
            </CardHeader>
            <CardContent>
              {!step3Complete ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Open Claude Code and try a command like:{' '}
                    <span className="font-medium text-foreground">
                      "Use the MoMo MCP server to check a transaction status"
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Or test directly with curl:</p>
                  <pre className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">{curlExample}</pre>
                  <Button onClick={handleMarkComplete}>
                    Mark Complete
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <Check className="h-4 w-4" /> You're all set!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom section */}
      <div className="max-w-2xl mx-auto space-y-2">
        {step3Complete && (
          <p className="text-sm text-muted-foreground text-center">
            All done! Redirecting to dashboard...
          </p>
        )}
        <div className="text-center">
          <Button variant="link" onClick={() => navigate('/')}>
            Skip to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
