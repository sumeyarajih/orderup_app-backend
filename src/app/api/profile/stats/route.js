import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get orders count
    const ordersCount = await prisma.order.count({
      where: { userId: decoded.userId }
    });

    // Get reviews count
    const reviewsCount = await prisma.review.count({
      where: { userId: decoded.userId }
    });

    // Get addresses count
    const addressesCount = await prisma.address.count({
      where: { userId: decoded.userId }
    });

    // Get average rating
    const averageRating = await prisma.review.aggregate({
      where: { userId: decoded.userId },
      _avg: {
        rating: true
      }
    });

    // Get user join date
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { createdAt: true }
    });

    const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
    const yearsAsMember = new Date().getFullYear() - memberSince;

    return NextResponse.json({
      success: true,
      stats: {
        orders: ordersCount,
        reviews: reviewsCount,
        addresses: addressesCount,
        averageRating: averageRating._avg.rating || 0,
        years: Math.max(yearsAsMember, 1)
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}