import { CreditCard, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBilling } from '../hooks/useBilling.js';
import { useUsage } from '../hooks/useUsage.js';

type Plan = {
  tier: string;
  name: string;
  priceUsd: string;
  priceVnd: string;
  calls: string;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    priceUsd: '$19',
    priceVnd: '449,000d',
    calls: '10,000',
    features: ['5 MCP servers', '10,000 calls/month', 'Email support'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    priceUsd: '$49',
    priceVnd: '1,190,000d',
    calls: '50,000',
    features: ['5 MCP servers', '50,000 calls/month', 'Priority support', 'Webhooks'],
    popular: true,
  },
  {
    tier: 'business',
    name: 'Business',
    priceUsd: '$149',
    priceVnd: '3,590,000d',
    calls: '200,000',
    features: ['5 MCP servers', '200,000 calls/month', 'Dedicated support', 'Webhooks', 'SLA'],
  },
];

export function BillingPage() {
  const { startStripeCheckout, startMomoCheckout, openStripePortal } = useBilling();
  const { usage, loading, error } = useUsage();
  const currentTier = usage?.tier ?? 'free';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6" /> Billing
        </h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods.</p>
      </div>

      {/* Current plan banner */}
      <Alert>
        <AlertDescription>
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : error ? (
            <span className="text-sm text-destructive">{error}</span>
          ) : (
            <span className="flex items-center gap-2 text-sm">
              Current plan:{' '}
              <Badge variant={currentTier === 'free' ? 'secondary' : 'default'} className="capitalize">
                {currentTier}
              </Badge>
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Plan cards grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isUpgrade = !isCurrent;

          return (
            <Card
              key={plan.tier}
              className={[
                isCurrent ? 'border-2 border-primary' : 'border',
                plan.popular ? 'bg-gradient-to-b from-primary/5 to-transparent' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex gap-1 flex-wrap">
                    {plan.popular && <Badge variant="secondary">Most Popular</Badge>}
                    {isCurrent && <Badge variant="default">Current Plan</Badge>}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{plan.priceUsd}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.calls} calls/month</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" onClick={() => openStripePortal()}>
                    Manage Subscription
                  </Button>
                ) : isUpgrade ? (
                  <>
                    <Button className="w-full" onClick={() => startStripeCheckout(plan.tier)}>
                      Pay with Card ({plan.priceUsd})
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => startMomoCheckout(plan.tier)}>
                      Pay with MoMo ({plan.priceVnd})
                    </Button>
                  </>
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Portal link section */}
      <p className="text-sm text-muted-foreground text-center">
        Need to update your payment method or cancel?{' '}
        <Button variant="link" className="p-0 h-auto text-sm" onClick={() => openStripePortal()}>
          Manage in Stripe Portal
        </Button>
      </p>
    </div>
  );
}
