import express from "express";
import contestRoute from "./routes/contestRoute.js";
import healthRoute from "./routes/healthRoute.js";

const app = express();
app.use(express.json());
app.use("/contest/execute", contestRoute);
app.use("/", healthRoute);
export default app;

//line added to test commit