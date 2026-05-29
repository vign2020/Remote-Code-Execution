/** @format */
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionResult } from "./CodeEditor";

interface VerdictBoxProps {
  visible: boolean;
  submissionResult: SubmissionResult | null;
}

export default function VerdictBox({
  visible,
  submissionResult,
}: VerdictBoxProps) {
  if (!visible) return null;

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Verdict: {submissionResult?.status}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          {submissionResult?.error || submissionResult?.output}
        </p>
      </CardContent>
    </Card>
  );
}
