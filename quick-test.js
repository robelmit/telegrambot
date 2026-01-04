const sharp = require('sharp');

const CARD_WIDTH = 1344;
const CARD_HEIGHT = 768;
const PHOTO_WIDTH = 200;
const PHOTO_HEIGHT = 260;
const PHOTO_X = 55;
const PHOTO_Y = 175;

async function test() {
  const data = {
    fullNameAmharic: 'ዓወት ትካቦ ገብረሂወት',
    fullNameEnglish: 'Awet Tikabo Gebrehiwet',
    dateOfBirthEthiopian: '07/10/1995',
    dateOfBirthGregorian: '2003/06/14',
    sex: 'Male',
    expiryDate: 'N/A',
    fan: '2062 5372 6194 7982'
  };

  let card = await sharp('src/assets/front_template.png').resize(CARD_WIDTH, CARD_HEIGHT).png().toBuffer();

  // Photo placeholder with person silhouette
  const photoSvg = `<svg width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}">
    <rect width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}" fill="#e8e8e8" stroke="#aaa" stroke-width="2" rx="5"/>
    <circle cx="${PHOTO_WIDTH/2}" cy="80" r="45" fill="#bbb"/>
    <ellipse cx="${PHOTO_WIDTH/2}" cy="200" rx="65" ry="50" fill="#bbb"/>
  </svg>`;
  const photo = await sharp(Buffer.from(photoSvg)).png().toBuffer();
  card = await sharp(card).composite([{ input: photo, left: PHOTO_X, top: PHOTO_Y }]).toBuffer();

  /*
   * TEMPLATE LABEL POSITIONS (approximate from image):
   * 
   * "መሉ ስም | Full Name" - label at ~x=350-570, y=105
   *    -> Values should start at x=580, y=105 (same line) or below
   * 
   * "የትውልድ ቀን | Date of Birth" - label at ~x=350-620, y=270
   *    -> Values at x=630, y=270
   * 
   * "ጾታ | Sex" - label at ~x=350-450, y=370
   *    -> Value at x=460, y=370
   * 
   * "የሚያበቃበት ቀን | Date of Expiry" - label at ~x=350-680, y=465
   *    -> Value at x=690, y=465
   * 
   * "ካርድ ቁጥር / FAN" - label at ~x=420-550, y=620
   *    -> Value ABOVE at x=420, y=555
   */

  const textSvg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
    <!-- Full Name - right after label -->
    <text x="580" y="108" font-family="Arial,sans-serif" font-size="18" fill="#111">${data.fullNameAmharic}</text>
    <text x="580" y="132" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="#000">${data.fullNameEnglish}</text>
    
    <!-- Date of Birth - right after label -->
    <text x="625" y="272" font-family="Arial,sans-serif" font-size="17" fill="#000">${data.dateOfBirthEthiopian}</text>
    <text x="625" y="295" font-family="Arial,sans-serif" font-size="15" fill="#333">${data.dateOfBirthGregorian}</text>
    
    <!-- Sex - right after label -->
    <text x="455" y="372" font-family="Arial,sans-serif" font-size="17" fill="#000">${data.sex}</text>
    
    <!-- Date of Expiry - right after label -->
    <text x="685" y="467" font-family="Arial,sans-serif" font-size="17" fill="#000">${data.expiryDate}</text>
    
    <!-- FAN - ABOVE the FAN label -->
    <text x="420" y="555" font-family="Courier New,monospace" font-size="22" font-weight="bold" fill="#000">${data.fan}</text>
  </svg>`;
  
  card = await sharp(card).composite([{ input: Buffer.from(textSvg), left: 0, top: 0 }]).toBuffer();
  await sharp(card).toFile('test_front_color.png');
  console.log('Generated: test_front_color.png');
}

test().catch(console.error);
