const { ensureDatabase } = require("../src/server/db");

ensureDatabase({ forceSeed: true });
console.log("SQLite database is ready.");
