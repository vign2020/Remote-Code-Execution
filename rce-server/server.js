import express from "express";
import bodyParser from "body-parser";
import { exec } from "child_process";
import fs from "fs";
import { v4 as uuid } from "uuid";

const app = express();
app.use(bodyParser.json());

app.post("/execute", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    const id = uuid();
    const workDir = `/tmp/${id}`;

    fs.mkdirSync(workDir, { recursive: true });
    fs.writeFileSync(`${workDir}/main.cpp`, code);

    const cmd = `
      docker run --rm \
      --memory="128m" \
      --cpus="0.5" \
      --pids-limit=64 \
      --network=none \
      -v ${workDir}:/code \
      gcc:latest \
      bash -c "g++ /code/main.cpp -o /code/a.out && /code/a.out"
    `;

    exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }

      if (err) {
        if (err.killed) {
          return res.status(408).json({
            error: "Execution timed out",
            stderr,
          });
        }

        return res.status(400).json({
          error: "Execution error",
          stderr,
          exitCode: err.code,
        });
      }

      res.json({
        stdout,
        stderr,
        exitCode: 0,
      });
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/health",(req, res)=>{
	try{
res.status(200).json({message : "all working fine !!"});
}
catch(e){
res.status(500).json({message : "Not reachable !!"});
	}	
})
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});
