const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Set up multer storage
const upload = multer({ dest: 'uploads/' });

// Endpoint to upload multiple images and generate URLs
router.post('/upload', upload.array('images'), async (req, res) => {
  try {
    const { folderName, quality } = req.body;
      const images = req.files;
      

    if (!images || !Array.isArray(images) || !folderName) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const uploadedUrls = await Promise.all(
        images.map(async (imageData) => {
          
        try {
            const imageUrl = await uploadImage(imageData, folderName, quality);
            console.log("imager urel",imageUrl)
          return imageUrl;
        } catch (error) {
          console.error('Error uploading image:', error.message);
          return null;
        }
      })
    );

    // Remove null values (failed uploads)
    const filteredUrls = uploadedUrls.filter((url) => url !== null);

    res.json({ uploadedUrls: filteredUrls });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to upload image and generate URL
async function uploadImage(image, folderName, quality = 40) {
  try {
    if (!image || !image.path) {
      throw new Error("Invalid image data provided");
    }

    // Read the uploaded image file into a buffer
    const imageBuffer = await fs.readFile(image.path);

    // Convert quality to integer if it's provided as a string
    const qualityInt = parseInt(quality, 10);

    // Check if qualityInt is within the valid range (1 to 100)
    if (isNaN(qualityInt) || qualityInt < 1 || qualityInt > 100) {
      throw new Error("Invalid quality value. Expected an integer between 1 and 100.");
    }

    // Construct the output file path and name
    const webpFolderPath = path.join(__dirname, '../webpFolders', folderName || 'default');
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
    const webpFilePath = path.join(webpFolderPath, fileName);

    // Ensure the output folder exists, create if not
    await fs.mkdir(webpFolderPath, { recursive: true });

    // Convert the image buffer to webp format using Sharp
    const webpBuffer = await sharp(imageBuffer).webp({ quality: qualityInt }).toBuffer();

    // Write the converted image buffer to the output file
    await fs.writeFile(webpFilePath, webpBuffer);

    // Construct the relative URL within 'webpFolders'
    const imageUrlRelative = path.join('/webpFolders', folderName || 'default', fileName).replace(/\\/g, '/');

   // Schedule image cleanup after 2 minutes
    setTimeout(async () => {
      try {
        // Delete the image file
        await fs.unlink(webpFilePath);
        console.log(`Image ${webpFilePath} has been deleted.`);
        // Delete the uploaded image file
        await fs.unlink(image.path);
        console.log(`Uploaded image ${image.path} has been deleted.`);
      } catch (error) {
        console.error("Error deleting image:", error.message);
      }
    }, 5* 60 * 1000); // 5 minutes in milliseconds
      
    return imageUrlRelative;
  } catch (error) {
    console.error("Error uploading image:", error.message);
    throw new Error("Invalid input");
  }
}

module.exports = router;
