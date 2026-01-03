# Implementation Plan: eFayda ID Card Generator Telegram Bot

## Overview

This implementation plan breaks down the eFayda ID Card Generator into discrete, incremental tasks. Each task builds on previous work, ensuring no orphaned code. The plan follows a bottom-up approach: data models → services → bot handlers → integration.

## Tasks

- [x] 1. Project Setup and Configuration
  - [x] 1.1 Initialize Node.js TypeScript project with required dependencies
    - Initialize npm project with TypeScript configuration
    - Install core dependencies: telegraf, mongoose, bull, sharp, pdfkit, pdf-parse, fast-check
    - Install payment verifiers: telebirr-receipt, @jvhaile/cbe-verifier
    - Configure ESLint, Prettier, and Jest
    - _Requirements: All_

  - [x] 1.2 Set up project directory structure
    - Create src/bot/handlers, src/services, src/models, src/utils, src/locales directories
    - Create configuration files for environment variables
    - Set up Docker Compose for MongoDB and Redis
    - _Requirements: All_

  - [x] 1.3 Configure environment and secrets management
    - Create .env.example with all required variables
    - Set up config loader with validation
    - Configure Telegram bot token, MongoDB URI, Redis URI
    - _Requirements: 12.3_

- [x] 2. Data Models and Database Layer
  - [x] 2.1 Implement MongoDB schemas and models
    - Create User model with telegramId, language, walletBalance, settings
    - Create Transaction model with type, amount, provider, externalTransactionId
    - Create Job model with status, pdfPath, extractedData, outputFiles, attempts
    - Create UsedTransaction model for transaction ID tracking
    - _Requirements: 2.10, 8.1, 8.6_

  - [x] 2.2 Write property test for data persistence round-trip
    - **Property 3: Data Persistence Round-Trip**
    - **Validates: Requirements 2.10**

  - [x] 2.3 Implement database connection and initialization
    - Create MongoDB connection manager with retry logic
    - Create Redis connection for Bull queue
    - Implement graceful shutdown handlers
    - _Requirements: 11.1_

- [x] 3. Localization System
  - [x] 3.1 Implement multi-language support infrastructure
    - Create locale files for English, Amharic, Tigrigna (en.json, am.json, ti.json)
    - Implement i18n utility with message key lookup
    - Create type-safe message key definitions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 3.2 Write property test for localization completeness
    - **Property 15: Localization Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

- [x] 4. Checkpoint - Database and Localization
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. PDF Service Implementation
  - [ ] 5.1 Implement PDF validator
    - Create file extension validation (accept only .pdf)
    - Implement PDF structure validation using pdf-parse
    - Create eFayda document structure detection
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 5.2 Write property test for file extension validation
    - **Property 1: File Extension Validation**
    - **Validates: Requirements 1.1**

  - [ ] 5.3 Write property test for invalid PDF rejection
    - **Property 2: Invalid PDF Rejection**
    - **Validates: Requirements 1.3**

  - [ ] 5.4 Implement PDF parser for text extraction
    - Extract full name in Ethiopic and Latin scripts
    - Extract dates (DOB, issue, expiry) in both calendar formats
    - Extract identifiers (FCN, FIN, FAN, serial number)
    - Extract contact info (phone, address components)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9_

  - [ ] 5.5 Implement PDF parser for image extraction
    - Extract embedded photo image
    - Extract QR code image
    - Extract barcode data
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ] 5.6 Implement data normalizer
    - Normalize extracted text fields
    - Validate and format phone numbers
    - Normalize address components
    - Create EfaydaData object from parsed data
    - _Requirements: 2.1-2.10_

- [ ] 6. Checkpoint - PDF Service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Payment Service Implementation
  - [ ] 7.1 Implement Telebirr transaction verifier
    - Integrate telebirr-receipt package
    - Implement transaction ID verification
    - Extract and validate receiver, amount, status
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 7.2 Implement CBE Birr transaction verifier
    - Integrate @jvhaile/cbe-verifier package
    - Implement transaction ID verification
    - Extract and validate transaction details
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ] 7.3 Implement wallet service
    - Create getBalance, credit, debit methods
    - Implement transaction history tracking
    - Add balance validation before debit
    - Implement used transaction ID tracking
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [ ] 7.4 Write property test for valid transaction credits wallet
    - **Property 11: Valid Transaction Credits Wallet**
    - **Validates: Requirements 6.3, 7.3**

  - [ ] 7.5 Write property test for invalid/used transaction rejection
    - **Property 12: Invalid/Used Transaction Rejection**
    - **Validates: Requirements 6.4, 7.4**

  - [ ] 7.6 Write property test for wallet balance invariant
    - **Property 13: Wallet Balance Invariant**
    - **Validates: Requirements 8.1, 8.4, 8.6**

  - [ ] 7.7 Write property test for insufficient balance prevention
    - **Property 14: Insufficient Balance Prevention**
    - **Validates: Requirements 8.5**

  - [ ] 7.8 Write property test for transaction ID uniqueness
    - **Property 19: Transaction ID Uniqueness**
    - **Validates: Requirements 6.4, 7.4**

- [ ] 8. Checkpoint - Payment Service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. ID Generation Service Implementation
  - [ ] 9.1 Implement image processor utilities
    - Create mirror function using Sharp
    - Create grayscale conversion function
    - Create resize function with aspect ratio preservation
    - Create photo mask function (rounded/oval)
    - _Requirements: 3.4, 3.6, 3.10_

  - [ ] 9.2 Write property test for image mirroring round-trip
    - **Property 4: Image Mirroring Round-Trip**
    - **Validates: Requirements 3.4**

  - [ ] 9.3 Write property test for grayscale idempotence
    - **Property 5: Grayscale Conversion Idempotence**
    - **Validates: Requirements 3.6**

  - [ ] 9.4 Implement card renderer for front card
    - Create canvas with Ethiopian Digital ID Card layout
    - Render Ethiopian flag and National ID logo
    - Render photo with proper masking
    - Render text fields (name, DOB, sex, expiry, FAN)
    - Render barcode
    - Support both Ethiopic and Latin typography
    - _Requirements: 3.1, 3.7, 3.9_

  - [ ] 9.5 Implement card renderer for back card
    - Create canvas with back card layout
    - Render phone number, nationality, address
    - Render FIN and serial number
    - Render QR code
    - Add disclaimer text
    - _Requirements: 3.2, 3.8, 3.9_

  - [ ] 9.6 Implement card variant generator
    - Generate normal and mirrored versions
    - Generate color and grayscale versions
    - Combine front and back into single image
    - Ensure 300 DPI output resolution
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.10_

  - [ ] 9.7 Write property test for image resolution compliance
    - **Property 6: Image Resolution Compliance**
    - **Validates: Requirements 3.10**

  - [ ] 9.8 Implement A4 PDF generator
    - Create A4 page with proper dimensions
    - Position ID cards on page for printing
    - Embed required fonts for Ethiopic/Latin
    - Generate mirrored PDF versions
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 9.9 Write property test for A4 PDF page size
    - **Property 7: A4 PDF Page Size**
    - **Validates: Requirements 4.1**

- [ ] 10. Checkpoint - ID Generation Service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Job Queue Implementation
  - [ ] 11.1 Set up Bull queue with Redis
    - Configure job queue with retry settings
    - Set up job processors
    - Implement job status tracking
    - _Requirements: 11.1, 11.2_

  - [ ] 11.2 Implement job processor
    - Process PDF parsing job
    - Process ID generation job
    - Handle job completion and failure
    - Implement retry logic (max 3 attempts)
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [ ] 11.3 Write property test for job retry limit
    - **Property 16: Job Retry Limit**
    - **Validates: Requirements 11.3**

  - [ ] 11.4 Implement job failure handling
    - Notify user on permanent failure
    - Refund wallet on failure
    - Log failure details
    - _Requirements: 11.4, 13.3_

  - [ ] 11.5 Write property test for failed job refund
    - **Property 17: Failed Job Refund**
    - **Validates: Requirements 11.4**

- [ ] 12. File Delivery and Cleanup
  - [ ] 12.1 Implement file delivery service
    - Generate descriptive filenames
    - Send files as Telegram documents
    - Track delivery status
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 12.2 Write property test for output file count
    - **Property 8: Output File Count**
    - **Validates: Requirements 5.1, 5.2**

  - [ ] 12.3 Write property test for file delivery filename format
    - **Property 9: File Delivery Filename Format**
    - **Validates: Requirements 5.4**

  - [ ] 12.4 Implement temporary file cleanup
    - Set up TTL index on Job model
    - Implement file deletion after delivery
    - Schedule cleanup job for orphaned files
    - _Requirements: 5.5, 12.1, 12.2_

  - [ ] 12.5 Write property test for temporary file cleanup
    - **Property 10: Temporary File Cleanup**
    - **Validates: Requirements 5.5, 12.2**

- [ ] 13. Checkpoint - Job Queue and Delivery
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Security and Rate Limiting
  - [ ] 14.1 Implement rate limiting middleware
    - Create Redis-based rate limiter
    - Configure 10 requests per minute per user
    - Return appropriate error messages
    - _Requirements: 12.4_

  - [ ] 14.2 Write property test for rate limiting
    - **Property 18: Rate Limiting**
    - **Validates: Requirements 12.4**

  - [ ] 14.3 Implement input validation and sanitization
    - Validate all user inputs
    - Sanitize file names and paths
    - Prevent injection attacks
    - _Requirements: 12.6_

  - [ ] 14.4 Implement audit logging
    - Log all operations without sensitive data
    - Encrypt transaction logs
    - Set up log rotation
    - _Requirements: 12.3, 12.5_

- [ ] 15. Telegram Bot Handlers
  - [ ] 15.1 Implement bot initialization and middleware
    - Set up Telegraf bot instance
    - Configure session middleware
    - Set up error handling middleware
    - _Requirements: 9.1-9.10_

  - [ ] 15.2 Implement /start command handler
    - Display welcome message
    - Show available commands
    - Create user if not exists
    - _Requirements: 9.1_

  - [ ] 15.3 Implement /language command handler
    - Display language selection keyboard
    - Save language preference
    - Confirm language change
    - _Requirements: 9.2, 10.4_

  - [ ] 15.4 Implement /upload command handler
    - Prompt for PDF upload
    - Handle document reception
    - Validate and process PDF
    - _Requirements: 9.3, 1.1-1.5_

  - [ ] 15.5 Implement /balance command handler
    - Retrieve user wallet balance
    - Display formatted balance
    - _Requirements: 9.4, 8.2_

  - [ ] 15.6 Implement /topup command handler
    - Display 8 top-up amount options
    - Display payment provider selection
    - Show payment instructions
    - Handle transaction ID submission
    - _Requirements: 9.5, 8.3_

  - [ ] 15.7 Write property test for top-up amount options
    - **Property 20: Top-up Amount Options**
    - **Validates: Requirements 8.3**

  - [ ] 15.8 Implement /pricing command handler
    - Display service pricing
    - Show package details
    - _Requirements: 9.6_

  - [ ] 15.9 Implement /settings command handler
    - Display settings menu
    - Handle settings updates
    - _Requirements: 9.7_

  - [ ] 15.10 Implement /help command handler
    - Display help information
    - Show usage guide
    - Provide support contact
    - _Requirements: 9.8, 13.5_

  - [ ] 15.11 Implement inline keyboard handlers
    - Create reusable keyboard builders
    - Handle callback queries
    - Provide progress feedback
    - _Requirements: 9.9, 9.10_

- [ ] 16. Checkpoint - Bot Handlers
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Integration and Error Handling
  - [ ] 17.1 Wire all services together
    - Connect bot handlers to services
    - Set up dependency injection
    - Configure service initialization order
    - _Requirements: All_

  - [ ] 17.2 Implement comprehensive error handling
    - Create error code definitions
    - Implement localized error messages
    - Add retry prompts for recoverable errors
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 17.3 Implement graceful shutdown
    - Handle SIGTERM/SIGINT signals
    - Complete in-progress jobs
    - Close database connections
    - _Requirements: 11.2_

- [ ] 18. Final Integration Testing
  - [ ] 18.1 Create end-to-end test suite
    - Test complete PDF upload flow
    - Test payment and wallet flow
    - Test file delivery flow
    - _Requirements: All_

  - [ ] 18.2 Performance testing
    - Verify 30-second job completion
    - Test concurrent job handling
    - Verify rate limiting under load
    - _Requirements: 5.3, 11.2, 11.5_

- [ ] 19. Deployment Configuration
  - [ ] 19.1 Create production Docker configuration
    - Create Dockerfile for bot application
    - Create docker-compose.yml for full stack
    - Configure environment variables
    - _Requirements: All_

  - [ ] 19.2 Create deployment documentation
    - Document environment setup
    - Document deployment steps
    - Document monitoring and maintenance
    - _Requirements: All_

- [ ] 20. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
