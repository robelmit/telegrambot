/**
 * Extract specific regions from reference images to measure text positions
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function extractRegions() {
  console.log('Extracting regions from reference images...\n');

  await fs.mkdir('test-output/regions', { recursive: true });

  // Extract front card regions
  const frontImg = sharp('template/front.JPG');
  
  // Photo area (left side)
  await frontImg.clone().extract({ left: 40, top: 100, width: 220, height: 280 })
    .toFile('test-output/regions/front_photo_area.png');
  console.log('✓ Extracted front photo area');

  // Name area (right of photo, top)
  await frontImg.clone().extract({ left: 240, top: 100, width: 500, height: 100 })
    .toFile('test-output/regions/front_name_area.png');
  console.log('✓ Extracted front name area');

  // DOB area
  await frontImg.clone().extract({ left: 240, top: 240, width: 500, height: 50 })
    .toFile('test-output/regions/front_dob_area.png');
  console.log('✓ Extracted front DOB area');

  // Sex area
  await frontImg.clone().extract({ left: 240, top: 330, width: 500, height: 50 })
    .toFile('test-output/regions/front_sex_area.png');
  console.log('✓ Extracted front sex area');

  // Expiry area
  await frontImg.clone().extract({ left: 240, top: 420, width: 500, height: 50 })
    .toFile('test-output/regions/front_expiry_area.png');
  console.log('✓ Extracted front expiry area');

  // FAN/Barcode area (bottom)
  await frontImg.clone().extract({ left: 240, top: 500, width: 700, height: 130 })
    .toFile('test-output/regions/front_barcode_area.png');
  console.log('✓ Extracted front barcode area');

  // Small photo area (bottom right)
  await frontImg.clone().extract({ left: 830, top: 440, width: 150, height: 170 })
    .toFile('test-output/regions/front_small_photo_area.png');
  console.log('✓ Extracted front small photo area');

  // Extract back card regions
  const backImg = sharp('template/back.JPG');

  // Phone area (top left)
  await backImg.clone().extract({ left: 10, top: 30, width: 200, height: 50 })
    .toFile('test-output/regions/back_phone_area.png');
  console.log('✓ Extracted back phone area');

  // Address area (left side)
  await backImg.clone().extract({ left: 10, top: 150, width: 450, height: 350 })
    .toFile('test-output/regions/back_address_area.png');
  console.log('✓ Extracted back address area');

  // QR code area (right side)
  await backImg.clone().extract({ left: 450, top: 30, width: 400, height: 400 })
    .toFile('test-output/regions/back_qr_area.png');
  console.log('✓ Extracted back QR area');

  // FIN area (bottom left)
  await backImg.clone().extract({ left: 10, top: 520, width: 400, height: 50 })
    .toFile('test-output/regions/back_fin_area.png');
  console.log('✓ Extracted back FIN area');

  // SN area (bottom right)
  await backImg.clone().extract({ left: 750, top: 580, width: 250, height: 50 })
    .toFile('test-output/regions/back_sn_area.png');
  console.log('✓ Extracted back SN area');

  console.log('\nDone! Check test-output/regions/ folder');
}

extractRegions().catch(console.error);
