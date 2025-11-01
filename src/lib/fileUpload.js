import fs from 'fs';
import path from 'path';

export async function saveImageFile(file, userId) {
  try {
    console.log('💾 Starting file save process...');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    console.log('📁 Uploads directory:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Check if directory is writable
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      console.log('✅ Directory is writable');
    } catch (accessError) {
      console.error('❌ Directory not writable:', accessError);
      throw new Error('Upload directory is not writable');
    }

    // Get file extension
    const originalName = file.name || 'profile.jpg';
    const extension = path.extname(originalName) || '.jpg';
    console.log('📄 File extension:', extension);
    
    // Generate filename
    const filename = `profile-${userId}-${Date.now()}${extension}`;
    const filepath = path.join(uploadsDir, filename);
    console.log('📄 Full file path:', filepath);

    // Convert file to buffer and save
    console.log('🔧 Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log('💾 Writing file to disk...');
    fs.writeFileSync(filepath, buffer);
    console.log('✅ File written successfully');

    // Return relative URL for database storage
    const relativeUrl = `/uploads/profiles/${filename}`;
    console.log('🌐 Relative URL:', relativeUrl);
    
    return relativeUrl;
  } catch (error) {
    console.error('❌ Error in saveImageFile:', error);
    console.error('❌ Error stack:', error.stack);
    throw new Error(`Failed to save image file: ${error.message}`);
  }
}

export function deleteOldProfileImage(imageUrl) {
  try {
    console.log('🗑️ Attempting to delete old image:', imageUrl);
    
    if (imageUrl && imageUrl.startsWith('/uploads/profiles/')) {
      const filepath = path.join(process.cwd(), 'public', imageUrl);
      console.log('🗑️ Full path to delete:', filepath);
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('✅ Old image deleted successfully');
      } else {
        console.log('ℹ️ Old image file not found, skipping deletion');
      }
    } else {
      console.log('ℹ️ No valid old image URL to delete');
    }
  } catch (error) {
    console.error('❌ Error deleting old image:', error);
  }
}

// Keep this for compatibility if needed elsewhere
export function saveBase64Image(base64String, userId) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename
    const filename = `profile-${userId}-${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, base64Data, 'base64');

    // Return relative URL for database storage
    return `/uploads/profiles/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image');
  }
}