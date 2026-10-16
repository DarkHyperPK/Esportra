import { SETUP_STEPS } from "@/services/broadcast/broadcastSetup";
export function SetupSidebar({
  step,
  checks,
  attention,
  onSelect,
}: {
  step: number;
  checks: boolean[];
  attention: boolean[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="setup-sidebar">
      <p className="setup-task-label">Prepare your broadcast</p>
      <nav aria-label="Setup steps">
        {SETUP_STEPS.map((label, index) => {
          const state = attention[index]
            ? "Needs attention"
            : checks[index]
              ? "Completed"
              : index >= 4 && index <= 6
                ? "Optional"
                : index < step
                  ? "Needs attention"
                  : "Not completed";
          return (
            <button
              data-group={index < 4 ? "required" : index < 7 ? "optional" : "review"}
              key={label}
              className={step === index ? "is-current" : ""}
              onClick={() => onSelect(index)}
              aria-current={step === index ? "step" : undefined}
              aria-label={`${index + 1}. ${label} · ${state}`}
            >
              <span
                className={
                  checks[index] && !attention[index]
                    ? "setup-step-done"
                    : "setup-step-number"
                }
              >
                {checks[index] && !attention[index]
                  ? "✓"
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span>
                {label}
                <small>
                  {step === index
                    ? `Current step${attention[index] ? " · Needs attention" : ""}`
                    : state}
                </small>
              </span>
            </button>
          );
        })}
      </nav>
      <p className="setup-sidebar-note">
        Prepare on Esportra.
        <br />
        Run the show on Air desktop.
      </p>
    </div>
  );
}
