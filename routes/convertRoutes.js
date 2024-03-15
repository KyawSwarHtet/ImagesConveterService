const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios'); // Use axios instead of node-fetch
const fileextra = require('fs-extra');
const dotenv = require('dotenv');
dotenv.config();

const serverAddress = process.env.SERVER_ADDRESS;
const serverPort = process.env.SERVER_PORT;


// Endpoint to receive image URLs and convert to .webp
router.post('/upload', async (req, res) => {
  try {
    const { imageUrls, quality, filepath , cleanupDelayInMinute  } = req.body;

    if (!imageUrls || typeof imageUrls !== 'object' || !filepath) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Convert the object of imageUrls to an array of URLs
    const urlsArray = Object.values(imageUrls);

    const convertedUrls = await Promise.all(
      urlsArray.map(async (imageUrl, index) => {
        try {
          const convertedUrl = await convertToWebP(imageUrl, quality, filepath, cleanupDelayInMinute);
          
          return { [Object.keys(imageUrls)[index]]: convertedUrl };
        } catch (error) {
          console.error(`Error processing ${imageUrl}:`, error.message);
          return null;
        }
      })
    );

    // Remove null values (failed conversions)
    const filteredUrls = convertedUrls.filter((url) => url !== null);

    // Create an object with game keys as keys and convertedUrls as values
    const convertedUrlsObject = filteredUrls.reduce((obj, urlObj) => {
      const gameKey = Object.keys(urlObj)[0];
      obj[gameKey] = urlObj[gameKey];
      return obj;
    }, {});

    res.json({ convertedUrls: convertedUrlsObject });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to convert image to .webp format
async function convertToWebP(imageUrl, quality = 40, filepath, cleanupDelayInMinute) {
  const imageBuffer = await getImageBuffer(imageUrl);

  const webpBuffer = await sharp(imageBuffer).webp({ quality }).toBuffer();

const webpFolderPath = path.join(__dirname, '..', 'webpFolders', filepath); // Update path to create webpFolders at root level
  const fileName = generateRandomFileName(10) + '.webp';
  const webpFilePath = path.join(webpFolderPath, fileName);

  await fs.mkdir(webpFolderPath, { recursive: true });
  await fs.writeFile(webpFilePath, webpBuffer);

  // Construct the URL based on the server's address and port
let imageUrlRelative = path.relative(__dirname, webpFilePath).replace(/\\/g, '/');
    imageUrlRelative = imageUrlRelative.replace('../', '/'); // Remove /../    

  const imageUrlFull = `${serverAddress}:${serverPort}${imageUrlRelative}`;

    const cleanUpImgPath = path.join('webpFolders', filepath); // Updated this line
    console.log("cleanupImage Path", cleanUpImgPath)
 
  // Use the provided cleanupDelayInMinute or the default if not provided 5 min
  const cleanupDelay = cleanupDelayInMinute * 60 * 1000 || 5 *60*1000;
  // Schedule image cleanup after the specified delay
  scheduleImageCleanup(cleanUpImgPath, cleanupDelay);

  return imageUrlFull;
}

// Function to schedule image cleanup after a specified delay
function scheduleImageCleanup(folderPath, delay) {
 setTimeout(() => {
    // Cleanup logic: Delete the entire folder
    fileextra.emptyDir(folderPath)
      .then(() => {
        console.log(`Folder cleanup successful for: ${folderPath}`);
      })
      .catch((error) => {
        console.error(`Error cleaning up folder: ${folderPath}`, error.message);
      });
  }, delay);
}

function generateRandomFileName(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to retrieve image buffer from URL using axios
async function getImageBuffer(imageUrl) {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${imageUrl}, status: ${response.status}`);
  }

  return Buffer.from(response.data);
}

module.exports = router;
