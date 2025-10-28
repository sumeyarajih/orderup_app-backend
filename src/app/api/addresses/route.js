import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET user's addresses
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

    const addresses = await prisma.address.findMany({
      where: { userId: decoded.userId },
      orderBy: { isDefault: 'desc' }
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Get addresses error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new address
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

    const { fullAddress, city, state, zipCode, isDefault = false } = await req.json();

    if (!fullAddress || !city) {
      return NextResponse.json(
        { message: "Full address and city are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: decoded.userId,
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: decoded.userId,
        fullAddress,
        city,
        state,
        zipCode,
        isDefault
      }
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}