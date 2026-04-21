import Stripe from 'stripe';
import { env } from '@/lib/env';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getPlatformFeeBps() {
  return env.STRIPE_PLATFORM_FEE_BPS;
}
