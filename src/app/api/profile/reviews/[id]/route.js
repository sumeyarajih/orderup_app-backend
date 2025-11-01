import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET single review
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const review = await prisma.review.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      },
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
      }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Get review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// UPDATE review
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { rating, comment } = body;

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
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
    await updateFoodItemRating(updatedReview.foodItemId);

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE review
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const foodItemId = existingReview.foodItemId;

    // Delete review
    await prisma.review.delete({
      where: { id }
    });

    // Update food item average rating
    await updateFoodItemRating(foodItemId);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
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