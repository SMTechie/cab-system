import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getSessionFromRequest, requestOrigin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.DRIVER) {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { driverProfile: true }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'user_not_found');
    }

    const stripe = getStripe();
    const driverProfile = user.driverProfile
      ? user.driverProfile
      : await prisma.driverProfile.create({
          data: {
            userId: user.id,
            isAvailable: false
          }
        });

    let stripeAccountId = driverProfile.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: env.STRIPE_CONNECT_COUNTRY,
        email: user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        }
      });

      stripeAccountId = account.id;

      await prisma.driverProfile.upsert({
        where: { userId: user.id },
        update: { stripeAccountId },
        create: {
          userId: user.id,
          stripeAccountId,
          isAvailable: false
        }
      });
    }

    const origin = requestOrigin(request);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/driver?onboarding=refresh`,
      return_url: `${origin}/driver?onboarding=success`,
      type: 'account_onboarding'
    });

    return jsonSuccess({
      accountId: stripeAccountId,
      url: accountLink.url
    });
  } catch (error) {
    return jsonError(error);
  }
}
