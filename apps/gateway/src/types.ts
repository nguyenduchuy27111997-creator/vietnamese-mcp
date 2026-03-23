import type { KVNamespace } from '@cloudflare/workers-types';

export type AuthContext = {
  userId: string;
  tier: string;
  keyId: string;
};

export type GatewayEnv = {
  Bindings: {
    API_KEYS: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    TINYBIRD_TOKEN: string;
    TINYBIRD_HOST?: string;
  };
  Variables: {
    auth: AuthContext;
  };
};
