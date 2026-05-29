/** @format */

import express from "express";
import contestRoute from "./routes/contestRoute.js";
import healthRoute from "./routes/healthRoute.js";
import warmCacheRoute from "./routes/warmCacheRoute.js";
import getresultRoute from "./routes/getresultRoute.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

app.use(express.json());
app.use("/contest", contestRoute);
app.use("/", healthRoute);
app.use("/cache", warmCacheRoute);
app.use("/getresult", getresultRoute);

// app.use("/contest" , );
export default app;

//line added to test commit
