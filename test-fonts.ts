import { registerFont, createCanvas } from 'canvas';
import path from 'path';
import fs from 'fs';

// Use process.cwd() for absolute path
const FONTS_DIR = path.join(process.cwd(), 'src', 'assets', 'fonts');

console.log('FONTS_DIR:', FONTS_DIR);
console.log('nyala.ttf exists:', fs.existsSync(path.join(FONTS_DIR, 'nyala.ttf')));
console.log('Nyala1.ttf exists:', fs.existsSync(path.join(FONTS_DIR, 'Nyala1.ttf')));

// Register fonts BEFORE creating canvas
registerFont(path.join(FONTS_DIR, 'nyala.ttf'), { family: 'Nyala' });
registerFont(path.join(FONTS_DIR, 'Nyala1.ttf'), { family: 'NyalaBold' });
registerFont(path.join(FONTS_DIR, 'Inter-Medium.otf'), { family: 'InterMedium' });
registerFont(path.join(FONTS_DIR, 'Inter-SemiBold.otf'), { family: 'InterSemiBold' });
registerFont(path.join(FONTS_DIR, 'Inter-Bold.otf'), { family: 'InterBold' });
registerFont(path.join(FONTS_DIR, 'OCR.ttf'), { family: 'OCRB' });

console.log('Fonts registered');

const canvas = createCanvas(600, 300);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 600, 300);

ctx.fillStyle = 'black';
ctx.textBaseline = 'top';

// Test each font
ctx.font = '32px "Nyala"';
ctx.fillText('Nyala: ፀጋ ገብረስላሴ ገብረሂወት', 10, 10);

ctx.font = '32px "NyalaBold"';
ctx.fillText('NyalaBold: ፀጋ ገብረስላሴ ገብረሂወት', 10, 50);

ctx.font = '28px "InterMedium"';
ctx.fillText('InterMedium: Tsega Gebreslasie', 10, 100);

ctx.font = '28px "InterSemiBold"';
ctx.fillText('InterSemiBold: 21/08/1973', 10, 140);

ctx.font = '28px "InterBold"';
ctx.fillText('InterBold: 5479474', 10, 180);

ctx.font = '28px "OCRB"';
ctx.fillText('OCRB: 3092 7187 9089 3152', 10, 220);

fs.writeFileSync('test-output/font-test.png', canvas.toBuffer('image/png'));
console.log('Saved to test-output/font-test.png');
