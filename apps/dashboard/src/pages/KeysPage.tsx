import { useState } from 'react';
import { Key, Plus, Copy, Check, Trash2, Search } from 'lucide-react';
import { useKeys, type ApiKey } from '../hooks/useKeys.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const ALL_SERVERS = [
  { id: 'momo', label: 'MoMo' },
  { id: 'zalopay', label: 'ZaloPay' },
  { id: 'vnpay', label: 'VNPAY' },
  { id: 'zalo-oa', label: 'Zalo OA' },
  { id: 'viettel-pay', label: 'ViettelPay' },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function KeysPage() {
  const { keys, loading, error, createKey, revokeKey } = useKeys();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedServers, setSelectedServers] = useState<string[]>(ALL_SERVERS.map(s => s.id));

  const filtered = keys.filter(
    (k) =>
      k.key_prefix.toLowerCase().includes(search.toLowerCase()) ||
      k.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    setCreating(true);
    const allowedServers = selectedServers.length === ALL_SERVERS.length ? undefined : selectedServers;
    const raw = await createKey(newKeyName.trim() || undefined, allowedServers);
    setCreating(false);
    if (raw) {
      setCreatedKey(raw);
    }
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreatedKey(null);
    setNewKeyName('');
    setCopied(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (revokeTarget) {
      await revokeKey(revokeTarget.id);
      setRevokeTarget(null);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Key className="h-6 w-6" /> API Keys
        </h1>
        <Button onClick={() => { setSelectedServers(ALL_SERVERS.map(s => s.id)); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Key
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading keys...</p>
      ) : keys.length === 0 ? (
        /* Empty state */
        <div className="border rounded-lg p-12 text-center">
          <Key className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No API keys yet. Create one to get started.
          </p>
          <Button onClick={() => { setSelectedServers(ALL_SERVERS.map(s => s.id)); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Key
          </Button>
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by prefix or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Keys table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No keys match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {key.key_prefix}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{key.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {key.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.allowed_servers === null || key.allowed_servers === undefined ? (
                            <Badge variant="secondary" className="text-xs">All servers</Badge>
                          ) : key.allowed_servers.length === 0 ? (
                            <Badge variant="destructive" className="text-xs">No servers</Badge>
                          ) : (
                            key.allowed_servers.map(s => {
                              const server = ALL_SERVERS.find(srv => srv.id === s);
                              return (
                                <Badge key={s} variant="outline" className="text-xs">
                                  {server?.label ?? s}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(key.created_at)}
                      </TableCell>
                      <TableCell>
                        {key.revoked_at ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!key.revoked_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setRevokeTarget(key)}
                              title="Revoke key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setCreateOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Your new API key has been created. Copy it now — it will not be shown again.'
                : 'Give your key a name to help you identify it later.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-3 font-mono text-sm break-all">
                {createdKey}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCopy(createdKey)}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" /> Copy Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="My API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedServers.length > 0) handleCreate(); }}
                autoFocus
              />
              <div className="space-y-3">
                <label className="text-sm font-medium">Allowed Servers</label>
                <p className="text-xs text-muted-foreground">Select which servers this key can access. All servers are selected by default.</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SERVERS.map(server => (
                    <label key={server.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedServers.includes(server.id)}
                        onCheckedChange={(checked) => {
                          setSelectedServers(prev =>
                            checked
                              ? [...prev, server.id]
                              : prev.filter(s => s !== server.id)
                          );
                        }}
                      />
                      {server.label}
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreate}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || selectedServers.length === 0}>
                  {creating ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {createdKey && (
            <DialogFooter>
              <Button onClick={handleCloseCreate}>Done</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation AlertDialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke{' '}
              <span className="font-mono font-medium">{revokeTarget?.key_prefix}</span>?{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
