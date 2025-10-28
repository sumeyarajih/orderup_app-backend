import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single food item
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const foodItem = await prisma.foodItem.findUnique({
      where: { id }
    });

    if (!foodItem) {
      return NextResponse.json(
        { message: "Food item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(foodItem);
  } catch (error) {
    console.error("Get food item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update food item
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const existingItem = await prisma.foodItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { message: "Food item not found" },
        { status: 404 }
      );
    }

    const updatedItem = await prisma.foodItem.update({
      where: { id },
      data: body
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Update food item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE food item
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const existingItem = await prisma.foodItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { message: "Food item not found" },
        { status: 404 }
      );
    }

    await prisma.foodItem.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Food item deleted successfully" });
  } catch (error) {
    console.error("Delete food item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}