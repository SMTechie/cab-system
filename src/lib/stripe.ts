import Stripe from 'stripe';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe secret key is not configured', 500, 'stripe_not_configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getPlatformFeeBps() {
  return env.STRIPE_PLATFORM_FEE_BPS;
}
