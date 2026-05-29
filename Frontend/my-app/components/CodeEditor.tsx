/** @format */

"use client";

import Editor from "@monaco-editor/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axios from "axios";
import VerdictBox from "./VerdictBox";

interface CodeEditorProps {
  code: string;
  setCode: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
}
export interface SubmissionResult {
  _id: string;
  submissionId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  output?: string;
}

async function executeCode(
  problem_no: number,
  contest_no: number,
  language: string,
  code: string,
  setshowVerdictBox: (value: boolean) => void,
): Promise<number | null> {
  if (contest_no === -1 || problem_no === -1) {
    console.error("Invalid contest or problem number");
    return null;
  }

  try {
    setshowVerdictBox(true);
    console.log(
      `http://${process.env.NEXT_PUBLIC_SERVER_HOST}:${process.env.NEXT_PUBLIC_SERVER_PORT}/contest/execute`,
    );
    const result = await axios.post(
      `http://${process.env.NEXT_PUBLIC_SERVER_HOST}:${process.env.NEXT_PUBLIC_SERVER_PORT}/contest/execute`,
      {
        language: language,
        code: code,
        problemId: problem_no,
        contestNo: contest_no,
      },
    );
    console.log("RESULT DATA IS .. " + result.data);
    return result.data.submissionId;
  } catch (e) {
    setshowVerdictBox(false);
    console.error("Oops! Error occure");
    return null;
  }
}

async function fetchVerdict(submissionId: number | null) {
  // Implement polling logic to fetch verdict every 5 seconds
  try {
    const result = await axios.get(
      `http://${process.env.NEXT_PUBLIC_SERVER_HOST}:${process.env.NEXT_PUBLIC_SERVER_PORT}/getresult/${submissionId}`,
    );
    console.log("VERDICT DATA IS .. " + result.data);
    return result.data.result;
  } catch (e) {
    console.error("Error fetching verdict:", e);
    return null;
  }
}

function onRun() {
  console.log("Run code clicked");
}
export default function CodeEditor({
  problemno,
  contestno,
}: {
  problemno: string;
  contestno: string;
}) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [showVerdictBox, setshowVerdictBox] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);

  const [cnt, setCnt] = useState(0);

  const contest_no_match = contestno.match(/^contest-(\d+)$/);
  const problem_no_match = problemno.match(/^problem-(\d+)$/);

  const contest_no = contest_no_match ? parseInt(contest_no_match[1]) : -1;
  const problem_no = problem_no_match ? parseInt(problem_no_match[1]) : -1;

  useEffect(() => {
    if (submissionId) {
      const interval = setInterval(async () => {
        setCnt((prev) => prev + 1);
        // console.log("Running for the turn " + cnt);

        const result = await fetchVerdict(submissionId);
        setSubmissionResult(result);
        if (result?.status !== "pending") {
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [submissionId]);

  return (
    <Card className="rounded-2xl shadow-sm border h-full">
      <CardContent className="p-4 space-y-4">
        <Editor
          height="500px"
          defaultLanguage="cpp"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
        />

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onRun}>
            Run Code
          </Button>

          <Button
            onClick={async () => {
              const id = await executeCode(
                problem_no,
                contest_no,
                language,
                code,
                setshowVerdictBox,
              );
              setSubmissionId(id);
            }}
          >
            Submit Code
          </Button>
        </div>
      </CardContent>

      <VerdictBox
        visible={showVerdictBox}
        submissionResult={submissionResult}
      />
    </Card>
  );
}
