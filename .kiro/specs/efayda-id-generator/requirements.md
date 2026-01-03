# Requirements Document

## Introduction

This document specifies the requirements for an Ethiopian National ID (eFayda) Card Generator Telegram Bot. The system accepts official eFayda PDF documents downloaded from the Ethiopian government website, extracts demographic and biometric data, and generates print-ready National ID cards in multiple formats. The bot integrates with Telebirr and CBE Birr payment systems for transaction verification and wallet-based billing.

## Glossary

- **Bot**: The Telegram Bot application that processes user requests
- **eFayda_PDF**: Official Ethiopian National ID PDF document downloaded from the government eFayda portal
- **ID_Card**: Generated National ID card image or document
- **Front_Card**: The front side of the Ethiopian Digital ID Card containing photo, name, DOB, sex, expiry, FAN, and Ethiopian flag
- **Back_Card**: The back side of the Ethiopian Digital ID Card containing phone, nationality, address, FIN, QR code, and serial number
- **Normal_Image**: Standard orientation ID card image
- **Mirrored_Image**: Horizontally flipped ID card image for lamination/printing purposes
- **Color_Variant**: Full color version of the ID card
- **Grayscale_Variant**: Black and white version of the ID card
- **A4_PDF**: Print-ready PDF document sized at A4 (210mm x 297mm) at 300 DPI
- **Wallet**: User's prepaid balance stored in the system for service charges
- **Transaction_ID**: Unique identifier from Telebirr or CBE Birr payment receipt
- **Parser**: Component that extracts text and images from eFayda PDF documents
- **Generator**: Component that creates ID card images and PDFs from extracted data
- **Payment_Verifier**: Component that validates transaction IDs against Telebirr/CBE APIs
- **Job_Queue**: Background processing system for PDF-to-ID generation tasks
- **FCN**: Fayda Card Number - unique identifier on the ID card
- **FIN**: Fayda Identification Number - secondary identifier
- **FAN**: Fayda Account Number - account reference number

## Requirements

### Requirement 1: PDF Document Upload and Validation

**User Story:** As a user, I want to upload my eFayda PDF document to the bot, so that I can generate my National ID cards.

#### Acceptance Criteria

1. WHEN a user sends a PDF file to the Bot, THE Bot SHALL accept files with .pdf extension only
2. WHEN a PDF is received, THE Parser SHALL validate that it matches the official eFayda document structure
3. IF an invalid or corrupted PDF is uploaded, THEN THE Bot SHALL reject it with a localized error message
4. IF a non-eFayda PDF is uploaded, THEN THE Bot SHALL inform the user that only official eFayda documents are supported
5. WHEN a valid eFayda_PDF is uploaded, THE Bot SHALL acknowledge receipt and begin processing

### Requirement 2: Data Extraction from eFayda PDF

**User Story:** As a user, I want the system to automatically extract all my information from the PDF, so that I don't have to manually enter any data.

#### Acceptance Criteria

1. WHEN processing an eFayda_PDF, THE Parser SHALL extract the full name in both Ethiopic script and Latin script
2. WHEN processing an eFayda_PDF, THE Parser SHALL extract the date of birth in both Ethiopian and Gregorian calendar formats
3. WHEN processing an eFayda_PDF, THE Parser SHALL extract sex, nationality, phone number, and complete address (Region, City, Subcity)
4. WHEN processing an eFayda_PDF, THE Parser SHALL extract the FCN, FIN, and FAN identifiers
5. WHEN processing an eFayda_PDF, THE Parser SHALL extract the issue date and expiry date
6. WHEN processing an eFayda_PDF, THE Parser SHALL extract the embedded photo image
7. WHEN processing an eFayda_PDF, THE Parser SHALL extract the QR code image
8. WHEN processing an eFayda_PDF, THE Parser SHALL extract the barcode data
9. WHEN processing an eFayda_PDF, THE Parser SHALL extract the serial number
10. WHEN data extraction completes, THE Parser SHALL store the normalized data in MongoDB

### Requirement 3: ID Card Image Generation

**User Story:** As a user, I want to receive ID card images that look exactly like the official Ethiopian Digital ID Card, so that I can use them for printing.

#### Acceptance Criteria

1. WHEN generating ID cards, THE Generator SHALL create a Front_Card matching the official Ethiopian Digital ID Card layout
2. WHEN generating ID cards, THE Generator SHALL create a Back_Card matching the official Ethiopian Digital ID Card layout
3. THE Generator SHALL produce Normal_Image versions of both Front_Card and Back_Card
4. THE Generator SHALL produce Mirrored_Image versions of both Front_Card and Back_Card
5. THE Generator SHALL produce Color_Variant for all generated images
6. THE Generator SHALL produce Grayscale_Variant for all generated images
7. WHEN generating Front_Card, THE Generator SHALL include the Ethiopian flag, National ID logo, photo with proper masking, full name, DOB, sex, expiry date, and FAN with barcode
8. WHEN generating Back_Card, THE Generator SHALL include phone number, nationality, full address, FIN, QR code, and serial number
9. THE Generator SHALL render text in both Ethiopic and Latin scripts with proper typography
10. THE Generator SHALL output images at minimum 300 DPI resolution

### Requirement 4: A4 PDF Generation for Printing

**User Story:** As a user, I want to receive print-ready A4 PDF files with my ID cards, so that I can print them professionally.

#### Acceptance Criteria

1. WHEN generating print files, THE Generator SHALL create A4_PDF documents at 300 DPI
2. THE Generator SHALL create mirrored A4_PDF containing Front_Card and Back_Card for lamination purposes
3. THE Generator SHALL properly position ID cards on A4 pages for optimal printing
4. THE Generator SHALL embed all fonts required for Ethiopic and Latin text rendering

### Requirement 5: Output Delivery

**User Story:** As a user, I want to receive exactly 4 output files after successful processing, so that I have all variants needed for printing.

#### Acceptance Criteria

1. WHEN processing completes successfully, THE Bot SHALL deliver 2 mirrored PNG images (Front and Back combined)
2. WHEN processing completes successfully, THE Bot SHALL deliver 2 mirrored A4_PDF files (Color and Grayscale)
3. THE Bot SHALL deliver all files within 30 seconds of payment confirmation
4. WHEN delivering files, THE Bot SHALL send them as Telegram documents with descriptive filenames
5. AFTER successful delivery, THE Bot SHALL auto-delete temporary files from server storage

### Requirement 6: Payment Integration - Telebirr

**User Story:** As a user, I want to pay using Telebirr, so that I can use my preferred mobile money service.

#### Acceptance Criteria

1. WHEN a user selects Telebirr payment, THE Bot SHALL provide payment instructions with the merchant phone number
2. WHEN a user submits a Transaction_ID, THE Payment_Verifier SHALL verify it against the Telebirr receipt API
3. IF the Transaction_ID is valid and amount matches, THEN THE Payment_Verifier SHALL credit the user's Wallet
4. IF the Transaction_ID is invalid or already used, THEN THE Bot SHALL reject it with an error message
5. THE Payment_Verifier SHALL extract and validate the receiver name, amount, and transaction status from Telebirr receipts

### Requirement 7: Payment Integration - CBE Birr

**User Story:** As a user, I want to pay using CBE Birr, so that I can use my bank's mobile money service.

#### Acceptance Criteria

1. WHEN a user selects CBE Birr payment, THE Bot SHALL provide payment instructions with the merchant account details
2. WHEN a user submits a Transaction_ID, THE Payment_Verifier SHALL verify it against the CBE verification API
3. IF the Transaction_ID is valid and amount matches, THEN THE Payment_Verifier SHALL credit the user's Wallet
4. IF the Transaction_ID is invalid or already used, THEN THE Bot SHALL reject it with an error message
5. THE Payment_Verifier SHALL validate transaction details including amount, receiver, and status

### Requirement 8: Wallet System

**User Story:** As a user, I want to maintain a wallet balance, so that I can process multiple documents without paying each time.

#### Acceptance Criteria

1. THE Bot SHALL maintain a Wallet balance for each registered user
2. WHEN a user requests /balance, THE Bot SHALL display their current Wallet balance
3. WHEN a user requests /topup, THE Bot SHALL present exactly 8 top-up options: 100, 200, 300, 400, 500, 600, 800, and 1000 ETB
4. WHEN a job is processed successfully, THE Bot SHALL deduct the service fee from the user's Wallet
5. IF the user's Wallet balance is insufficient, THEN THE Bot SHALL prompt for top-up before processing
6. THE Bot SHALL persist Wallet balances in MongoDB with transaction history

### Requirement 9: Telegram Bot Commands and UX

**User Story:** As a user, I want clear and simple bot commands, so that I can easily navigate and use the service.

#### Acceptance Criteria

1. WHEN a user sends /start, THE Bot SHALL display a welcome message with available commands
2. WHEN a user sends /language, THE Bot SHALL present language selection options
3. WHEN a user sends /upload, THE Bot SHALL prompt for PDF document upload
4. WHEN a user sends /balance, THE Bot SHALL display current Wallet balance
5. WHEN a user sends /topup, THE Bot SHALL display top-up amount options and payment methods
6. WHEN a user sends /pricing, THE Bot SHALL display service pricing information
7. WHEN a user sends /settings, THE Bot SHALL display user settings menu
8. WHEN a user sends /help, THE Bot SHALL display help information and usage guide
9. THE Bot SHALL provide inline keyboard buttons for common actions to minimize typing
10. THE Bot SHALL show progress feedback during PDF processing

### Requirement 10: Multi-Language Support

**User Story:** As a user, I want to use the bot in my preferred language, so that I can understand all messages clearly.

#### Acceptance Criteria

1. THE Bot SHALL support Amharic (አማርኛ) language
2. THE Bot SHALL support Tigrigna (ትግርኛ) language
3. THE Bot SHALL support English language
4. WHEN a user selects a language, THE Bot SHALL persist the preference in MongoDB
5. THE Bot SHALL display all UI messages, buttons, and responses in the user's selected language
6. THE Bot SHALL default to English for new users until language is selected

### Requirement 11: Job Processing and Queue Management

**User Story:** As a system operator, I want reliable background processing, so that the system can handle multiple concurrent requests.

#### Acceptance Criteria

1. WHEN a paid job is submitted, THE Job_Queue SHALL process it asynchronously
2. THE Job_Queue SHALL handle multiple concurrent jobs without blocking
3. IF a job fails, THEN THE Job_Queue SHALL retry up to 3 times before marking as failed
4. WHEN a job fails permanently, THE Bot SHALL notify the user and refund their Wallet
5. THE Job_Queue SHALL complete each job within 30 seconds under normal load

### Requirement 12: Security and Data Protection

**User Story:** As a user, I want my personal data to be protected, so that my identity information remains secure.

#### Acceptance Criteria

1. THE Bot SHALL NOT permanently store ID card images unless user explicitly consents
2. THE Bot SHALL auto-delete all generated files within 1 hour of delivery
3. THE Bot SHALL encrypt all transaction logs stored in MongoDB
4. THE Bot SHALL implement rate limiting to prevent abuse (max 10 requests per minute per user)
5. THE Bot SHALL log all operations for audit purposes without storing sensitive personal data
6. THE Bot SHALL validate and sanitize all user inputs to prevent injection attacks

### Requirement 13: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and automatic recovery, so that I can resolve issues quickly.

#### Acceptance Criteria

1. IF PDF parsing fails, THEN THE Bot SHALL provide a specific error message indicating the issue
2. IF payment verification fails, THEN THE Bot SHALL allow retry with a different Transaction_ID
3. IF image generation fails, THEN THE Bot SHALL automatically retry and notify user of delay
4. IF the Bot encounters an unexpected error, THEN THE Bot SHALL log the error and display a generic error message
5. THE Bot SHALL provide contact information for support in error messages
