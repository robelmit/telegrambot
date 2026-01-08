require('dotenv').config();

console.log('🔍 Diagnostic Script Starting...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Token present:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('MongoDB URI present:', !!process.env.MONGODB_URI);

async function testMongoDB() {
  console.log('\n📊 Testing MongoDB connection...');
  try {
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully');
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testBot() {
  console.log('\n🤖 Testing Bot creation...');
  try {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    console.log('✅ Bot instance created');
    
    // Test bot info
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot info retrieved:', botInfo.username);
    
    return true;
  } catch (error) {
    console.log('❌ Bot test failed:', error.message);
    return false;
  }
}

async function testServices() {
  console.log('\n⚙️ Testing Services...');
  try {
    const { PDFService } = require('./services/pdf');
    const { IDGeneratorService } = require('./services/generator');
    const { WalletService } = require('./services/payment');
    
    const pdfService = new PDFService();
    const idGenerator = new IDGeneratorService();
    const walletService = new WalletService();
    
    console.log('✅ All services initialized');
    return true;
  } catch (error) {
    console.log('❌ Services test failed:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

async function runDiagnostics() {
  const mongoOk = await testMongoDB();
  const botOk = await testBot();
  const servicesOk = await testServices();
  
  console.log('\n📋 Summary:');
  console.log('MongoDB:', mongoOk ? '✅' : '❌');
  console.log('Bot:', botOk ? '✅' : '❌');
  console.log('Services:', servicesOk ? '✅' : '❌');
  
  if (mongoOk && botOk && servicesOk) {
    console.log('\n🎉 All tests passed! The issue might be in the main startup sequence.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
}

runDiagnostics().catch(console.error);