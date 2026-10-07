import { useState } from "react";
import { Homepage } from "../jobseek-homepage/Homepage";
import { JobDetails } from "../job-details-reconstruction/JobDetails";
import { SearchResults } from "../search-results-reconstruction/SearchResults";
import "./JobagogoFlow.css";

type FlowStep = "home" | "results" | "details";

const steps: Array<{ id: FlowStep; label: string }> = [
  { id: "home", label: "Accueil" },
  { id: "results", label: "Résultats" },
  { id: "details", label: "Détails" },
];

export function JobagogoFlow() {
  const [step, setStep] = useState<FlowStep>("home");
  const [query, setQuery] = useState("Commercial");

  const showResults = (nextQuery: string) => {
    setQuery(nextQuery);
    setStep("results");
  };

  return (
    <main className="jobagogo-flow">
      <header className="jobagogo-flow-header">
        <div>
          <p className="jobagogo-flow-kicker">Prototype navigable</p>
          <h1>Jobagogo</h1>
        </div>
        <span className="jobagogo-flow-state">3 écrans liés</span>
      </header>

      <nav className="jobagogo-flow-steps" aria-label="Parcours Jobagogo">
        {steps.map((flowStep, index) => {
          const isActive = flowStep.id === step;
          const isAvailable =
            flowStep.id === "home" ||
            (flowStep.id === "results" && step !== "home") ||
            (flowStep.id === "details" && step === "details");

          return (
            <div className="jobagogo-flow-step-wrap" key={flowStep.id}>
              <button
                type="button"
                className={`jobagogo-flow-step ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "step" : undefined}
                disabled={!isAvailable}
                onClick={() => isAvailable && setStep(flowStep.id)}
              >
                <span>{index + 1}</span>
                {flowStep.label}
              </button>
              {index < steps.length - 1 ? <i aria-hidden="true">→</i> : null}
            </div>
          );
        })}
      </nav>

      <section className="jobagogo-flow-screen" aria-live="polite">
        {step === "home" ? (
          <Homepage onSearch={showResults} />
        ) : null}
        {step === "results" ? (
          <SearchResults
            key={query}
            initialQuery={query}
            onBack={() => setStep("home")}
            onSelectJob={() => setStep("details")}
          />
        ) : null}
        {step === "details" ? (
          <JobDetails onBack={() => setStep("results")} />
        ) : null}
      </section>
    </main>
  );
}

export default JobagogoFlow;