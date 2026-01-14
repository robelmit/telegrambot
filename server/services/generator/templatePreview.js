"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplatePreview = getTemplatePreview;
/**
 * Template preview - loads pre-generated static image
 * To regenerate: npx ts-node generate-template-preview.ts
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const PREVIEW_PATH = path_1.default.join(process.cwd(), 'src/assets/template_preview.png');
/**
 * Get the template preview image buffer (always reads fresh from disk)
 */
function getTemplatePreview() {
    if (!fs_1.default.existsSync(PREVIEW_PATH)) {
        throw new Error('Template preview image not found. Run: npx ts-node generate-template-preview.ts');
    }
    return fs_1.default.readFileSync(PREVIEW_PATH);
}
exports.default = { getTemplatePreview };
//# sourceMappingURL=templatePreview.js.map