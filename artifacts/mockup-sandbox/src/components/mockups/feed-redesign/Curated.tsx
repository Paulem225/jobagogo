import "./_group.css";

import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  RefreshCw,
  Sparkles,
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
  period: "Aujourd'hui" | "Hier" | "Cette semaine";
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
    period: "Aujourd'hui",
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
    period: "Hier",
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
    period: "Cette semaine",
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
    period: "Cette semaine",
  },
];

function Meta({ job }: { job: Job }) {
  return (
    <div className="curated-meta">
      <span>
        <MapPin size={13} /> {job.location}
      </span>
      {job.remote && (
        <span>
          <Wifi size={13} /> Remote
        </span>
      )}
      <span className="curated-type">{job.jobType}</span>
    </div>
  );
}

function SaveButton({ saved, onClick, title }: { saved: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      aria-label={saved ? `Retirer ${title} des sauvegardés` : `Sauvegarder ${title}`}
      onClick={onClick}
      className={`curated-save ${saved ? "is-saved" : ""}`}
    >
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function Curated() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [refreshing, setRefreshing] = useState(false);
  const [openedId, setOpenedId] = useState<number | null>(null);

  const toggleSave = (id: number) => {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };

  const lead = jobs[0];
  const queue = jobs.slice(1);
  const queueGroups = (["Hier", "Cette semaine"] as const).map((period) => ({
    period,
    jobs: queue.filter((job) => job.period === period),
  }));

  return (
    <main className="curated-shell">
      <header className="curated-header">
        <img src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" />
        <button type="button" aria-label="Actualiser les offres" className="curated-refresh" onClick={refresh}>
          <RefreshCw size={19} className={refreshing ? "curated-spin" : ""} />
        </button>
      </header>

      <section className="curated-intro">
        <div className="curated-kicker"><Sparkles size={14} /> Préparée pour vous</div>
        <h1>Votre sélection<br /><em>du jour.</em></h1>
        <p>Une offre se démarque. Voici pourquoi elle mérite votre attention.</p>
      </section>

      <section className="curated-lead-wrap" aria-label="Meilleure correspondance">
        <div className="curated-current-period">
          <span className="curated-period-dot is-current" aria-hidden="true" />
          <div>
            <strong>Aujourd'hui</strong>
            <span>Votre meilleur match</span>
          </div>
        </div>
        <article className={`curated-lead ${openedId === lead.id ? "is-opened" : ""}`} onClick={() => setOpenedId(lead.id)}>
          <div className="curated-lead-top">
            <div className="curated-company-mark">{lead.company[0]}</div>
            <div className="curated-company">{lead.company}</div>
            <SaveButton saved={savedIds.includes(lead.id)} onClick={() => toggleSave(lead.id)} title={lead.title} />
          </div>
          <div className="curated-lead-score"><strong>{lead.score}</strong><span>%<br />match</span></div>
          <h2>{lead.title}</h2>
          <Meta job={lead} />
          <div className="curated-reason">
            <div className="curated-reason-label"><Check size={14} /> Pourquoi ce match</div>
            <p>Votre expérience en <b>service client</b> et votre maîtrise du <b>français</b> correspondent directement à ce poste.</p>
          </div>
          <div className="curated-lead-bottom">
            <span><CalendarDays size={13} /> {lead.postedAt}</span>
            <button type="button" onClick={() => setOpenedId(lead.id)} className="curated-cta">
              Voir l'offre <ArrowUpRight size={16} />
            </button>
          </div>
          {openedId === lead.id && <div className="curated-open-note">Ouverture de l'offre en préparation</div>}
        </article>
      </section>

      <section className="curated-queue">
        <div className="curated-queue-heading">
          <h3>Fil des opportunités</h3>
          <span>{jobs.length} offres</span>
        </div>
        <div className="curated-timeline">
          {queueGroups.map(({ period, jobs: periodJobs }) => (
            <section key={period} className="curated-period" aria-label={`Offres ${period.toLowerCase()}`}>
              <div className="curated-period-heading">
                <h4>{period}</h4>
                <span>{periodJobs.length} {periodJobs.length === 1 ? "offre" : "offres"}</span>
              </div>
              <div className="curated-period-list">
                {periodJobs.map((job) => (
                  <article key={job.id} className={`curated-row ${openedId === job.id ? "is-opened" : ""}`} onClick={() => setOpenedId(job.id)}>
                    <div className="curated-row-mark">{job.company[0]}</div>
                    <div className="curated-row-copy">
                      <div className="curated-row-company">{job.company} <span>· {job.score}%</span></div>
                      <h4>{job.title}</h4>
                      <div className="curated-row-meta">{job.location}{job.remote ? " · Remote" : ""} <span>·</span> {job.jobType}</div>
                    </div>
                    <SaveButton saved={savedIds.includes(job.id)} onClick={() => toggleSave(job.id)} title={job.title} />
                    <ChevronRight size={17} className="curated-chevron" />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}