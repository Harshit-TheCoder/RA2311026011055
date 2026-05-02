import cron from 'node-cron';
import { Log } from 'logging_middleware';

// Function to simulate checking vehicle maintenance
async function checkMaintenance() {
  await Log('backend', 'info', 'cron_job', 'Starting routine vehicle maintenance check...');

  try {
    // Simulate DB query or API call
    const randomError = Math.random() < 0.2; // 20% chance of failure to demonstrate error logging
    
    if (randomError) {
      throw new Error('Database connection timeout while fetching vehicle status');
    }

    const needsMaintenance = Math.random() < 0.5; // 50% chance a vehicle needs maintenance
    
    if (needsMaintenance) {
      await Log('backend', 'warn', 'service', 'Vehicle ID: V-1234 requires immediate maintenance.');
    } else {
      await Log('backend', 'info', 'service', 'All vehicles are currently in good condition.');
    }
    
    await Log('backend', 'info', 'cron_job', 'Vehicle maintenance check completed successfully.');
  } catch (error: any) {
    await Log('backend', 'error', 'db', `Critical error during maintenance check: ${error.message}`);
  }
}

// Schedule tasks to be run on the server.
// Runs every 1 minute for demonstration purposes
cron.schedule('* * * * *', () => {
  checkMaintenance();
});

// Log that the scheduler has started
Log('backend', 'info', 'config', 'Vehicle Maintenance Scheduler initialized and cron job scheduled.')
  .then(() => console.log('Scheduler started. Running every minute.'));
