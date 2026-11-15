import type { Plan } from "../../types";
import { ecoSummary } from "./eco";
import "./PlanView.css";

export function PlanView({ plan }: { plan: Plan }) {
  const eco = ecoSummary(plan);

  return (
    <div className="chat-reply">
      <p>
        {plan.date}, {plan.startTime} to {plan.endTime} (about {plan.totalMinutes} min, understood by {plan.parsedBy})
      </p>
      <ol>
        {plan.stops.map((s) => (
          <li key={s.place.id}>
            {s.arrive} {s.place.name} <small>({s.legFromPrevious.via})</small>
            {s.event && <small> - {s.event.title}</small>}
            {s.notes.map((n) => (
              <small key={n}> {n}</small>
            ))}
          </li>
        ))}
      </ol>
      {plan.returnLeg && (
        <p>
          Ride home: {plan.returnLeg.via} (about {plan.returnLeg.minutes} min)
        </p>
      )}
      {plan.warnings.map((w) => (
        <p key={w}>{w}</p>
      ))}
      {eco && (
        <p className="eco-badge" title="Rough estimate: car 170 g/km, city transit 60 g/km, walking 0">
          {eco.savedGrams > 0
            ? `About ${eco.savedGrams} g CO₂ saved vs driving this route`
            : "About the same CO₂ as driving this route"}
        </p>
      )}
    </div>
  );
}
