import { EfaydaData } from '../../types';
export interface CardRenderOptions {
    variant: 'color' | 'grayscale';
    dpi?: number;
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
     */
    renderFront(data: EfaydaData, options?: CardRenderOptions): Promise<Buffer>;
    /**
     * Render back card - EXACTLY like test script renderBackCard function
     */
    renderBack(data: EfaydaData, options?: CardRenderOptions): Promise<Buffer>;
    private applyGrayscale;
}
export default CardRenderer;
export declare function getCardDimensions(): {
    width: number;
    height: number;
};
//# sourceMappingURL=cardRenderer.d.ts.map