const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, 'logo.jpg');
const destDir = path.resolve(__dirname, 'frontend/src/assets');
const destPath = path.join(destDir, 'logo.jpg');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`Created directory: ${destDir}`);
}

// Copy the file
try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Successfully copied logo.jpg to ${destPath}`);
} catch (err) {
    console.error(`Error copying file: ${err.message}`);
    process.exit(1);
}
