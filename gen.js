const sharp = require('sharp');
const W = 1344, H = 768;

const data = {
  am: 'ዓወት ትካቦ ገብረሂወት',
  en: 'Awet Tikabo Gebrehiwet',
  dobE: '07/10/1995',
  dobG: '2003/06/14',
  sex: 'Male',
  exp: 'N/A',
  fan: '2062 5372 6194 7982'
};

/*
 * FINAL LAYOUT based on template image analysis:
 * 
 * Template structure (1344x768):
 * - Ethiopian flag: ~(15,15) to (130,100)
 * - Title "Ethiopian Digital ID Card": center top ~y=40-70
 * - National ID logo: top right ~(1180,15)
 * 
 * Labels are positioned in CENTER of card:
 * - "መሉ ስም | Full Name": ~y=105, label ends ~x=580
 * - "Date of Issue" (vertical): left side ~x=275
 * - "የትውልድ ቀን | Date of Birth": ~y=270, label ends ~x=620
 * - "ጾታ | Sex": ~y=370, label ends ~x=450
 * - "የሚያበቃበት ቀን | Date of Expiry": ~y=465, label ends ~x=680
 * - "ካርድ ቁጥር / FAN": bottom ~y=620-650
 * 
 * Photo area: left side ~(50,170) to (260,440)
 */

async function generate() {
  let card = await sharp('src/assets/front_template.png').resize(W, H).png().toBuffer();

  // Photo placeholder - left side below flag
  const photoW = 205, photoH = 268;
  const photoX = 50, photoY = 170;
  
  const photoSvg = `<svg width="${photoW}" height="${photoH}">
    <defs>
      <linearGradient id="photoBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#f0f0f0"/>
        <stop offset="100%" style="stop-color:#d8d8d8"/>
      </linearGradient>
    </defs>
    <rect width="${photoW}" height="${photoH}" fill="url(#photoBg)" stroke="#999" stroke-width="2" rx="8"/>
    <circle cx="${photoW/2}" cy="85" r="50" fill="#b8b8b8"/>
    <ellipse cx="${photoW/2}" cy="210" rx="72" ry="55" fill="#b8b8b8"/>
  </svg>`;
  
  const photoBuf = await sharp(Buffer.from(photoSvg)).png().toBuffer();
  card = await sharp(card).composite([{ input: photoBuf, left: photoX, top: photoY }]).toBuffer();

  // Text values - positioned RIGHT AFTER each label
  // Using exact coordinates based on template analysis
  const textSvg = `<svg width="${W}" height="${H}">
    <!-- Full Name (after label at ~x=580) -->
    <text x="590" y="108" font-family="Arial, sans-serif" font-size="18" fill="#111111">${data.am}</text>
    <text x="590" y="135" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#000000">${data.en}</text>
    
    <!-- Date of Birth (after label at ~x=620) -->
    <text x="630" y="273" font-family="Arial, sans-serif" font-size="17" fill="#000000">${data.dobE}</text>
    <text x="630" y="297" font-family="Arial, sans-serif" font-size="15" fill="#222222">${data.dobG}</text>
    
    <!-- Sex (after label at ~x=450) -->
    <text x="460" y="373" font-family="Arial, sans-serif" font-size="17" fill="#000000">${data.sex}</text>
    
    <!-- Date of Expiry (after label at ~x=680) -->
    <text x="690" y="470" font-family="Arial, sans-serif" font-size="17" fill="#000000">${data.exp}</text>
    
    <!-- FAN (above label at ~y=620) -->
    <text x="390" y="555" font-family="Courier New, monospace" font-size="24" font-weight="bold" fill="#000000">${data.fan}</text>
  </svg>`;

  card = await sharp(card).composite([{ input: Buffer.from(textSvg), left: 0, top: 0 }]).toBuffer();
  
  await sharp(card).toFile('test_front_color.png');
  console.log('Generated: test_front_color.png');
  
  // Verify
  const result = await sharp('test_front_color.png').raw().toBuffer({ resolveWithObject: true });
  
  // Check key positions for dark pixels (text)
  const checks = [
    { name: 'Name', x: 650, y: 108 },
    { name: 'DOB', x: 680, y: 273 },
    { name: 'Sex', x: 480, y: 373 },
    { name: 'Expiry', x: 720, y: 470 },
    { name: 'FAN', x: 450, y: 555 },
    { name: 'Photo', x: 150, y: 280 }
  ];
  
  console.log('\nVerification:');
  for (const c of checks) {
    const idx = (c.y * W + c.x) * 3;
    const bright = Math.round((result.data[idx] + result.data[idx+1] + result.data[idx+2]) / 3);
    const ok = bright < 200 ? '✓' : '?';
    console.log(`  ${ok} ${c.name}: brightness=${bright}`);
  }
}

generate().catch(console.error);
