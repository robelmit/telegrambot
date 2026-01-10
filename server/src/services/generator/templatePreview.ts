/**
 * Template preview - loads pre-generated static image
 * To regenerate: npx ts-node generate-template-preview.ts
 */
import path from 'path';
import fs from 'fs';

const PREVIEW_PATH = path.join(process.cwd(), 'src/assets/template_preview.png');

/**
 * Get the template preview image buffer (always reads fresh from disk)
 */
export function getTemplatePreview(): Buffer {
  if (!fs.existsSync(PREVIEW_PATH)) {
    throw new Error('Template preview image not found. Run: npx ts-node generate-template-preview.ts');
  }
  
  return fs.readFileSync(PREVIEW_PATH);
}

export default { getTemplatePreview };
