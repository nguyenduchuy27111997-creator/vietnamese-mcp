export type BillingTier = 'starter' | 'pro' | 'business';

export interface CheckoutParams {
  userId: string;
  tier: BillingTier;
  userEmail: string;
  returnUrl: string;
}

export interface PaymentProvider {
  createCheckoutUrl(params: CheckoutParams): Promise<string>;
}

export const STRIPE_TIERS: Record<BillingTier, { label: string; price: string }> = {
  starter: { label: 'Starter', price: '$19/mo' },
  pro: { label: 'Pro', price: '$49/mo' },
  business: { label: 'Business', price: '$149/mo' },
};

export const MOMO_TIERS: Record<BillingTier, { label: string; price: string; amountVnd: number }> = {
  starter: { label: 'Starter', price: '449,000 VND', amountVnd: 449000 },
  pro: { label: 'Pro', price: '1,190,000 VND', amountVnd: 1190000 },
  business: { label: 'Business', price: '3,590,000 VND', amountVnd: 3590000 },
};
