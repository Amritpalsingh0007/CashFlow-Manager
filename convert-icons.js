const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'icons', 'icon-192.svg');
const png192Path = path.join(__dirname, 'public', 'icons', 'icon-192.png');
const png512Path = path.join(__dirname, 'public', 'icons', 'icon-512.png');

sharp(svgPath)
  .resize(192, 192)
  .png()
  .toFile(png192Path)
  .then(() => {
    console.log('Created icon-192.png');
    return sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(png512Path);
  })
  .then(() => {
    console.log('Created icon-512.png');
  })
  .catch(err => {
    console.error('Error converting icons:', err);
    process.exit(1);
  });