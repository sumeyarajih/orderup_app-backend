import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET user's orders
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

    const orders = await prisma.order.findMany({
      where: { userId: decoded.userId },
      include: {
        orderItems: {
          include: {
            foodItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new order
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

    const { paymentMethod, deliveryAddress } = await req.json();

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: decoded.userId },
      include: { foodItem: true }
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { message: "Cart is empty" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => {
      return total + (item.foodItem.price * item.quantity);
    }, 0);

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: decoded.userId,
          totalAmount,
          paymentMethod,
          deliveryAddress,
          orderItems: {
            create: cartItems.map(item => ({
              foodItemId: item.foodItemId,
              quantity: item.quantity,
              price: item.foodItem.price
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              foodItem: true
            }
          }
        }
      });

      // Clear user's cart
      await tx.cartItem.deleteMany({
        where: { userId: decoded.userId }
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}