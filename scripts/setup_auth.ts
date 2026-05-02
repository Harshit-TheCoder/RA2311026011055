import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// URLs provided in the screenshots
const REGISTER_URL = 'http://20.207.122.201/evaluation-service/register';
const AUTH_URL = 'http://20.207.122.201/evaluation-service/auth';

/**
 * ==========================================
 * USER CONFIGURATION REQUIRED
 * ==========================================
 * Please fill in your actual details here before running this script.
 */
const USER_DETAILS = {
  email: "hh2044@srmist.edu.in",
  name: "Harshit Harlalka",
  mobileNo: "9903836974",
  githubUsername: "Harshit-TheCoder",
  rollNo: "RA2311026011055",
  accessCode: "QkbpxH" // Update this if your email provided a different code
};

const AUTH_FILE_PATH = path.resolve(process.cwd(), 'auth.json');

async function setup() {
  console.log("Starting Registration & Authentication process...");

  let clientID: string | undefined;
  let clientSecret: string | undefined;

  // 1. Try Registration
  try {
    console.log("Registering with Evaluation Service...");
    const regResponse = await axios.post(REGISTER_URL, USER_DETAILS);
    clientID = regResponse.data.clientID;
    clientSecret = regResponse.data.clientSecret;
    console.log("Registration successful! Credentials received.");
  } catch (error: any) {
    console.log("Registration failed or already registered. Attempting to use existing credentials...");
    if (fs.existsSync(AUTH_FILE_PATH)) {
      try {
        const existingAuth = JSON.parse(fs.readFileSync(AUTH_FILE_PATH, 'utf8'));
        clientID = existingAuth.clientID;
        clientSecret = existingAuth.clientSecret;
      } catch (e) {
        console.error("Failed to read existing auth.json");
      }
    }
    
    if (!clientID || !clientSecret) {
      console.error("Could not find clientID/clientSecret. Please ensure they are in auth.json.");
      return;
    }
  }

  // 2. Obtain Authorization Token
  try {
    console.log("Obtaining fresh Authorization Token...");
    const authPayload = {
      ...USER_DETAILS,
      clientID,
      clientSecret
    };

    const authResponse = await axios.post(AUTH_URL, authPayload);
    const tokenData = authResponse.data;

    // 3. Save to auth.json
    const saveData = {
      clientID,
      clientSecret,
      ...tokenData
    };

    fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(saveData, null, 2));
    console.log(`Success! Fresh token saved to ${AUTH_FILE_PATH}.`);
    console.log("You can now run your backend applications.");

  } catch (error: any) {
    console.error("Authentication failed. Error:", error?.response?.data || error.message);
  }
}

setup();
