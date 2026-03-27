import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useWebhookLogs, type WebhookLog } from '../hooks/useWebhookLogs.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function ProviderBadge({ provider }: { provider: WebhookLog['provider'] }) {
  if (provider === 'stripe') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500">
        Stripe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-pink-500/10 text-pink-500">
      MoMo
    </span>
  );
}

function StatusBadge({ status }: { status: WebhookLog['status'] }) {
  if (status === 'success') {
    return <Badge variant="default" className="bg-green-500/20 text-green-600 hover:bg-green-500/20">success</Badge>;
  }
  return <Badge variant="destructive">failed</Badge>;
}

export function WebhookLogsPage() {
  const {
    logs,
    total,
    loading,
    error,
    provider,
    setProvider,
    status,
    setStatus,
    offset,
    setOffset,
    limit,
  } = useWebhookLogs();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleProviderChange = (value: string) => {
    setProvider(value === 'all' ? '' : value);
    setOffset(0);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? '' : value);
    setOffset(0);
  };

  const currentStart = total === 0 ? 0 : offset + 1;
  const currentEnd = Math.min(offset + limit, total);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Webhook Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Debug incoming webhook events from payment providers.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Provider</span>
          <Select value={provider || 'all'} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="momo">MoMo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select value={status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <ScrollText className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No webhook events found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Event ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(log.id)}
                    >
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {relativeTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <ProviderBadge provider={log.provider} />
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.event_type}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.event_id.length > 20
                          ? `${log.event_id.slice(0, 20)}...`
                          : log.event_id}
                      </TableCell>
                    </TableRow>
                    {expandedId === log.id && (
                      <TableRow key={`${log.id}-expanded`}>
                        <TableCell colSpan={5} className="p-0">
                          <div className="px-4 pb-4 pt-2">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Payload</p>
                            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 text-xs">
                              <code>{JSON.stringify(log.payload, null, 2)}</code>
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {currentStart}–{currentEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentEnd >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
