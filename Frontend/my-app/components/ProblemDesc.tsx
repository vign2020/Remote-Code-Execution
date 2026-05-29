/** @format */
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProblemDetailsProps {
  title: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  constraints: string;
}

export default function ProblemDetails({
  title,
  description,
  sampleInput,
  sampleOutput,
  constraints,
}: ProblemDetailsProps) {
  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Sample Input</h3>
          <pre className="bg-muted p-4 rounded-xl text-sm overflow-auto">
            {sampleInput}
          </pre>
        </div>

        <div>
          <h3 className="font-medium mb-2">Sample Output</h3>
          <pre className="bg-muted p-4 rounded-xl text-sm overflow-auto">
            {sampleOutput}
          </pre>
        </div>

        <div>
          <h3 className="font-medium mb-2">Constraints</h3>
          <p className="text-sm text-muted-foreground">{constraints}</p>
        </div>
      </CardContent>
    </Card>
  );
}
