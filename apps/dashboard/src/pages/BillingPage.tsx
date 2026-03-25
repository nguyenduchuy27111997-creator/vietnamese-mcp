import { CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Billing
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Plan selector coming in Phase 17.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This page will display your billing information and plan options.</p>
        </CardContent>
      </Card>
    </div>
  );
}
