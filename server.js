const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());

// Endpoint to receive image URLs and convert to .webp
app.post('/convert', async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const convertedUrls = await Promise.all(
      imageUrls.map(async (imageUrl) => {
        try {
          const convertedUrl = await convertToWebP(imageUrl);
          return convertedUrl;
        } catch (error) {
          console.error(`Error processing ${imageUrl}:`, error.message);
          return null;
        }
      })
    );

    // Remove null values (failed conversions)
    const filteredUrls = convertedUrls.filter((url) => url !== null);

    res.json({ convertedUrls: filteredUrls });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to convert image to .webp format
async function convertToWebP(imageUrl) {
  const imageBuffer = await getImageBuffer(imageUrl);
  const webpBuffer = await sharp(imageBuffer).webp().toBuffer();

  const webpFolderPath = '/home/webpFolders';
  const fileName = path.basename(imageUrl, path.extname(imageUrl)) + '.webp';
  const webpFilePath = path.join(webpFolderPath, fileName);

  await fs.writeFile(webpFilePath, webpBuffer);

  return `http://103.135.35.74:3000/webpFolders/${fileName}`;
}

// Function to retrieve image buffer from URL
async function getImageBuffer(imageUrl) {
  const response = await fetch(imageUrl); // Assuming you have a fetch function or use axios

  if (!response.ok) {
    throw new Error(`Failed to fetch ${imageUrl}, status: ${response.status}`);
  }

  return await response.buffer();
}

app.listen(port, () => {
  console.log(`Image converter service listening at http://localhost:${port}`);
});
