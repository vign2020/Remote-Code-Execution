/** @format */

import CodeEditor from "@/components/CodeEditor";
import ProblemDesc from "@/components/ProblemDesc";
import VerdictBox from "@/components/VerdictBox";
import axios from "axios";

type Props = {
  params: {
    contestslug: string;
    problemslug: string;
  };
};

//to fetch the details of a the contest - problem
async function fetchData(contestslug: string, problemslug: string) {
  try {
    const res = await axios.get(
      `http://${process.env.NEXT_PUBLIC_SERVER_HOST}:${process.env.NEXT_PUBLIC_SERVER_PORT}/contest/${contestslug}/${problemslug}`,
    );
    return res.data;
  } catch (e) {
    console.error("Error fetching problem data:", e);
  }
}

export default async function ProblemPage({ params }: Props) {
  const { contestslug, problemslug } = await params;
  // console.log("CONTEST SLUG" + contestslug);
  const res = await fetchData(contestslug, problemslug);

  const contestData = res?.contestdata;

  const problem_title = contestData?.problem_title;
  const problem_desc = contestData?.problem_desc;
  const sample_input = contestData?.sample_input;
  const sample_output = contestData?.sample_output;
  const constraints = contestData?.array_size;

  console.log("Fetched problem data:", res);

  //poll to fetch verdict every 5 seconds

  // const [code, setCode] = useState("function solve() {\n  \n}");

  // const [showVerdict, setShowVerdict] = useState(false);

  // const [verdict, setVerdict] = useState("Accepted");

  // const [comments, setComments] = useState(
  //   "Your submission passed all test cases.",
  // );

  return (
    <div className="grid grid-cols-[45%_55%] gap-6 p-6 min-h-screen bg-background">
      <div>
        {/* <h1>{problem_title}</h1> */}
        <ProblemDesc
          title={problem_title}
          description={problem_desc}
          sampleInput={sample_input}
          sampleOutput={sample_output}
          constraints={constraints}
        />
      </div>
      <div className="space-y-6">
        <CodeEditor problemno={problemslug} contestno={contestslug} />

        {/* <VerdictBox visible={true} verdict={"Accepted"} comments={"nil"} /> */}
      </div>
    </div>
  );
}
