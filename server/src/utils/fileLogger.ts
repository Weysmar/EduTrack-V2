
import fs from 'fs';
import path from 'path';

export const logErrorToFile = (error: any) => {
    const logPath = path.join(process.cwd(), 'server_error.log');
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] ERROR:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}\n-------------------\n`;

    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
};
