/**
 * Analyze template layout to find label positions
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function analyzeTemplate() {
  console.log('Analyzing template layout...\n');

  await fs.mkdir('test-output/template-regions', { recursive: true });

  // Extract template regions to see where labels are
  const frontTemplate = sharp('template/front_template.png');
  
  // Full left side (photo + labels)
  await frontTemplate.clone().extract({ left: 0, top: 0, width: 280, height: 638 })
    .toFile('test-output/template-regions/front_left.png');
  
  // Full right side (value areas)
  await frontTemplate.clone().extract({ left: 280, top: 0, width: 732, height: 638 })
    .toFile('test-output/template-regions/front_right.png');

  // Top section with name labels
  await frontTemplate.clone().extract({ left: 0, top: 80, width: 1012, height: 120 })
    .toFile('test-output/template-regions/front_name_section.png');

  // Middle section with DOB, Sex labels
  await frontTemplate.clone().extract({ left: 0, top: 200, width: 1012, height: 200 })
    .toFile('test-output/template-regions/front_middle_section.png');

  // Bottom section with expiry, FAN, barcode
  await frontTemplate.clone().extract({ left: 0, top: 400, width: 1012, height: 238 })
    .toFile('test-output/template-regions/front_bottom_section.png');

  const backTemplate = sharp('template/back_template.png');

  // Top section
  await backTemplate.clone().extract({ left: 0, top: 0, width: 1012, height: 200 })
    .toFile('test-output/template-regions/back_top_section.png');

  // Address section
  await backTemplate.clone().extract({ left: 0, top: 200, width: 500, height: 300 })
    .toFile('test-output/template-regions/back_address_section.png');

  // Bottom section
  await backTemplate.clone().extract({ left: 0, top: 500, width: 1012, height: 138 })
    .toFile('test-output/template-regions/back_bottom_section.png');

  console.log('✓ Extracted template regions');
  console.log('Check test-output/template-regions/ folder');
}

analyzeTemplate().catch(console.error);
