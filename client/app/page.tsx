/** @format */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { H1, Paragraph, Label } from "@/components/ui/typography";

const submissionSchema = z.object({
  sourceCode: z.string().min(1, "Please enter your solution code."),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

const sampleInput = `4\n2 3 5 7`;
const sampleOutput = `17`;
const starterCode = `function solve(input) {\n  const lines = input.trim().split('\n');\n  const numbers = lines[1].split(' ').map(Number);\n  const result = numbers.reduce((sum, value) => sum + value, 0);\n  return result;\n}`;

export default function HomePage() {
  const [result, setResult] = useState("Ready to run your solution.");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { sourceCode: starterCode },
  });

  const sourceCode = watch("sourceCode");

  const onRun = handleSubmit(() => {
    setResult("Execution success: sample input passed.");
  });

  const onSubmit = handleSubmit(() => {
    setResult("Submission received. Your code is queued for evaluation.");
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10">
        <section className="space-y-3 text-center">
          <H1>Problem: Sum of Numbers</H1>
          <Paragraph>
            Build a solution that reads a list of integers from input and
            returns the sum. Use the editor on the right to write your
            JavaScript solution, then run or submit it.
          </Paragraph>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problem Description</CardTitle>
                <CardDescription>
                  Detailed prompt and approach guidelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Paragraph>
                  You are given an integer count followed by a line of
                  space-separated numbers. Compute the total sum of the numbers
                  and return it as the output.
                </Paragraph>
                <Paragraph>
                  The left panel contains sample inputs and outputs, while the
                  right panel includes the code editor with Run and Submit
                  controls.
                </Paragraph>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Input / Output</CardTitle>
                <CardDescription>
                  Test the editor with these examples.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 font-mono text-sm leading-relaxed text-slate-100 shadow-soft">
                  <Label>Input</Label>
                  <pre className="whitespace-pre-wrap">{sampleInput}</pre>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 font-mono text-sm leading-relaxed text-slate-100 shadow-soft">
                  <Label>Output</Label>
                  <pre className="whitespace-pre-wrap">{sampleOutput}</pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="flex min-h-[620px] flex-col">
            <CardHeader>
              <CardTitle>Code Editor</CardTitle>
              <CardDescription>
                Write and test your solution using the editor below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex grow flex-col gap-4">
              <div className="space-y-3">
                <Label htmlFor="code-editor">Your source code</Label>
                <CodeEditor
                  id="code-editor"
                  value={sourceCode}
                  onChange={(value) => setValue("sourceCode", value)}
                />
                {errors.sourceCode && (
                  <p className="text-sm text-rose-400">
                    {errors.sourceCode.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="secondary" onClick={onRun}>
                  Run
                </Button>
                <Button onClick={onSubmit}>Submit</Button>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                  JavaScript
                </span>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-slate-200 shadow-soft">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  Output Preview
                </p>
                <p className="mt-3 text-base leading-7">{result}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
