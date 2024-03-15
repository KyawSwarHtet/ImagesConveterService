const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

const imageRoutes = require('./routes/imageRoutes');
const convertRoutes = require('./routes/convertRoutes');

dotenv.config();
const app = express();
const serverAddress = process.env.SERVER_ADDRESS;
const serverPort = process.env.SERVER_PORT;

app.use(express.json());
app.use('/webpFolders', express.static(path.join(__dirname, 'webpFolders')));

app.use('/images', imageRoutes);
app.use('/urls', convertRoutes);

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Image converter service listening at http://${serverAddress}:${PORT}`);
});

// Sample Data for Testing in Postman
// In your Postman request body:
//  {
//    "imageUrls": {
//     "game1": "https://myanfobase.sgp1.digitaloceanspaces.com/uploads/2023-01-18T04-40-47.084Z-goods2.jpg",
//      "game2": "https://myanfobase.sgp1.digitaloceanspaces.com/uploads/2023-01-11T03-44-40.450Z-passport1.jpg",
//      "game3": "https://myanfobase.sgp1.digitaloceanspaces.com/uploads/2023-01-21T05-50-36.057Z-edu3.jpg",
//     "game4": "https://myanfobase.sgp1.digitaloceanspaces.com/uploads/2023-01-25T03-36-15.157Z-travel9.jpg"
  
//   },
//    "quality": 60,
//    "filepath" :"backend",
//    "cleanupDelayInMinute": "1"
//  }
