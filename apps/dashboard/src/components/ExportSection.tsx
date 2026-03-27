import { useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../supabase.js';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

type Preset = 'last7' | 'last30' | 'last90' | 'custom';

function toYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(preset: Preset, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date();
  const end = toYYYYMMDD(today);

  if (preset === 'last7') {
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    return { start: toYYYYMMDD(start), end };
  }
  if (preset === 'last30') {
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    return { start: toYYYYMMDD(start), end };
  }
  if (preset === 'last90') {
    const start = new Date(today);
    start.setDate(today.getDate() - 90);
    return { start: toYYYYMMDD(start), end };
  }
  // custom
  return { start: customStart, end: customEnd };
}

export function ExportSection() {
  const [preset, setPreset] = useState<Preset>('last30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState(toYYYYMMDD(new Date()));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setDownloading(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const auth = token ? `Bearer ${token}` : null;

    if (!auth) {
      setError('Not authenticated. Please log in and try again.');
      setDownloading(false);
      return;
    }

    const { start, end } = getDateRange(preset, customStart, customEnd);

    try {
      const res = await fetch(`${GATEWAY_URL}/usage/export?start=${start}&end=${end}`, {
        headers: { Authorization: auth },
      });

      if (!res.ok) {
        let message = `Export failed (${res.status})`;
        try {
          const json = await res.json() as { error?: string; message?: string };
          message = json.error ?? json.message ?? message;
        } catch {
          // ignore JSON parse errors — use default message
        }
        setError(message);
        setDownloading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = `usage-export-${toYYYYMMDD(new Date())}.csv`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    }

    setDownloading(false);
  }

  const isCustomInvalid = preset === 'custom' && (!customStart || !customEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Export Usage Data</CardTitle>
        <CardDescription>Download your usage data as a CSV file.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Date range select */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date Range</label>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="last90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date inputs — only visible when preset === 'custom' */}
          {preset === 'custom' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Start</label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">End</label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </>
          )}

          {/* Export button */}
          <Button
            onClick={handleExport}
            disabled={downloading || isCustomInvalid}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Error display */}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
