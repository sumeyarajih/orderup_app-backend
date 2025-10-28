import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET single order
export async function GET(req, { params }) {
  try {
    const { id } = params;
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

    const order = await prisma.order.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      },
      include: {
        orderItems: {
          include: {
            foodItem: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update order status (admin only)
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { status, paymentStatus } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus })
      },
      include: {
        orderItems: {
          include: {
            foodItem: true
          }
        }
      }
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}