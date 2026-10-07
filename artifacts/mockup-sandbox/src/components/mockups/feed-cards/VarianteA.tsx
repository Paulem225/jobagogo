import "./_group.css";

const jobs = [
  {
    company: "Back Market",
    title: "Data Analyst — Growth & Marketing",
    location: "Paris",
    remote: true,
    jobType: "CDI",
    skills: ["SQL", "Python", "Analytics", "dbt"],
    score: 65,
    saved: true,
  },
  {
    company: "L'Oréal",
    title: "Développeur Fullstack Vue.js / Laravel",
    location: "Clichy",
    remote: true,
    jobType: "CDI",
    skills: ["Vue.js", "Laravel", "PHP", "TypeScript"],
    score: 64,
    saved: false,
  },
  {
    company: "Société Générale",
    title: "Développeur Java Spring Boot — Microservices",
    location: "La Défense",
    remote: false,
    jobType: "CDI",
    skills: ["Java", "Spring Boot", "Microservices"],
    score: 61,
    saved: false,
  },
  {
    company: "Decathlon Digital",
    title: "Ingénieur Développement Web — Junior",
    location: "Lille",
    remote: true,
    jobType: "CDI",
    skills: ["JavaScript", "TypeScript", "React"],
    score: 60,
    saved: false,
  },
];

function scoreColor(s: number) {
  if (s >= 70) return "var(--score-green)";
  if (s >= 50) return "var(--score-yellow)";
  return "var(--score-red)";
}

function ScoreCircle({ score }: { score: number }) {
  const c = 34;
  const r = 14;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const dash = pct * circ;
  const color = scoreColor(score);
  return (
    <div style={{ position: "relative", width: c * 2, height: c * 2, flexShrink: 0 }}>
      <svg width={c * 2} height={c * 2} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--secondary)" strokeWidth={3} />
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke={color} strokeWidth={3}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "system-ui" }}>{score}</span>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: typeof jobs[0] }) {
  const topSkills = job.skills.slice(0, 3);
  const extra = job.skills.length - 3;
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 11,
    }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "var(--primary-15)", border: "1px solid var(--primary-40)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", fontFamily: "system-ui" }}>
            {job.company[0]}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "system-ui", marginBottom: 2 }}>
            {job.company}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", lineHeight: 1.35, fontFamily: "system-ui" }}>
            {job.title}
          </div>
        </div>
        <ScoreCircle score={job.score} />
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {/* Location */}
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          fontSize: 11, fontWeight: 500, color: "var(--muted)", fontFamily: "system-ui",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {job.location}
        </div>
        {/* Contract type — PRIMARY colored badge */}
        <div style={{
          padding: "3px 9px",
          background: "var(--primary-15)",
          border: "1px solid var(--primary-40)",
          borderRadius: 7,
          fontSize: 11, fontWeight: 600, color: "var(--primary)", fontFamily: "system-ui",
        }}>
          {job.jobType}
        </div>
        {/* Remote */}
        {job.remote && (
          <div style={{
            padding: "3px 9px",
            background: "var(--secondary)",
            borderRadius: 7,
            fontSize: 11, fontWeight: 500, color: "var(--secondary-fg)", fontFamily: "system-ui",
          }}>
            Remote
          </div>
        )}
      </div>

      {/* Skills + bookmark */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
          {topSkills.map((s) => (
            <span key={s} style={{
              padding: "3px 8px", background: "var(--secondary)", borderRadius: 6,
              fontSize: 11, color: "var(--secondary-fg)", fontFamily: "system-ui",
            }}>{s}</span>
          ))}
          {extra > 0 && (
            <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", fontFamily: "system-ui" }}>+{extra}</span>
          )}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill={job.saved ? "var(--primary)" : "none"}
          stroke={job.saved ? "var(--primary)" : "var(--muted)"}
          strokeWidth="2" style={{ flexShrink: 0, marginLeft: 10 }}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
      </div>
    </div>
  );
}

export function VarianteA() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.5px" }}>JobMatch</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>30 offres</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        </div>
      </div>

      {/* Card list */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.map((j, i) => <JobCard key={i} job={j} />)}
      </div>
    </div>
  );
}
