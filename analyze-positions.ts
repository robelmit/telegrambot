/**
 * Analyze pixel positions in reference images to find exact text locations
 */
import sharp from 'sharp';

async function analyzePositions() {
  console.log('Analyzing reference images for text positions...\n');

  // Get image metadata
  const frontMeta = await sharp('template/front.JPG').metadata();
  const backMeta = await sharp('template/back.JPG').metadata();

  console.log('Front image:', frontMeta.width, 'x', frontMeta.height);
  console.log('Back image:', backMeta.width, 'x', backMeta.height);

  // The Gemini coordinates were for a 960px height image
  // Our images are 638px height
  // Scale factor: 638 / 960 = 0.665

  const SCALE = 638 / 960;
  console.log('\nScale factor:', SCALE.toFixed(4));

  console.log('\n=== FRONT CARD SCALED COORDINATES ===');
  
  // Main Photo: x=65, y=270, width=320, height=305
  console.log('Main Photo:', {
    x: Math.round(65 * SCALE),
    y: Math.round(270 * SCALE),
    width: Math.round(320 * SCALE),
    height: Math.round(305 * SCALE)
  });

  // Small Photo: x=828, y=715, width=125, height=130
  console.log('Small Photo:', {
    x: Math.round(828 * SCALE),
    y: Math.round(715 * SCALE),
    width: Math.round(125 * SCALE),
    height: Math.round(130 * SCALE)
  });

  // Name Amharic: x=400, y=265
  console.log('Name Amharic:', { x: Math.round(400 * SCALE), y: Math.round(265 * SCALE) });

  // Name English: x=400, y=320
  console.log('Name English:', { x: Math.round(400 * SCALE), y: Math.round(320 * SCALE) });

  // DOB: x=400, y=490
  console.log('DOB:', { x: Math.round(400 * SCALE), y: Math.round(490 * SCALE) });

  // Sex: x=400, y=575
  console.log('Sex:', { x: Math.round(400 * SCALE), y: Math.round(575 * SCALE) });

  // Expiry: x=400, y=700
  console.log('Expiry:', { x: Math.round(400 * SCALE), y: Math.round(700 * SCALE) });

  // FAN: x=455, y=790
  console.log('FAN:', { x: Math.round(455 * SCALE), y: Math.round(790 * SCALE) });

  // Barcode: x=440, y=825
  console.log('Barcode:', { x: Math.round(440 * SCALE), y: Math.round(825 * SCALE) });

  // Issue Date: x=10, y=515
  console.log('Issue Date:', { x: Math.round(10 * SCALE), y: Math.round(515 * SCALE) });

  console.log('\n=== BACK CARD SCALED COORDINATES ===');

  // Phone: x=35, y=75
  console.log('Phone:', { x: Math.round(35 * SCALE), y: Math.round(75 * SCALE) });

  // ET: x=265, y=268
  console.log('ET:', { x: Math.round(265 * SCALE), y: Math.round(268 * SCALE) });

  // Region: x=35, y=365 (Am), y=410 (En)
  console.log('Region Amharic:', { x: Math.round(35 * SCALE), y: Math.round(365 * SCALE) });
  console.log('Region English:', { x: Math.round(35 * SCALE), y: Math.round(410 * SCALE) });

  // City: x=35, y=485 (Am), y=535 (En)
  console.log('City Amharic:', { x: Math.round(35 * SCALE), y: Math.round(485 * SCALE) });
  console.log('City English:', { x: Math.round(35 * SCALE), y: Math.round(535 * SCALE) });

  // Subcity: x=35, y=605 (Am), y=660 (En)
  console.log('Subcity Amharic:', { x: Math.round(35 * SCALE), y: Math.round(605 * SCALE) });
  console.log('Subcity English:', { x: Math.round(35 * SCALE), y: Math.round(660 * SCALE) });

  // QR Code: x=455, y=75, size=500
  console.log('QR Code:', { x: Math.round(455 * SCALE), y: Math.round(75 * SCALE), size: Math.round(500 * SCALE) });

  // FIN: x=85, y=830
  console.log('FIN:', { x: Math.round(85 * SCALE), y: Math.round(830 * SCALE) });

  // SN: x=818, y=915
  console.log('SN:', { x: Math.round(818 * SCALE), y: Math.round(915 * SCALE) });

  // But wait - the Gemini coordinates seem to be for a taller image
  // Let me check if the Y coordinates make sense
  console.log('\n=== SANITY CHECK ===');
  console.log('Barcode Y scaled:', Math.round(825 * SCALE), '- should be near bottom of 638px image');
  console.log('SN Y scaled:', Math.round(915 * SCALE), '- this is', Math.round(915 * SCALE), 'which is > 638!');
  
  // The Gemini coordinates are definitely for a different aspect ratio
  // Let me assume Gemini analyzed at 1012x960 (same width, taller height)
  // So we only need to scale Y coordinates
  console.log('\n=== CORRECTED APPROACH ===');
  console.log('Gemini image height assumed: 960px');
  console.log('Our image height: 638px');
  console.log('Y scale factor:', (638/960).toFixed(4));
  console.log('X coordinates should remain as-is since width is 1012 in both');
}

analyzePositions().catch(console.error);
