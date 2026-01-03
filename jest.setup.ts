// Jest setup file
// Configure test environment

// Increase timeout for property-based tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/efayda-test';
process.env.REDIS_URI = 'redis://localhost:6379';
process.env.BOT_TOKEN = 'test-bot-token';

// Suppress console logs during tests unless debugging
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
