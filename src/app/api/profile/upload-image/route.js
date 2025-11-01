import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { saveImageFile, deleteOldProfileImage } from '@/lib/fileUpload';

export async function POST(request) {
  try {
    console.log('🔍 Starting image upload process...');
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🔍 Token present:', !!token);
    
    if (!token) {
      console.log('❌ No authorization token');
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    console.log('🔍 Token decoded:', !!decoded);
    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔍 User ID from token:', decoded.userId);

    // Get form data
    const formData = await request.formData();
    const profileImage = formData.get('profileImage');
    
    console.log('🔍 Form data received:', !!formData);
    console.log('🔍 Profile image received:', !!profileImage);
    
    if (!profileImage) {
      console.log('❌ No profile image in form data');
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    console.log('🔍 Image details:', {
      name: profileImage.name,
      type: profileImage.type,
      size: profileImage.size
    });

    // Validate file type
    if (!profileImage.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', profileImage.type);
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (profileImage.size > maxSize) {
      console.log('❌ File too large:', profileImage.size);
      return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 });
    }

    // Get current user to check for existing profile image
    console.log('🔍 Fetching current user...');
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { profileImage: true }
    });

    console.log('🔍 Current user found:', !!currentUser);
    console.log('🔍 Current profile image:', currentUser?.profileImage);

    // Delete old profile image if exists
    if (currentUser?.profileImage) {
      console.log('🗑️ Deleting old profile image...');
      deleteOldProfileImage(currentUser.profileImage);
    }

    // Save new image
    console.log('💾 Saving new image...');
    const profileImageUrl = await saveImageFile(profileImage, decoded.userId);
    console.log('✅ Image saved at:', profileImageUrl);

    // Update user profile with new image
    console.log('📝 Updating user profile...');
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { profileImage: profileImageUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        isVerified: true,
      }
    });

    console.log('✅ User updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Profile image uploaded successfully',
      user: updatedUser,
      profileImage: profileImageUrl
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}