import { EfaydaData } from '../../types';
export type TemplateType = 'template0' | 'template1' | 'template2';
export interface CardRenderOptions {
    variant: 'color' | 'grayscale';
    dpi?: number;
    template?: TemplateType;
}
export declare function registerFonts(): void;
export declare class CardRenderer {
    constructor();
    getCardDimensions(): {
        width: number;
        height: number;
    };
    /**
     * Render front card - EXACTLY like test script renderFrontCard function
     * Uses sRGB normalized templates for consistent color printing
     */
    renderFront(data: EfaydaData, options?: CardRenderOptions): Promise<Buffer>;
    /**
     * Render back card - EXACTLY like test script renderBackCard function
     * Uses sRGB normalized templates for consistent color printing
     */
    renderBack(data: EfaydaData, options?: CardRenderOptions): Promise<Buffer>;
    private applyGrayscale;
}
export default CardRenderer;
export declare function getCardDimensions(template?: TemplateType): {
    width: number;
    height: number;
};
export declare function getAvailableTemplates(): {
    id: TemplateType;
    name: string;
}[];
/**
 * Pre-warm the AI background removal pipeline on startup
 * This ensures the model is loaded before any requests come in
 * Call this during server initialization
 */
export declare function preWarmBackgroundRemoval(): Promise<boolean>;
//# sourceMappingURL=cardRenderer.d.ts.map