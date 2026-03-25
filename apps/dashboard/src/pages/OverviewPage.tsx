import { Key, BarChart3, Shield, ArrowUpRight, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useOverview } from '../hooks/useOverview.js';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const { activeKeys, totalKeys, used, limit, tier, usagePercent, loading, error } = useOverview();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Your API dashboard at a glance.</p>
      </div>

      {/* Stat cards — 3 col grid on lg, 2 col md, 1 col mobile */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Active Keys Card */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="text-3xl font-bold">{activeKeys}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalKeys} total ({totalKeys - activeKeys} revoked)
                </p>
                <Link to="/keys" className="inline-flex items-center text-xs text-primary mt-2 hover:underline">
                  Manage keys <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Usage This Month Card */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usage This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="text-3xl font-bold">{used.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {limit.toLocaleString()} calls ({usagePercent}%)
                </p>
                <Progress value={usagePercent} className="mt-3 h-1.5" />
                <Link to="/usage" className="inline-flex items-center text-xs text-primary mt-2 hover:underline">
                  View details <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Current Tier Card */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Tier</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold capitalize">{tier}</span>
                  <Badge variant={tier === 'free' ? 'secondary' : 'default'}>{tier}</Badge>
                </div>
                {tier === 'free' && (
                  <Link to="/billing">
                    <Button variant="link" size="sm" className="px-0 mt-2 text-xs">
                      Upgrade plan <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Activity tracking coming soon. Your recent tool calls will appear here.</p>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
