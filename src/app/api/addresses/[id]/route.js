import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PUT update address
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

    const { fullAddress, city, state, zipCode, isDefault } = await req.json();

    const address = await prisma.address.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: decoded.userId,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        ...(fullAddress && { fullAddress }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(isDefault !== undefined && { isDefault })
      }
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error("Update address error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE address
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

    const address = await prisma.address.findFirst({
      where: { 
        id,
        userId: decoded.userId 
      }
    });

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 }
      );
    }

    await prisma.address.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}