import { useState } from "react";
import type { Briefing } from "../../shared/types.ts";
import { briefingToText } from "../lib/copyBriefing.ts";
import BriefingCard from "./BriefingCard.tsx";
import Stat from "./Stat.tsx";

interface BriefingViewProps {
  briefing: Briefing;
}

/** Renders a briefing as phase cards in flight order, summary pinned on top. */
export default function BriefingView({ briefing: b }: BriefingViewProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(briefingToText(b));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Pinned one-line summary + copy action */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-cockpit-amber/40 bg-cockpit-amber/10 px-4 py-3">
        <p className="text-sm text-cockpit-amber">{b.summaryLine}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-cockpit-amber/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cockpit-amber hover:bg-cockpit-amber/20"
        >
          {copied ? "Copied ✓" : "Copy briefing"}
        </button>
      </div>

      <BriefingCard title="Aircraft & Engine" badge="info" accent="cyan">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Type" value={b.aircraft.type} accent="cyan" />
          <Stat label="Airline" value={b.aircraft.airline} accent="cyan" />
        </div>
        <p className="mt-3 text-sm text-cockpit-green">{b.aircraft.engine}</p>
        {b.aircraft.engineNote && (
          <p className="mt-1 text-xs text-cockpit-muted">
            {b.aircraft.engineNote}
          </p>
        )}
      </BriefingCard>

      <BriefingCard title="Takeoff" badge="1" accent="amber">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="V1" value={b.takeoff.v1} big accent="green" />
          <Stat label="VR" value={b.takeoff.vr} big accent="green" />
          <Stat label="V2" value={b.takeoff.v2} big accent="green" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="N1" value={b.takeoff.n1Percent} accent="amber" />
          <Stat label="Flex °C" value={b.takeoff.flexTempC} accent="amber" />
          <Stat label="Flaps" value={b.takeoff.flapsConfig} accent="amber" />
        </div>
        <p className="mt-3 text-sm text-cockpit-cyan">{b.takeoff.thrustMode}</p>
        {b.takeoff.notes && (
          <p className="mt-1 text-xs text-cockpit-muted">{b.takeoff.notes}</p>
        )}
      </BriefingCard>

      <BriefingCard title="Climb" badge="2" accent="cyan">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Rotate pitch" value={b.climb.rotatePitch} />
          <Stat label="Initial speed" value={b.climb.initialClimbSpeed} />
          <Stat
            label="Thr reduction"
            value={`${b.climb.thrustReductionAltAGL} ft AGL`}
          />
          <Stat label="Climb N1" value={b.climb.climbThrustN1} accent="amber" />
        </div>
        <dl className="mt-3 space-y-1 text-xs text-cockpit-muted">
          <Detail label="Flap retract" value={b.climb.flapRetractSchedule} />
          <Detail label="Speed schedule" value={b.climb.speedSchedule} />
          <Detail label="Expected VS" value={b.climb.expectedVS} />
        </dl>
      </BriefingCard>

      <BriefingCard title="Cruise" badge="3" accent="green">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Flight level" value={b.cruise.recommendedFL} big />
          <Stat label="Mach" value={b.cruise.mach} big accent="cyan" />
          <Stat label="Cruise N1" value={b.cruise.cruiseN1} accent="amber" />
          <Stat label="Fuel flow" value={b.cruise.fuelFlowTotal} accent="amber" />
        </div>
        {b.cruise.note && (
          <p className="mt-3 text-xs text-cockpit-muted">{b.cruise.note}</p>
        )}
      </BriefingCard>

      <BriefingCard title="Descent" badge="4" accent="cyan">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Top of descent" value={b.descent.todDistanceNm} />
          <Stat label="Speed" value={b.descent.descentSpeed} />
          <Stat label="Target VS" value={b.descent.targetVS} />
        </div>
      </BriefingCard>

      <BriefingCard title="Approach & Landing" badge="5" accent="amber">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="VLS" value={b.approachLanding.vls} big accent="green" />
          <Stat label="VREF" value={b.approachLanding.vref} big accent="green" />
          <Stat label="VAPP" value={b.approachLanding.vapp} big accent="green" />
        </div>
        <dl className="mt-3 space-y-1 text-xs text-cockpit-muted">
          <Detail
            label="Landing weight"
            value={b.approachLanding.landingWeightEst}
          />
          <Detail label="Flaps" value={b.approachLanding.flapSchedule} />
          {b.approachLanding.approachSpeedLimits && (
            <Detail
              label="Speed limits"
              value={b.approachLanding.approachSpeedLimits}
            />
          )}
          <Detail label="Autobrake" value={b.approachLanding.autobrake} />
          {b.approachLanding.ilsInfo && (
            <Detail label="ILS" value={b.approachLanding.ilsInfo} />
          )}
          {b.approachLanding.runwayExit && (
            <Detail label="Runway exit" value={b.approachLanding.runwayExit} />
          )}
        </dl>
      </BriefingCard>

      <BriefingCard title="Go-Around" badge="6" accent="magenta">
        <p className="text-sm text-cockpit-green">{b.goAround}</p>
      </BriefingCard>

      <p className="pt-2 text-center text-[11px] text-cockpit-muted">
        {b.disclaimer}
      </p>
    </div>
  );
}

/** Label/value row used inside the detail lists. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 uppercase tracking-wider text-cockpit-muted/70">
        {label}:
      </dt>
      <dd className="text-cockpit-green/90">{value}</dd>
    </div>
  );
}
