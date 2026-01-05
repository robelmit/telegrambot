/**
 * Test script for card rendering
 * Run with: npx ts-node test-card-render.ts
 */

import { CardRenderer } from './src/services/generator/cardRenderer';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';

// Sample data matching the reference images
const sampleData: EfaydaData = {
  // Personal Information
  fullNameAmharic: 'ፀጋ ገብረስላሴ ገብረሂወት',
  fullNameEnglish: 'Tsega Gebreslasie Gebrehiwot',
  dateOfBirthEthiopian: '1981/Apr/29',
  dateOfBirthGregorian: '21/08/1973',
  sex: 'Female',
  nationality: 'Ethiopian',
  phoneNumber: '0913687923',
  
  // Address
  region: 'Tigray',
  city: 'Mekelle',
  subcity: 'Hadnet Sub City',
  
  // Identifiers
  fcn: '',
  fin: '4189 2798 1057',
  fan: '3092 7187 9089 3152',
  serialNumber: '5479474',
  
  // Dates
  issueDate: '2025/Dec/10',
  issueDateEthiopian: '2018/04/01',
  expiryDate: '2033/Dec/10',
  expiryDateGregorian: '2026/04/01',
  expiryDateEthiopian: '2033/Dec/10',
  
  // Images - will be undefined for this test (template only)
  photo: undefined,
  qrCode: undefined,
};

async function testRender() {
  console.log('Starting card render test...\n');

  const renderer = new CardRenderer();
  const outputDir = 'test-output';

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // Render front card (color)
    console.log('Rendering front card (color)...');
    const frontColor = await renderer.renderFront(sampleData, { variant: 'color' });
    await fs.writeFile(path.join(outputDir, 'front_color.png'), frontColor);
    console.log('✓ Saved: test-output/front_color.png');

    // Render front card (grayscale)
    console.log('Rendering front card (grayscale)...');
    const frontGray = await renderer.renderFront(sampleData, { variant: 'grayscale' });
    await fs.writeFile(path.join(outputDir, 'front_grayscale.png'), frontGray);
    console.log('✓ Saved: test-output/front_grayscale.png');

    // Render back card (color)
    console.log('Rendering back card (color)...');
    const backColor = await renderer.renderBack(sampleData, { variant: 'color' });
    await fs.writeFile(path.join(outputDir, 'back_color.png'), backColor);
    console.log('✓ Saved: test-output/back_color.png');

    // Render back card (grayscale)
    console.log('Rendering back card (grayscale)...');
    const backGray = await renderer.renderBack(sampleData, { variant: 'grayscale' });
    await fs.writeFile(path.join(outputDir, 'back_grayscale.png'), backGray);
    console.log('✓ Saved: test-output/back_grayscale.png');

    console.log('\n✅ All renders completed successfully!');
    console.log('Check the test-output folder to verify the results.');

  } catch (error) {
    console.error('❌ Render failed:', error);
    process.exit(1);
  }
}

testRender();
