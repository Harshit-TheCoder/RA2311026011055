import express, { Request, Response, NextFunction } from 'express';
import { Log } from 'logging_middleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  Log('backend', 'info', 'middleware', `Incoming request: ${req.method} ${req.url}`);
  next();
});

app.get('/', async (req: Request, res: Response) => {
  await Log('backend', 'info', 'route', 'Health check accessed on root URL');
  res.status(200).json({
    status: 'online',
    message: 'Welcome to the Afford Medicals Notification API',
    endpoints: {
      notify: 'POST /api/notify'
    }
  });
});

app.post('/api/notify', async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      await Log('backend', 'warn', 'handler', 'Missing userId or message in notification request');
      return res.status(400).json({ error: 'userId and message are required' });
    }

    await Log('backend', 'info', 'service', `Sending notification to user ${userId}`);

    await Log('backend', 'info', 'route', `Notification sent successfully to ${userId}`);
    res.status(200).json({ success: true, message: 'Notification sent' });

  } catch (error: any) {
    await Log('backend', 'error', 'handler', `Error sending notification: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, async () => {
  await Log('backend', 'info', 'config', `Notification backend server started on port ${PORT}`);
  console.log(`Server is running on port ${PORT}`);
});
