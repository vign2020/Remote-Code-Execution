/** @format */

export interface I_Submission extends Document {
  submissionId: number;
  status: "pending" | "running" | "passed" | "failed";
  totalTestcases?: number;
  passedTestcases?: number;
  expectedOutput?: string;
  output?: string;
  error?: string; //if failed then show one of the four errors (chceck excalidraw)
}

export interface I_ContestData {
  contest_name: string;
  contest_id: string;
  problem_name: string;
  problem_id: string;
  problem_title: string;
  problem_desc: string;
  sample_input: string;
  sample_output: string;
  array_size: string;
}
//for now find insert error (if any) -> total testcases and passed testcases -> expected output and actual output (if possible)
