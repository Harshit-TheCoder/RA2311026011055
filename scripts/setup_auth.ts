import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
  email: "YOUR_EMAIL@abc.edu",
  name: "YOUR NAME",
  mobileNo: "9999999999",
  githubUsername: "YOUR_GITHUB_USERNAME",
  rollNo: "YOUR_ROLL_NO",
  accessCode: "xgAsNC" // Update this if your email provided a different code
};

const AUTH_FILE_PATH = path.resolve(process.cwd(), 'auth.json');

async function setup() {
  console.log("Starting Registration & Authentication process...");

  let clientID: string;
  let clientSecret: string;

  // 1. Try Registration
  try {
    console.log("Registering with Evaluation Service...");
    const regResponse = await axios.post(REGISTER_URL, USER_DETAILS);
    clientID = regResponse.data.clientID;
    clientSecret = regResponse.data.clientSecret;
    console.log("Registration successful! Credentials received.");
  } catch (error: any) {
    // If we fail registration, it might be because we're already registered.
    // However, the prompt says "You can register only once. Do not forget to save your clientID and clientSecret"
    console.error("Registration failed. Error:", error?.response?.data || error.message);
    console.log("If you have already registered, please manually create an 'auth.json' file with your clientID and clientSecret and re-run this to get an access_token.");
    return;
  }

  // 2. Obtain Authorization Token
  try {
    console.log("Obtaining Authorization Token...");
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
    console.log(`Success! Token saved to ${AUTH_FILE_PATH}.`);
    console.log("You can now run your backend applications, and the logging middleware will work.");

  } catch (error: any) {
    console.error("Authentication failed. Error:", error?.response?.data || error.message);
  }
}

setup();
