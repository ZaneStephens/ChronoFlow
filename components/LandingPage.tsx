import React from "react";
import { ArrowRight, Clock3, CalendarDays, ShieldCheck } from "lucide-react";
interface LandingPageProps {
  onStart: () => void;
  onSkip: () => void;
}
export default function LandingPage({ onStart, onSkip }: LandingPageProps) {
  return (
    <div className="welcome-page">
      <p className="eyebrow">WELCOME TO YOUR WORKSPACE</p>
      <h1>
        Make time
        <br />
        for <em>good work.</em>
      </h1>
      <p className="welcome-description">
        A calmer home for your tasks, your time and the things you want to move
        forward.
      </p>
      <div className="welcome-actions">
        <button className="button primary" onClick={onSkip}>
          Open my workspace <ArrowRight size={18} />
        </button>
        <button className="text-button" onClick={onStart}>
          Take a quick tour
        </button>
      </div>
      <div className="welcome-features">
        <div>
          <CalendarDays size={22} />
          <h3>A day with direction</h3>
          <p>Plan your work and see what’s next.</p>
        </div>
        <div>
          <Clock3 size={22} />
          <h3>Every minute accounted for</h3>
          <p>Track, log and export your time.</p>
        </div>
        <div>
          <ShieldCheck size={22} />
          <h3>A space that’s yours</h3>
          <p>
            Your data stays in your browser. Bring an existing backup using
            Import.
          </p>
        </div>
      </div>
      <span className="welcome-signoff">LESS FRICTION. MORE FOCUS.</span>
    </div>
  );
}
