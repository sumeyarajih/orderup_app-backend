import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all food items
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    let where = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (availableOnly) {
      where.isAvailable = true;
    }

    const foodItems = await prisma.foodItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(foodItems);
  } catch (error) {
    console.error("Get food items error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new food item
export async function POST(req) {
  try {
    const body = await req.json();
    
    const { 
      name, 
      description, 
      price, 
      image, 
      category, 
      calories, 
      protein, 
      carbs, 
      fat 
    } = body;

    // Validation
    if (!name || !description || !price || !category) {
      return NextResponse.json(
        { message: "Name, description, price, and category are required" },
        { status: 400 }
      );
    }

    const foodItem = await prisma.foodItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
        category,
        calories: calories ? parseInt(calories) : null,
        protein,
        carbs,
        fat
      }
    });

    return NextResponse.json(foodItem, { status: 201 });
  } catch (error) {
    console.error("Create food item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}