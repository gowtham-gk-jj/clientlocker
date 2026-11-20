
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PYTHON_PROJECT_DIR = process.env.PYTHON_PROJECT_DIR;
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";

const DEFAULT_TIMEOUT = Number(
  process.env.PYTHON_BRIDGE_TIMEOUT || 30000
);

const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_SIZE = 1024 * 1024;
const MAX_STDERR_SIZE = 20000;

class PythonBridgeError extends Error {
  constructor(message, code = "PYTHON_BRIDGE_ERROR") {
    super(message);
    this.name = "PythonBridgeError";
    this.code = code;
  }
}

function runPython(operation, payload = {}, options = {}) {
  return new Promise((resolve, reject) => {
    if (!PYTHON_PROJECT_DIR) {
      return reject(
        new PythonBridgeError(
          "Python project directory is not configured.",
          "PYTHON_CONFIG_ERROR"
        )
      );
    }

    if (
      typeof operation !== "string" ||
      !operation.trim()
    ) {
      return reject(
        new PythonBridgeError("Invalid Python operation.")
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return reject(
        new PythonBridgeError("Python payload must be an object.")
      );
    }

    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    if (
      !Number.isInteger(timeout) ||
      timeout < 1000 ||
      timeout > 120000
    ) {
      return reject(
        new PythonBridgeError("Invalid process timeout.")
      );
    }

    const projectDir = path.resolve(PYTHON_PROJECT_DIR);
    const scriptPath = path.join(projectDir, "bridge.py");

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new PythonBridgeError(
          `Python bridge file not found: ${scriptPath}`,
          "PYTHON_SCRIPT_NOT_FOUND"
        )
      );
    }

    let request;

    try {
      request = JSON.stringify({
        ...payload,
        operation
      });
    } catch {
      return reject(
        new PythonBridgeError(
          "Unable to serialize Python request.",
          "PYTHON_REQUEST_ERROR"
        )
      );
    }

    if (Buffer.byteLength(request, "utf8") > MAX_INPUT_SIZE) {
      return reject(
        new PythonBridgeError(
          "Python request exceeds the maximum allowed size.",
          "PYTHON_INPUT_LIMIT"
        )
      );
    }

    let child;

    try {
      child = spawn(
        PYTHON_EXECUTABLE,
        [scriptPath],
        {
          cwd: projectDir,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"]
        }
      );
    } catch (error) {
      return reject(
        new PythonBridgeError(
          `Unable to create Python process: ${error.message}`,
          "PYTHON_SPAWN_ERROR"
        )
      );
    }

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      child.kill();

      finish(
        new PythonBridgeError(
          "Python process timed out.",
          "PYTHON_TIMEOUT"
        )
      );
    }, timeout);

    child.on("error", (error) => {
      finish(
        new PythonBridgeError(
          `Unable to start Python: ${error.message}`,
          "PYTHON_SPAWN_ERROR"
        )
      );
    });

    child.stdout.on("data", (chunk) => {
      if (settled) return;

      stdoutBytes += chunk.length;

      if (stdoutBytes > MAX_OUTPUT_SIZE) {
        child.kill();

        finish(
          new PythonBridgeError(
            "Python output exceeded the maximum allowed size.",
            "PYTHON_OUTPUT_LIMIT"
          )
        );

        return;
      }

      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_STDERR_SIZE) {
        stderr += chunk.toString("utf8").slice(
          0,
          MAX_STDERR_SIZE - stderr.length
        );
      }
    });

    child.stdin.on("error", (error) => {
      if (settled) return;

      finish(
        new PythonBridgeError(
          `Python stdin error: ${error.message}`,
          "PYTHON_STDIN_ERROR"
        )
      );
    });

    child.on("close", (code) => {
      if (settled) return;

      if (code !== 0) {
        console.error("Python process error:", stderr);

        finish(
          new PythonBridgeError(
            `Python process exited with code ${code}.`,
            "PYTHON_PROCESS_ERROR"
          )
        );

        return;
      }

      let result;

      try {
        result = JSON.parse(stdout.trim());
      } catch {
        console.error("Invalid Python JSON response:", stderr);

        finish(
          new PythonBridgeError(
            "Python returned invalid JSON.",
            "PYTHON_INVALID_JSON"
          )
        );

        return;
      }

      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
      ) {
        finish(
          new PythonBridgeError(
            "Invalid Python response structure.",
            "PYTHON_RESPONSE_ERROR"
          )
        );

        return;
      }

      finish(null, result);
    });

    child.stdin.end(request);
  });
}

module.exports = {
  runPython,
  PythonBridgeError
};
