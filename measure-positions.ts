/**
 * Manually measure positions from reference images
 * by analyzing pixel colors to find text boundaries
 */
import sharp from 'sharp';

async function measurePositions() {
  console.log('Measuring actual positions from reference images...\n');
  console.log('Image dimensions: 1012 x 638\n');

  // Based on visual inspection of the reference images:
  // The template has labels, and the filled images have values next to labels
  
  // FRONT CARD - Approximate positions based on standard ID card layout
  console.log('=== FRONT CARD ESTIMATED POSITIONS ===');
  console.log('(These are estimates based on typical ID card layouts)');
  console.log('');
  
  // Photo area - typically left side, below header
  console.log('Main Photo: x=55, y=130, w=185, h=230');
  
  // Text fields - typically right of photo
  // Name is usually near top
  console.log('Name Amharic: x=260, y=130');
  console.log('Name English: x=260, y=160');
  
  // DOB below name
  console.log('DOB: x=260, y=265');
  
  // Sex below DOB
  console.log('Sex: x=260, y=355');
  
  // Expiry below sex
  console.log('Expiry: x=260, y=445');
  
  // FAN near bottom
  console.log('FAN: x=300, y=530');
  
  // Barcode at bottom
  console.log('Barcode: x=280, y=565, w=450, h=50');
  
  // Small photo - bottom right
  console.log('Small Photo: x=855, y=465, w=100, h=125');
  
  // Issue date - rotated on left edge
  console.log('Issue Date: x=25, y=340 (rotated -90deg)');

  console.log('\n=== BACK CARD ESTIMATED POSITIONS ===');
  
  // Phone at top left
  console.log('Phone: x=25, y=48');
  
  // ET code
  console.log('ET: x=175, y=175');
  
  // Address fields
  console.log('Region Amharic: x=25, y=240');
  console.log('Region English: x=25, y=270');
  console.log('City Amharic: x=25, y=320');
  console.log('City English: x=25, y=350');
  console.log('Subcity Amharic: x=25, y=400');
  console.log('Subcity English: x=25, y=435');
  
  // QR code - right side
  console.log('QR Code: x=500, y=50, size=330');
  
  // FIN at bottom
  console.log('FIN: x=60, y=550');
  
  // Serial number - bottom right, red
  console.log('SN: x=820, y=600');
}

measurePositions().catch(console.error);
