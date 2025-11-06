import fs from 'fs';
import path from 'path';

const logDirectory = path.resolve('log');
const logFilePath = path.join(logDirectory, 'pastebin.log');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

export function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}
`;
  fs.appendFileSync(logFilePath, logMessage);
}
