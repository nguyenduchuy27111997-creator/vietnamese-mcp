import { AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUsage } from '../hooks/useUsage.js';
import { ExportSection } from '../components/ExportSection.js';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Simulate 30-day daily data from monthly total
function generateDailyData(monthlyTotal: number): { day: string; calls: number }[] {
  const days: { day: string; calls: number }[] = [];
  const now = new Date();
  let remaining = monthlyTotal;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Distribute with slight randomness for visual interest — more calls on recent days
    const weight = (30 - i) / 30;
    const base = monthlyTotal / 30;
    const calls = i === 0 ? remaining : Math.max(0, Math.round(base * (0.5 + weight) + (Math.random() - 0.5) * base * 0.3));
    remaining -= calls;
    days.push({ day: label, calls: Math.max(0, calls) });
  }
  // Adjust last day to account for rounding
  if (days.length > 0) {
    days[days.length - 1].calls = Math.max(0, days[days.length - 1].calls + remaining);
  }
  return days;
}

// Simulated per-server breakdown (5 MCP servers)
const SERVER_NAMES = ['MoMo', 'ZaloPay', 'VNPAY', 'Zalo OA', 'ViettelPay'];
const SERVER_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08]; // Realistic distribution

function generateServerBreakdown(total: number) {
  return SERVER_NAMES.map((name, i) => ({
    server: name,
    calls: Math.round(total * SERVER_WEIGHTS[i]),
    percentage: Math.round(SERVER_WEIGHTS[i] * 100),
  }));
}

export function UsagePage() {
  const { usage, loading, error } = useUsage();

  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? 1;
  const tier = usage?.tier ?? 'free';
  const resetsAt = usage?.resetsAt ?? '';
  const usagePercent = Math.round((used / limit) * 100);
  const isWarning = usagePercent >= 80;

  const dailyData = generateDailyData(used);
  const serverBreakdown = generateServerBreakdown(used);

  const resetDate = resetsAt
    ? new Date(resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage & Analytics</h1>
        <p className="text-muted-foreground">Monitor your API consumption and trends.</p>
      </div>

      {/* Warning banner at 80%+ */}
      {!loading && isWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approaching usage limit</AlertTitle>
          <AlertDescription>
            You have used {usagePercent}% of your {tier} tier limit ({used.toLocaleString()} / {limit.toLocaleString()} calls).
            {tier === 'free' && ' Consider upgrading your plan to avoid interruptions.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Usage</CardTitle>
            <CardDescription>
              {resetDate && `Resets ${resetDate}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">{tier}</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading usage data...</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{used.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/ {limit.toLocaleString()} calls</span>
              </div>
              <Progress value={usagePercent} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-2">{usagePercent}% of monthly limit used</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Daily API Calls (Last 30 Days)</CardTitle>
          <CardDescription>Simulated daily distribution from monthly total. Daily breakdown coming in a future update.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCalls)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Export usage data */}
      <ExportSection />

      {/* Per-server breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Per-Server Breakdown</CardTitle>
          <CardDescription>Estimated distribution across MCP servers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serverBreakdown.map((s) => (
                <TableRow key={s.server}>
                  <TableCell className="font-medium">{s.server}</TableCell>
                  <TableCell className="text-right">{s.calls.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
