import express, { Request, Response } from 'express';
import axios from 'axios';
import { pendingSessions } from '../../bot/handlers/idHandler';
import logger from '../../utils/logger';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';

export function setupCaptchaRoutes(app: express.Application, bot: any): void {
  // Serve the reCAPTCHA verification page
  app.get('/verify-captcha', (req: Request, res: Response) => {
    const sessionId = req.query.session as string;
    
    if (!sessionId || !pendingSessions.has(sessionId)) {
      res.status(400).send('Invalid or expired session');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify reCAPTCHA - eFayda ID</title>
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .message {
            color: #666;
            margin-bottom: 2rem;
        }
        .success {
            color: #28a745;
            font-weight: bold;
        }
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        #recaptcha-container {
            display: flex;
            justify-content: center;
            margin: 2rem 0;
        }
        .loading {
            display: none;
            margin-top: 1rem;
        }
        .loading.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🇪🇹</div>
        <h1>eFayda ID Verification</h1>
        <p class="message">Please complete the reCAPTCHA verification below:</p>
        
        <div id="recaptcha-container">
            <div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}" data-callback="onCaptchaSuccess"></div>
        </div>
        
        <div class="loading" id="loading">
            <p>⏳ Verifying...</p>
        </div>
        
        <div id="result"></div>
    </div>

    <script>
        function onCaptchaSuccess(token) {
            document.getElementById('loading').classList.add('show');
            document.getElementById('recaptcha-container').style.display = 'none';
            
            fetch('/verify-captcha-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    sessionId: '${sessionId}'
                })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('loading').classList.remove('show');
                const resultDiv = document.getElementById('result');
                
                if (data.success) {
                    resultDiv.innerHTML = '<p class="success">✅ Verification successful!</p><p>You can now return to Telegram and enter your OTP code.</p>';
                } else {
                    resultDiv.innerHTML = '<p class="error">❌ Verification failed. Please try again.</p>';
                    setTimeout(() => location.reload(), 2000);
                }
            })
            .catch(error => {
                document.getElementById('loading').classList.remove('show');
                document.getElementById('result').innerHTML = '<p class="error">❌ An error occurred. Please try again.</p>';
                setTimeout(() => location.reload(), 2000);
            });
        }
    </script>
</body>
</html>
    `;

    res.send(html);
  });

  // Handle reCAPTCHA token verification
  app.post('/verify-captcha-token', async (req: Request, res: Response) => {
    const { token, sessionId } = req.body;

    if (!token || !sessionId) {
      res.status(400).json({ success: false, error: 'Missing token or session ID' });
      return;
    }

    const session = pendingSessions.get(sessionId);
    if (!session) {
      res.status(400).json({ success: false, error: 'Invalid or expired session' });
      return;
    }

    try {
      // Verify reCAPTCHA token with Google
      const verifyResponse = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: RECAPTCHA_SECRET_KEY,
            response: token
          }
        }
      );

      if (verifyResponse.data.success) {
        // Store the captcha token in the session
        session.captchaToken = token;
        session.timestamp = Date.now(); // Refresh timestamp
        
        logger.info(`reCAPTCHA verified for session ${sessionId}`);

        // Notify user in Telegram
        try {
          await bot.telegram.sendMessage(
            session.chatId,
            '✅ reCAPTCHA verified successfully!\n\n📱 Please enter your OTP code now.'
          );
        } catch (notifyError) {
          logger.error('Failed to notify user:', notifyError);
        }

        res.json({ success: true });
      } else {
        logger.warn(`reCAPTCHA verification failed for session ${sessionId}`);
        res.json({ success: false, error: 'reCAPTCHA verification failed' });
      }
    } catch (error) {
      logger.error('reCAPTCHA verification error:', error);
      res.status(500).json({ success: false, error: 'Verification error' });
    }
  });
}
