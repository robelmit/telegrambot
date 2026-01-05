/**
 * Script to help analyze image coordinates
 * This will load the reference images and output their dimensions
 */

import { loadImage } from 'canvas';
import path from 'path';

async function analyzeImages() {
  const frontPath = path.join('template', 'front.JPG');
  const backPath = path.join('template', 'back.JPG');

  console.log('Analyzing reference images...\n');

  // Load front image
  const frontImg = await loadImage(frontPath);
  console.log(`Front image dimensions: ${frontImg.width} x ${frontImg.height}`);

  // Load back image
  const backImg = await loadImage(backPath);
  console.log(`Back image dimensions: ${backImg.width} x ${backImg.height}`);

  console.log('\n--- FRONT CARD ANALYSIS ---');
  console.log('Based on visual inspection of front.JPG:');
  console.log('');
  console.log('Photo position: Look for the face photo on the left');
  console.log('Small photo: Bottom right corner near barcode');
  console.log('');
  console.log('Text fields (approximate Y positions from top):');
  console.log('- "ሙሉ ስም | Full Name" label: ~128px');
  console.log('- Name Amharic value: ~165px');
  console.log('- Name English value: ~200px');
  console.log('- "የትውልድ ቀን | Date of Birth" label: ~248px');
  console.log('- DOB value: ~285px');
  console.log('- "ፆታ | Sex" label: ~335px');
  console.log('- Sex value: ~375px');
  console.log('- "የሚያበቃበት ቀን | Date of Expiry" label: ~420px');
  console.log('- Expiry value: ~460px');
  console.log('- FAN section: ~530-600px');

  console.log('\n--- BACK CARD ANALYSIS ---');
  console.log('Based on visual inspection of back.JPG:');
  console.log('');
  console.log('QR Code: Large square on right side');
  console.log('');
  console.log('Text fields:');
  console.log('- Phone number value: top left');
  console.log('- Nationality section: below phone');
  console.log('- Address (Region/City/Subcity): left side, stacked');
  console.log('- FIN: bottom left');
  console.log('- SN: bottom right (red text)');
}

analyzeImages().catch(console.error);
