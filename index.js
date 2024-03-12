const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const serverAddress = process.env.SERVER_ADDRESS;
const serverPort = process.env.SERVER_PORT;

app.use(express.json());

app.use('/webpFolders', express.static(path.join(__dirname, 'webpFolders')));

// Endpoint to receive image URLs and convert to .webp
app.post('/convert', async (req, res) => {
  try {
    const { imageUrls, quality } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const convertedUrls = await Promise.all(
      imageUrls.map(async (imageUrl) => {
        try {
          const convertedUrl = await convertToWebP(imageUrl, quality);
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
async function convertToWebP(imageUrl, quality = 40) {
  const imageBuffer = await getImageBuffer(imageUrl);

  const webpBuffer = await sharp(imageBuffer).webp({ quality }).toBuffer();

  const webpFolderPath = path.join(__dirname, 'webpFolders');
  const fileName = path.basename(imageUrl, path.extname(imageUrl)) + '.webp';
  const webpFilePath = path.join(webpFolderPath, fileName);

  await fs.writeFile(webpFilePath, webpBuffer);

  // Construct the URL based on the server's address and port
  const imageUrlRelative = path.relative(__dirname, webpFilePath).replace(/\\/g, '/');
  const imageUrlFull = `${serverAddress}:${serverPort}/${imageUrlRelative}`;
  // const imageUrlFull = `${imageUrlRelative}`;

  return imageUrlFull;
}

// Function to retrieve image buffer from URL
async function getImageBuffer(imageUrl) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${imageUrl}, status: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Image converter service listening at http://${serverAddress}:${PORT}`);
});
