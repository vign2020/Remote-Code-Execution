export interface I_Submission extends Document {
  submissionId: number;
  status: "pending" | "running" | "passed" | "failed";
  totalTestcases ?: number;
  passedTestcases ?: number;
  expectedOutput?: string;
  output?: string; 
  error?: string; //if failed then show one of the four errors (chceck excalidraw)
}
//for now find insert error (if any) -> total testcases and passed testcases -> expected output and actual output (if possible)