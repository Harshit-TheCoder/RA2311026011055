import axios from 'axios';
import fs from 'fs';
import path from 'path';

export type LogStack = 'backend' | 'frontend';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type BackendPackage = 'cache' | 'controller' | 'cron_job' | 'db' | 'domain' | 'handler' | 'repository' | 'route' | 'service';
export type FrontendPackage = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';
export type SharedPackage = 'auth' | 'config' | 'middleware' | 'utils';

export type LogPackage = BackendPackage | FrontendPackage | SharedPackage;

const TEST_SERVER_URL = 'http://20.207.122.201/evaluation-service/logs';

function getAccessToken(): string | null {
  try {

    const cwdPath = path.resolve(process.cwd(), 'auth.json');

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

export async function Log(
  stack: LogStack,
  level: LogLevel,
  pkg: LogPackage,
  message: string
) {

  if (stack !== stack.toLowerCase() || level !== level.toLowerCase() || pkg !== pkg.toLowerCase()) {
    console.warn('Log Warning: stack, level, and package must be in lower case.');
  }

  const payload = {
    stack,
    level,
    package: pkg,
    message: message.length > 48 ? message.substring(0, 48) : message,
  };

  const token = getAccessToken();
  if (!token) {
    console.error('Log Error: No access_token found. Please run the setup_auth script first.');

    console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message}`);
    return;
  }

  try {
    const response = await axios.post(TEST_SERVER_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200 || response.status === 201) {

      console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message} (LogID: ${response.data.logID})`);
    } else {
      console.error(`Log API Error: Unexpected status code ${response.status}`, response.data);
    }
  } catch (error: any) {
    console.error(`Log API Error: Failed to send log to Test Server`, error?.response?.data || error.message);

    console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message}`);
  }
}
