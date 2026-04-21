import PDFDocument from 'pdfkit';
import { UserRole } from '@prisma/client';
import { jsonError } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getSessionFromRequest } from '@/lib/session';
import { getRideById, canAccessRide } from '@/lib/ride-service';
import { formatMoney } from '@/lib/fare';

export async function GET(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const ride = await getRideById(context.params.rideId);
    if (!canAccessRide(session.role, session.userId, ride) && session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    const filename = `invoice-${ride.id}.pdf`;
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(20).text('CabFlow Invoice', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Ride ID: ${ride.id}`);
    doc.text(`Status: ${ride.status}`);
    doc.text(`Payment: ${ride.paymentStatus}`);
    doc.text(`Date: ${ride.createdAt.toISOString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Trip details');
    doc.moveDown(0.25);
    doc.fontSize(11).text(`From: ${ride.originLabel}`);
    doc.text(`To: ${ride.destinationLabel}`);
    doc.text(`Distance: ${ride.distanceKm.toFixed(2)} km`);
    doc.text(`Duration: ${ride.durationMinutes.toFixed(1)} min`);
    doc.text(`Fare: ${formatMoney(ride.estimatedFareCents, ride.currency)}`);
    doc.text(`Tip: ${formatMoney(ride.tipAmountCents, ride.currency)}`);
    doc.text(`Platform fee: ${formatMoney(ride.platformFeeCents, ride.currency)}`);
    doc.text(`Total: ${formatMoney(ride.estimatedFareCents + ride.tipAmountCents, ride.currency)}`);
    doc.text(`Driver: ${ride.driver?.name ?? 'Unassigned'}`);

    doc.moveDown();
    doc.fontSize(10).fillColor('#666666').text('Thank you for riding with CabFlow.');
    doc.end();

    const pdfBuffer = await finished;
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'content-length': String(pdfBuffer.length)
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
