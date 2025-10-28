import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET user's cart items
export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: decoded.userId },
      include: {
        foodItem: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(cartItems);
  } catch (error) {
    console.error("Get cart items error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST add item to cart
export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    const { foodItemId, quantity = 1 } = await req.json();

    if (!foodItemId) {
      return NextResponse.json(
        { message: "Food item ID is required" },
        { status: 400 }
      );
    }

    // Check if food item exists and is available
    const foodItem = await prisma.foodItem.findUnique({
      where: { id: foodItemId }
    });

    if (!foodItem) {
      return NextResponse.json(
        { message: "Food item not found" },
        { status: 404 }
      );
    }

    if (!foodItem.isAvailable) {
      return NextResponse.json(
        { message: "Food item is not available" },
        { status: 400 }
      );
    }

    // Check if item already in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_foodItemId: {
          userId: decoded.userId,
          foodItemId
        }
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Update quantity if already exists
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
        include: { foodItem: true }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId: decoded.userId,
          foodItemId,
          quantity
        },
        include: { foodItem: true }
      });
    }

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error("Add to cart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}