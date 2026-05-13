/** @format */

import express from "express";
import contestRoute from "./routes/contestRoute.js";
import healthRoute from "./routes/healthRoute.js";
import warmCacheRoute from "./routes/warmCacheRoute.js";

const app = express();
app.use(express.json());
app.use("/contest", contestRoute);
app.use("/", healthRoute);
app.use("/cache", warmCacheRoute);
// app.use("/contest" , );
export default app;

//line added to test commit
