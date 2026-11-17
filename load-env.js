const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        const databaseLine = envFile.split(/\r?\n/).find((line) => /^\s*DATABASE_URL\s*=/.test(line));

        if (databaseLine) {
            process.env.DATABASE_URL = databaseLine
                .slice(databaseLine.indexOf('=') + 1)
                .trim()
                .replace(/^(['"])(.*)\1$/, '$2');
        }
    }
}

if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL no ambiente ou no arquivo .env.');
}
