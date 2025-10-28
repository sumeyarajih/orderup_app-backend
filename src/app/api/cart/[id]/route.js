import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PUT update cart item quantity
export async function PUT(req, { params }) {
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

    const { quantity } = await req.json();

    if (quantity < 1) {
      return NextResponse.json(
        { message: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!cartItem) {
      return NextResponse.json(
        { message: "Cart item not found" },
        { status: 404 }
      );
    }

    const updatedCartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { foodItem: true }
    });

    return NextResponse.json(updatedCartItem);
  } catch (error) {
    console.error("Update cart item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE remove item from cart
export async function DELETE(req, { params }) {
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

    const cartItem = await prisma.cartItem.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!cartItem) {
      return NextResponse.json(
        { message: "Cart item not found" },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}