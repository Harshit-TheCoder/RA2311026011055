import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Define the exact literal types based on the requirements
export type LogStack = 'backend' | 'frontend';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Types of packages for backend and frontend
export type BackendPackage = 'cache' | 'controller' | 'cron_job' | 'db' | 'domain' | 'handler' | 'repository' | 'route' | 'service';
export type FrontendPackage = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';
export type SharedPackage = 'auth' | 'config' | 'middleware' | 'utils';

// Helper type to enforce correct package based on stack (at runtime we'll validate too)
export type LogPackage = BackendPackage | FrontendPackage | SharedPackage;

const TEST_SERVER_URL = 'http://20.207.122.201/evaluation-service/logs';

// Helper to get access token from auth.json
function getAccessToken(): string | null {
  try {
    // Check current working directory
    const cwdPath = path.resolve(process.cwd(), 'auth.json');
    // Check parent directory (for npm workspaces where cwd is inside a subfolder)
    const parentPath = path.resolve(process.cwd(), '../auth.json');
    
    const pathsToCheck = [cwdPath, parentPath];

    for (const authPath of pathsToCheck) {
      if (fs.existsSync(authPath)) {
        const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        if (data.access_token) {
          return data.access_token;
        }
      }
    }
  } catch (err) {
    console.error('Error reading auth.json', err);
  }
  return null;
}

/**
 * Reusable Log function
 * Makes an API call to the Test Server each time it is called.
 */
export async function Log(
  stack: LogStack,
  level: LogLevel,
  pkg: LogPackage,
  message: string
) {
  // 1. Validate inputs (lower case only per requirements)
  if (stack !== stack.toLowerCase() || level !== level.toLowerCase() || pkg !== pkg.toLowerCase()) {
    console.warn('Log Warning: stack, level, and package must be in lower case.');
  }

  // 2. Prepare payload (truncate message to 48 chars maximum)
  const payload = {
    stack,
    level,
    package: pkg,
    message: message.length > 48 ? message.substring(0, 48) : message,
  };

  // 3. Get Auth Token
  const token = getAccessToken();
  if (!token) {
    console.error('Log Error: No access_token found. Please run the setup_auth script first.');
    // Still output to console so the app doesn't go blind
    console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message}`);
    return;
  }

  // 4. Send API Request
  try {
    const response = await axios.post(TEST_SERVER_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200 || response.status === 201) {
      // Successfully logged to test server
      console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message} (LogID: ${response.data.logID})`);
    } else {
      console.error(`Log API Error: Unexpected status code ${response.status}`, response.data);
    }
  } catch (error: any) {
    console.error(`Log API Error: Failed to send log to Test Server`, error?.response?.data || error.message);
    // Fallback to local console log
    console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message}`);
  }
}
