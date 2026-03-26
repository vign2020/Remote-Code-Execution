import app from "./app.js";
import config from "./config/config.js";

import connectDB from "./db.js";
// import { createClient } from "redis";

// export const redis = createClient();

// await redis.connect();

const  startServer = (async () => {

await connectDB();
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
})
})();
