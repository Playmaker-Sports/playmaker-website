const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = process.cwd();
const port = Number(process.env.PORT || 4173);
const nodeBin = process.execPath;
const serveScript = path.join(rootDir, "scripts", "serve-dist.js");
const qaScript = path.join(rootDir, "scripts", "run-visual-qa.js");

function waitForServer(serverProcess) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for the dist server to start."));
    }, 10000);

    serverProcess.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes("Serving dist at")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk.toString());
    });

    serverProcess.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Dist server exited early with code ${code}.`));
    });
  });
}

function runQa() {
  return new Promise((resolve, reject) => {
    const qaProcess = spawn(nodeBin, [qaScript], {
      cwd: rootDir,
      env: {
        ...process.env,
        PLAYMAKER_QA_BASE_URL: `http://localhost:${port}`
      },
      stdio: "inherit"
    });

    qaProcess.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Visual QA failed with code ${code}.`));
    });
  });
}

async function main() {
  const serverProcess = spawn(nodeBin, [serveScript, String(port)], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(serverProcess);
    await runQa();
  } finally {
    serverProcess.kill();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
