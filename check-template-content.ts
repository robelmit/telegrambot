/**
 * Check what text is already in the template vs what needs to be added
 */

import { createCanvas, loadImage } from 'canvas';

async function checkTemplate() {
  const template = await loadImage('template/front_template.png');
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);
  const data = ctx.getImageData(0, 0, template.width, template.height);

  console.log('=== FRONT TEMPLATE - CHECKING FOR EXISTING TEXT ===\n');
  
  // Check if there's dark text in specific areas
  const checkArea = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    let darkPixels = 0;
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * template.width + x) * 4;
        const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
        if (brightness < 100) darkPixels++;
      }
    }
    const hasDark = darkPixels > 50;
    console.log(`${name}: ${hasDark ? 'HAS TEXT' : 'EMPTY'} (${darkPixels} dark pixels)`);
    return hasDark;
  };

  // Check label areas (should have text in template)
  console.log('Label areas (should be in template):');
  checkArea('  "ሙሉ ስም | Full Name" label', 270, 125, 500, 150);
  checkArea('  "የትውልድ ቀን | Date of Birth" label', 270, 240, 550, 265);
  checkArea('  "ፆታ | Sex" label', 270, 325, 400, 355);
  checkArea('  "የሚያበቃበት ቀን | Date of Expiry" label', 270, 415, 550, 445);
  checkArea('  "ካርድ ቁጥር FAN" label', 260, 520, 330, 570);
  
  console.log('\nValue areas (should be empty in template):');
  checkArea('  Name Amharic value area', 280, 150, 700, 185);
  checkArea('  Name English value area', 280, 185, 700, 230);
  checkArea('  DOB value area', 280, 265, 600, 310);
  checkArea('  Sex value area', 280, 355, 500, 400);
  checkArea('  Expiry value area', 280, 445, 600, 490);
  checkArea('  FAN value area', 330, 535, 760, 570);
  checkArea('  Barcode area', 330, 565, 810, 600);
  
  // Check back template
  console.log('\n\n=== BACK TEMPLATE - CHECKING FOR EXISTING TEXT ===\n');
  
  const templateBack = await loadImage('template/back_template.png');
  ctx.drawImage(templateBack, 0, 0);
  const backData = ctx.getImageData(0, 0, templateBack.width, templateBack.height);
  
  const checkAreaBack = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    let darkPixels = 0;
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * templateBack.width + x) * 4;
        const brightness = (backData.data[i] + backData.data[i+1] + backData.data[i+2]) / 3;
        if (brightness < 100) darkPixels++;
      }
    }
    const hasDark = darkPixels > 50;
    console.log(`${name}: ${hasDark ? 'HAS TEXT' : 'EMPTY'} (${darkPixels} dark pixels)`);
    return hasDark;
  };
  
  console.log('Label areas:');
  checkAreaBack('  "ስልክ | Phone Number" label', 20, 15, 200, 40);
  checkAreaBack('  "ዜግነት | Nationality" label', 20, 80, 200, 110);
  checkAreaBack('  "ኢትዮጵያ" (Ethiopia)', 20, 125, 170, 165);
  checkAreaBack('  "አድራሻ | Address" label', 20, 165, 180, 195);
  checkAreaBack('  "FIN" label', 20, 425, 100, 455);
  checkAreaBack('  "SN:" label', 770, 465, 820, 495);
  
  console.log('\nValue areas:');
  checkAreaBack('  Phone value area', 25, 40, 220, 80);
  checkAreaBack('  "| ET" area', 175, 125, 250, 165);
  checkAreaBack('  Region value area', 25, 195, 200, 270);
  checkAreaBack('  City value area', 25, 255, 150, 330);
  checkAreaBack('  Subcity value area', 25, 315, 230, 395);
  checkAreaBack('  FIN value area', 100, 425, 280, 460);
  checkAreaBack('  SN value area', 820, 465, 960, 500);
  checkAreaBack('  QR code area', 480, 15, 880, 415);
}

checkTemplate().catch(console.error);
