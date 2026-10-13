import { MessageCircleQuestion } from "lucide-react";
import AIChat from "../components/AIChat";
import { sendAssistantQuestion } from "../services/api";

const exampleQuestions = [
  "Which farmers have pending payments?",
  "Who supplied the most sugarcane?",
  "What is the total pending payment?",
  "Show farmers from Kopargaon.",
  "Which farmers have supplied more than 100 tonnes?",
  "Summarize the farmer payment records.",
];

function AssistantPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <p className="eyebrow muted">AI assistant</p>
          <h2>Farmer insights</h2>
        </div>
      </header>

      <div className="assistant-overview">
        <MessageCircleQuestion size={18} />
        <span>Natural-language questions are answered using live MCP and OpenAI insights.</span>
      </div>

      <AIChat onSendQuestion={sendAssistantQuestion} examples={exampleQuestions} />
    </div>
  );
}

export default AssistantPage;
