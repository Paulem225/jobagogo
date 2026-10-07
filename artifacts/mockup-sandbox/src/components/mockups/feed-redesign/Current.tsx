import "./_group.css";

import { useState } from "react";
import {
  Bookmark,
  CalendarDays,
  MapPin,
  RefreshCw,
  Wifi,
} from "lucide-react";

type Job = {
  id: number;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  jobType: string;
  skills: string[];
  score: number;
  postedAt: string;
};

const jobs: Job[] = [
  {
    id: 1,
    company: "Wave Côte d'Ivoire",
    title: "Chargé de clientèle — Abidjan",
    location: "Abidjan",
    remote: false,
    jobType: "CDI",
    skills: ["Service client", "Vente", "Français"],
    score: 86,
    postedAt: "Aujourd'hui",
  },
  {
    id: 2,
    company: "MTN Côte d'Ivoire",
    title: "Commercial terrain B2B",
    location: "Abidjan",
    remote: false,
    jobType: "CDD",
    skills: ["Prospection", "CRM", "Négociation"],
    score: 74,
    postedAt: "Il y a 1 jour",
  },
  {
    id: 3,
    company: "Orange CI",
    title: "Assistant administratif et commercial",
    location: "Bouaké",
    remote: true,
    jobType: "CDI",
    skills: ["Excel", "Organisation", "Reporting"],
    score: 68,
    postedAt: "Il y a 3 jours",
  },
  {
    id: 4,
    company: "Jumia",
    title: "Responsable des ventes régional",
    location: "Yamoussoukro",
    remote: false,
    jobType: "CDI",
    skills: ["Management", "Vente", "Leadership"],
    score: 61,
    postedAt: "Il y a 5 jours",
  },
];

function scoreColor(score: number) {
  if (score >= 70) return "var(--feed-primary)";
  if (score >= 50) return "var(--feed-accent)";
  return "var(--feed-score-red)";
}

function ScoreCircle({ score }: { score: number }) {
  const size = 46;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--feed-secondary)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {score}
      </div>
    </div>
  );
}

function CurrentJobCard({
  job,
  saved,
  onToggleSave,
}: {
  job: Job;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const topSkills = job.skills.slice(0, 3);
  const extraSkills = job.skills.length - topSkills.length;
  const score = scoreColor(job.score);

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "15px 16px",
        border: "1px solid var(--feed-border)",
        borderRadius: 16,
        background: "var(--feed-card)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          bottom: 16,
          width: 3,
          borderRadius: 3,
          background: score,
        }}
      />
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", paddingLeft: 8 }}>
        <div
          style={{
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid var(--feed-primary-border)",
            borderRadius: 11,
            background: "var(--feed-primary-soft)",
            color: "var(--feed-primary)",
            fontSize: 19,
            fontWeight: 700,
          }}
        >
          {job.company[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              marginBottom: 3,
              overflow: "hidden",
              color: "var(--feed-muted)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.5px",
              textOverflow: "ellipsis",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {job.company}
          </div>
          <div style={{ color: "var(--feed-fg)", fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>
            {job.title}
          </div>
        </div>
        <ScoreCircle score={job.score} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--feed-muted)", fontSize: 12 }}>
          <MapPin size={12} />
          <span>{job.location}</span>
          {job.remote && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--feed-muted)" }} />
              <Wifi size={12} />
              <span>Remote</span>
            </>
          )}
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            background: "var(--feed-primary)",
            color: "#0a0a0a",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {job.jobType}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8 }}>
        <div style={{ display: "flex", flex: 1, flexWrap: "wrap", gap: 5 }}>
          {topSkills.map((skill) => (
            <span
              key={skill}
              style={{
                padding: "3px 9px",
                borderRadius: 7,
                background: "var(--feed-secondary)",
                color: "var(--feed-secondary-fg)",
                fontSize: 11,
              }}
            >
              {skill}
            </span>
          ))}
          {extraSkills > 0 && <span style={{ color: "var(--feed-muted)", fontSize: 11 }}>+{extraSkills}</span>}
        </div>
        <button
          aria-label={saved ? `Retirer ${job.title} des sauvegardés` : `Sauvegarder ${job.title}`}
          onClick={onToggleSave}
          style={{
            display: "grid",
            placeItems: "center",
            marginLeft: 10,
            padding: 0,
            border: 0,
            background: "transparent",
            color: saved ? "var(--feed-primary)" : "var(--feed-muted)",
            cursor: "pointer",
          }}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 8, color: "var(--feed-muted)", fontSize: 11 }}>
        <CalendarDays size={11} />
        {job.postedAt}
      </div>
    </article>
  );
}

export function Current() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--feed-bg)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--feed-border)",
          background: "var(--feed-bg)",
        }}
      >
        <img src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" style={{ width: 145, height: 42, objectFit: "contain" }} />
        <button
          aria-label="Actualiser les offres"
          style={{
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "var(--feed-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={19} />
        </button>
      </header>
      <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px 30px" }}>
        {jobs.map((job) => (
          <CurrentJobCard
            key={job.id}
            job={job}
            saved={savedIds.includes(job.id)}
            onToggleSave={() =>
              setSavedIds((current) =>
                current.includes(job.id)
                  ? current.filter((id) => id !== job.id)
                  : [...current, job.id],
              )
            }
          />
        ))}
      </section>
    </main>
  );
}