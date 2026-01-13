/**
 * Quick test to verify @huggingface/transformers background removal
 */
import { pipeline, env } from '@huggingface/transformers';
import fs from 'fs';
import path from 'path';

// Configure for Node.js
env.allowLocalModels = true;
env.useBrowserCache = false;

async function testTransformers() {
  try {
    console.log('Testing @huggingface/transformers background removal...');
    console.log('Loading modnet model (this may take a moment on first run)...');
    
    // Initialize the pipeline
    const segmenter = await pipeline('image-segmentation', 'Xenova/modnet', {
      dtype: 'fp32'
    });
    
    console.log('Model loaded successfully!');
    
    // Check if we have a test image
    const testImagePath = path.join(process.cwd(), 'assets', 'front1.JPG');
    
    if (fs.existsSync(testImagePath)) {
      console.log(`Testing with: ${testImagePath}`);
      
      console.log('Running segmentation...');
      const result = await segmenter(testImagePath);
      
      console.log('Result keys:', Object.keys(result[0] || {}));
      console.log('✅ Background removal test successful!');
    } else {
      console.log('No test image found, but model loaded successfully!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testTransformers().then(success => {
  console.log(success ? '🎉 Test completed!' : '💥 Test failed!');
  process.exit(success ? 0 : 1);
});