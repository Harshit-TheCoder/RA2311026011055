import express, { Request, Response, NextFunction } from 'express';
import { Log } from 'logging_middleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Express Middleware to log incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  Log('backend', 'info', 'middleware', `Incoming request: ${req.method} ${req.url}`);
  next();
});

// Sample Route to send a notification
app.post('/api/notify', async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      await Log('backend', 'warn', 'handler', 'Missing userId or message in notification request');
      return res.status(400).json({ error: 'userId and message are required' });
    }

    // Simulate sending notification (Service layer)
    await Log('backend', 'info', 'service', `Sending notification to user ${userId}`);

    // Success response
    await Log('backend', 'info', 'route', `Notification sent successfully to ${userId}`);
    res.status(200).json({ success: true, message: 'Notification sent' });

  } catch (error: any) {
    await Log('backend', 'error', 'handler', `Error sending notification: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, async () => {
  await Log('backend', 'info', 'config', `Notification backend server started on port ${PORT}`);
  console.log(`Server is running on port ${PORT}`);
});
