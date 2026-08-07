const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\acer\\.gemini\\antigravity-ide\\brain\\0753cf18-c79f-4c6a-a840-2ce5ff5eecb5\\.system_generated\\tasks\\task-332.log';

try {
  if (fs.existsSync(logPath)) {
    const data = fs.readFileSync(logPath, 'utf8');
    console.log("Log content:\n", data);
  } else {
    console.log("Log file does not exist at:", logPath);
  }
} catch (err) {
  console.error("Read failed:", err);
} finally {
  process.exit(0);
}
