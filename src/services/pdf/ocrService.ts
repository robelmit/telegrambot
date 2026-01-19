/**
 * OCR Service - Optimized for speed and accuracy
 * Priority: PaddleOCR (fast) > Google Vision API (premium) > Tesseract (fallback)
 */
import { logger } from '../../utils/logger';

export interface OCRResult {
  text: string;
  confidence: number;
  method: 'paddle' | 'google-vision' | 'tesseract';
  processingTime: number;
}

export class OCRService {
  private googleVisionClient: any = null;

  /**
   * Initialize Google Vision API (optional, requires credentials)
   */
  private async initGoogleVision() {
    if (!this.googleVisionClient && process.env.GOOGLE_VISION_ENABLED === 'true') {
      try {
        const vision = await import('@google-cloud/vision');
        this.googleVisionClient = new vision.ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_VISION_KEY_PATH
        });
        logger.info('Google Vision API initialized successfully');
      } catch (error) {
        logger.warn('Google Vision API not available:', error);
      }
    }
    return this.googleVisionClient;
  }

  /**
   * Extract text using PaddleOCR (FAST - ~2-3 seconds)
   */
  async extractWithPaddle(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();
    try {
      // Import PaddleOCR service
      const { PaddleOcrService } = await import('ppu-paddle-ocr');
      
      // Create PaddleOCR service instance and initialize
      const paddleOcr = new PaddleOcrService();
      await paddleOcr.initialize();
      
      // Convert Buffer to ArrayBuffer
      const arrayBuffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength
      ) as ArrayBuffer;
      
      // Run OCR
      const result = await paddleOcr.recognize(arrayBuffer);
      
      // Extract text from result
      let text = '';
      let totalConfidence = 0;
      let count = 0;

      if (result && Array.isArray(result)) {
        for (const item of result) {
          if (item && item.text) {
            text += item.text + ' ';
            totalConfidence += item.confidence || 0.9;
            count++;
          }
        }
      }

      const avgConfidence = count > 0 ? totalConfidence / count : 0.9;
      const processingTime = Date.now() - startTime;

      logger.info(`PaddleOCR completed in ${processingTime}ms, confidence: ${avgConfidence.toFixed(2)}`);

      return {
        text,
        confidence: avgConfidence,
        method: 'paddle',
        processingTime
      };
    } catch (error) {
      logger.error('PaddleOCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text using Google Vision API (PREMIUM - ~1-2 seconds, requires API key)
   */
  async extractWithGoogleVision(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();
    try {
      const client = await this.initGoogleVision();
      
      if (!client) {
        throw new Error('Google Vision API not configured');
      }

      const [result] = await client.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;
      const text = detections && detections.length > 0 ? detections[0].description : '';
      const confidence = detections && detections.length > 0 ? (detections[0].confidence || 0.95) : 0;
      const processingTime = Date.now() - startTime;

      logger.info(`Google Vision API completed in ${processingTime}ms, confidence: ${confidence.toFixed(2)}`);

      return {
        text: text || '',
        confidence,
        method: 'google-vision',
        processingTime
      };
    } catch (error) {
      logger.error('Google Vision API extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text using OCR.space API (FREE - 25,000 requests/month)
   */
  async extractWithOCRSpace(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();
    try {
      const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // Free tier key
      
      // Convert buffer to base64
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      
      // Make API request
      const FormData = require('form-data');
      const axios = require('axios');
      
      const formData = new FormData();
      formData.append('base64Image', base64Image);
      formData.append('language', 'ara'); // Arabic script (closest to Amharic)
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 is better for non-Latin scripts
      
      const response = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: {
          ...formData.getHeaders(),
          'apikey': apiKey
        }
      });

      const result = response.data;
      const text = result.ParsedResults?.[0]?.ParsedText || '';
      const confidence = result.ParsedResults?.[0]?.TextOrientation ? 0.8 : 0.6;
      const processingTime = Date.now() - startTime;

      logger.info(`OCR.space completed in ${processingTime}ms, confidence: ${confidence.toFixed(2)}`);

      return {
        text,
        confidence,
        method: 'tesseract', // Use tesseract as method name for compatibility
        processingTime
      };
    } catch (error) {
      logger.error('OCR.space extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text using Tesseract.js (OPTIMIZED - pure JS, no dependencies)
   */
  async extractWithTesseract(imageBuffer: Buffer, languages: string = 'eng+amh'): Promise<OCRResult> {
    const startTime = Date.now();
    try {
      const Tesseract = await import('tesseract.js');
      
      // Optimize for lower memory usage
      const result = await Tesseract.recognize(imageBuffer, languages, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`Tesseract OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const processingTime = Date.now() - startTime;
      logger.info(`Tesseract completed in ${processingTime}ms, confidence: ${result.data.confidence.toFixed(2)}`);

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
        method: 'tesseract',
        processingTime
      };
    } catch (error) {
      logger.error('Tesseract extraction failed:', error);
      throw error;
    }
  }

  /**
   * Smart OCR - Optimized for low memory usage
   * 1. Tesseract.js (pure JS, <1GB, stable) - DEFAULT
   * 2. OCR.space (free API, 25k/month) - BACKUP
   * 3. Google Vision (if enabled) - PREMIUM
   */
  async extractText(imageBuffer: Buffer, options?: {
    preferredMethod?: 'tesseract' | 'ocrspace' | 'google-vision';
    languages?: string;
    minConfidence?: number;
  }): Promise<OCRResult> {
    // Use tesseract.js as default (pure JS, no dependencies, stable)
    const preferredMethod = options?.preferredMethod || 'tesseract';
    const minConfidence = options?.minConfidence || 0.5;

    // Try preferred method first
    try {
      let result: OCRResult;

      switch (preferredMethod) {
        case 'google-vision':
          if (process.env.GOOGLE_VISION_ENABLED === 'true') {
            result = await this.extractWithGoogleVision(imageBuffer);
            if (result.confidence >= minConfidence) {
              return result;
            }
            logger.warn(`Google Vision confidence too low (${result.confidence}), trying Tesseract...`);
          }
          // Fall through to tesseract
          
        case 'tesseract':
          result = await this.extractWithTesseract(imageBuffer, options?.languages || 'eng+amh');
          return result;
          
        case 'ocrspace':
          try {
            result = await this.extractWithOCRSpace(imageBuffer);
            if (result.text && result.text.length > 10 && result.confidence >= minConfidence) {
              return result;
            }
            logger.warn(`OCR.space returned insufficient text, falling back to Tesseract...`);
          } catch (ocrspaceError) {
            logger.warn('OCR.space failed, falling back to Tesseract:', ocrspaceError);
          }
          // Fall through to tesseract
          result = await this.extractWithTesseract(imageBuffer, options?.languages || 'eng+amh');
          return result;
      }
    } catch (error) {
      logger.error(`OCR extraction failed with ${preferredMethod}:`, error);
      
      // Fallback to Tesseract if preferred method fails
      if (preferredMethod !== 'tesseract') {
        logger.info('Falling back to Tesseract...');
        return await this.extractWithTesseract(imageBuffer, options?.languages || 'eng+amh');
      }
      
      throw error;
    }

    // Should never reach here
    throw new Error('OCR extraction failed with all methods');
  }
}

export const ocrService = new OCRService();
