import { Home } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function OverviewPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Home className="h-6 w-6" /> Overview
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Overview</CardTitle>
          <CardDescription>Welcome card, key count, usage stats, and tier info coming in Phase 16.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This page will display your dashboard overview with quick stats.</p>
        </CardContent>
      </Card>
    </div>
  );
}
