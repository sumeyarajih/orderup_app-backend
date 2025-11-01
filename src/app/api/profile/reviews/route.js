import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET user's reviews
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Get user's reviews with food item details
    const reviews = await prisma.review.findMany({
      where: { userId: decoded.userId },
      include: {
        foodItem: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            category: true
          }
        },
        order: {
          select: {
            id: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const totalReviews = await prisma.review.count({
      where: { userId: decoded.userId }
    });

    // Calculate average rating
    const averageRating = await prisma.review.aggregate({
      where: { userId: decoded.userId },
      _avg: {
        rating: true
      }
    });

    return NextResponse.json({
      success: true,
      reviews,
      stats: {
        total: totalReviews,
        averageRating: averageRating._avg.rating || 0
      },
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      }
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// CREATE new review
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { foodItemId, orderId, rating, comment } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if user has ordered this food item
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: decoded.userId,
          orderItems: {
            some: {
              foodItemId: foodItemId
            }
          }
        }
      });

      if (!order) {
        return NextResponse.json({ 
          error: 'You can only review food items from your orders' 
        }, { status: 400 });
      }
    }

    // Check if review already exists for this order and food item
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: decoded.userId,
        foodItemId,
        orderId
      }
    });

    if (existingReview) {
      return NextResponse.json({ 
        error: 'You have already reviewed this item from this order' 
      }, { status: 400 });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        userId: decoded.userId,
        foodItemId,
        orderId
      },
      include: {
        foodItem: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Update food item average rating
    await updateFoodItemRating(foodItemId);

    return NextResponse.json({
      success: true,
      review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update food item rating
async function updateFoodItemRating(foodItemId) {
  const ratingStats = await prisma.review.aggregate({
    where: { foodItemId },
    _avg: { rating: true },
    _count: { rating: true }
  });

  await prisma.foodItem.update({
    where: { id: foodItemId },
    data: {
      rating: ratingStats._avg.rating
    }
  });
}