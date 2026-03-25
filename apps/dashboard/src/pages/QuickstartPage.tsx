import { Rocket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function QuickstartPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Rocket className="h-6 w-6" /> Quickstart
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Quickstart</CardTitle>
          <CardDescription>Onboarding wizard coming in Phase 17.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This page will guide new users through setting up their first API key.</p>
        </CardContent>
      </Card>
    </div>
  );
}
