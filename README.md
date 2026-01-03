# eFayda ID Card Generator Telegram Bot

A production-ready Telegram bot that converts official Ethiopian eFayda PDF documents into print-ready National ID cards with payment integration.

## Features

- 📄 PDF upload and validation for eFayda documents
- 🎨 ID card generation (front/back, color/grayscale, mirrored)
- 📑 A4 PDF generation for printing (300 DPI)
- 💳 Payment integration (Telebirr and CBE Birr)
- 💰 Wallet system with 8 fixed top-up amounts
- 🌍 Multi-language support (English, Amharic, Tigrigna)
- ⚡ Fast processing (<30 seconds per job)
- 🔒 Secure with rate limiting and audit logging

## Output Files

Each successful conversion produces 4 files:
- 2 Mirrored PNG images (Color & Grayscale)
- 2 Mirrored A4 PDF files (Color & Grayscale)

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Bot Framework**: Telegraf
- **Database**: MongoDB
- **Queue**: In-memory job queue
- **Image Processing**: Sharp
- **PDF**: PDFKit, pdf-parse
- **Payment**: telebirr-receipt, @jvhaile/cbe-verifier

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Telegram Bot Token (from @BotFather)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd efayda-id-generator

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Configuration

Edit `.env` file with your settings:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
MONGODB_URI=mongodb://localhost:27017/efayda
TELEBIRR_RECEIVER_PHONE=09XXXXXXXX
CBE_RECEIVER_ACCOUNT=1000XXXXXXXX
SERVICE_PRICE=50
```

### Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Production Deployment

#### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop services
docker-compose down
```

#### Manual Deployment

```bash
# Build
npm run build

# Start
npm start
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show menu |
| `/upload` | Upload eFayda PDF document |
| `/balance` | Check wallet balance |
| `/topup` | Top up wallet |
| `/pricing` | View service pricing |
| `/language` | Change language |
| `/settings` | Bot settings |
| `/help` | Get help |

## Top-up Amounts

- 100 ETB
- 200 ETB
- 300 ETB
- 400 ETB
- 500 ETB
- 600 ETB
- 800 ETB
- 1000 ETB

## Architecture

```
src/
├── bot/           # Telegram bot handlers
├── config/        # Configuration
├── locales/       # i18n translations
├── models/        # MongoDB schemas
├── services/
│   ├── delivery/  # File delivery
│   ├── generator/ # ID card generation
│   ├── payment/   # Payment verification
│   ├── pdf/       # PDF parsing
│   └── queue/     # Job queue
├── types/         # TypeScript types
└── utils/         # Utilities
```

## Security Features

- Rate limiting (10 requests/minute per user)
- Input validation and sanitization
- Transaction ID uniqueness enforcement
- Audit logging with encryption
- Automatic file cleanup
- No permanent storage of ID files

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=wallet
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather | required |
| `MONGODB_URI` | MongoDB connection string | required |
| `TELEBIRR_RECEIVER_PHONE` | Telebirr receiver phone | required |
| `CBE_RECEIVER_ACCOUNT` | CBE account number | required |
| `SERVICE_PRICE` | Price per ID generation | 50 |
| `TEMP_DIR` | Temporary file directory | temp |
| `LOG_LEVEL` | Logging level | info |

## License

MIT
