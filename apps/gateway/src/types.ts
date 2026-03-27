import type { KVNamespace } from '@cloudflare/workers-types';

export type AuthContext = {
  userId: string;
  tier: string;
  keyId: string;
  allowedServers?: string[] | null;
};

export type GatewayEnv = {
  Bindings: {
    API_KEYS: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    TINYBIRD_TOKEN: string;
    TINYBIRD_HOST?: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_STARTER: string;
    STRIPE_PRICE_PRO: string;
    STRIPE_PRICE_BUSINESS: string;
    MOMO_PARTNER_CODE: string;
    MOMO_ACCESS_KEY: string;
    MOMO_SECRET_KEY: string;
  };
  Variables: {
    auth: AuthContext;
  };
};
