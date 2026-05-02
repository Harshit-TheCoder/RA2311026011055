import axios from "axios";
import fs from "fs";
import path from "path";
import { Log } from "logging_middleware";

const DEPOTS_API = "http://20.207.122.201/evaluation-service/depots";
const VEHICLES_API = "http://20.207.122.201/evaluation-service/vehicles";

interface Depot {
  ID: number;
  MechanicHours: number;
}

interface Vehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

function getAccessToken(): string | null {
  try {
    const cwdPath = path.resolve(process.cwd(), "auth.json");
    const parentPath = path.resolve(process.cwd(), "../auth.json");
    const rootPath = path.resolve(__dirname, "../../auth.json");

    const pathsToCheck = [cwdPath, parentPath, rootPath];

    for (const authPath of pathsToCheck) {
      if (fs.existsSync(authPath)) {
        const data = JSON.parse(fs.readFileSync(authPath, "utf8"));
        if (data.access_token) return data.access_token;
      }
    }
  } catch (err) {}
  return null;
}

function optimizeScheduling(capacity: number, vehicles: Vehicle[]) {
  const n = vehicles.length;

  const dp = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    const v = vehicles[i - 1];
    for (let w = 0; w <= capacity; w++) {
      if (v.Duration <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - v.Duration] + v.Impact);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  let res = dp[n][capacity];
  let w = capacity;
  const selectedTasks: string[] = [];

  for (let i = n; i > 0 && res > 0; i--) {
    if (res !== dp[i - 1][w]) {
      const v = vehicles[i - 1];
      selectedTasks.push(v.TaskID);
      res -= v.Impact;
      w -= v.Duration;
    }
  }

  return {
    maxImpact: dp[n][capacity],
    scheduledCount: selectedTasks.length,
    selectedTasks,
  };
}

async function runVehicleScheduling() {
  await Log(
    "backend",
    "info",
    "service",
    "Starting Vehicle Scheduling Optimization",
  );

  const token = getAccessToken();
  if (!token) {
    await Log("backend", "error", "auth", "Failed to retrieve auth token.");
    return;
  }

  try {
    await Log("backend", "info", "service", "Fetching depots data from API...");
    const depotsRes = await axios.get(DEPOTS_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const depots: Depot[] = depotsRes.data.depots;

    await Log(
      "backend",
      "info",
      "service",
      "Fetching vehicles data from API...",
    );
    const vehiclesRes = await axios.get(VEHICLES_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const vehicles: Vehicle[] = vehiclesRes.data.vehicles;

    await Log(
      "backend",
      "info",
      "service",
      `Found ${depots.length} depots and ${vehicles.length} tasks.`,
    );

    let totalMaxImpact = 0;

    for (const depot of depots) {
      const result = optimizeScheduling(depot.MechanicHours, vehicles);
      totalMaxImpact += result.maxImpact;

      await Log(
        "backend",
        "info",
        "handler",
        `Depot ${depot.ID}: Max Impact ${result.maxImpact}, ${result.scheduledCount} tasks`,
      );
    }

    await Log(
      "backend",
      "info",
      "service",
      `Scheduling complete. Total Impact: ${totalMaxImpact}`,
    );
  } catch (error: any) {
    const errMsg = error.message || "Unknown API Error";
    await Log("backend", "error", "service", `Optimization failed: ${errMsg}`);
  }
}

runVehicleScheduling();
