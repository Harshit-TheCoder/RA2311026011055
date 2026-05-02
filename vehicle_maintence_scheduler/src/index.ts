import cron from "node-cron";
import { Log } from "logging_middleware";

async function checkMaintenance() {
  await Log(
    "backend",
    "info",
    "cron_job",
    "Starting routine vehicle maintenance check...",
  );

  try {
    const randomError = Math.random() < 0.2;

    if (randomError) {
      throw new Error(
        "Database connection timeout while fetching vehicle status",
      );
    }

    const needsMaintenance = Math.random() < 0.5;

    if (needsMaintenance) {
      await Log(
        "backend",
        "warn",
        "service",
        "Vehicle ID: V-1234 requires immediate maintenance.",
      );
    } else {
      await Log(
        "backend",
        "info",
        "service",
        "All vehicles are currently in good condition.",
      );
    }

    await Log(
      "backend",
      "info",
      "cron_job",
      "Vehicle maintenance check completed successfully.",
    );
  } catch (error: any) {
    await Log(
      "backend",
      "error",
      "db",
      `Critical error during maintenance check: ${error.message}`,
    );
  }
}

cron.schedule("* * * * *", () => {
  checkMaintenance();
});

Log(
  "backend",
  "info",
  "config",
  "Vehicle Maintenance Scheduler initialized and cron job scheduled.",
).then(() => console.log("Scheduler started. Running every minute."));
