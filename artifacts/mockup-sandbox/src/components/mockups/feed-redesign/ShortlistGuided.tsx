import "./_group.css";
import "./ShortlistGuided.css";

import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
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

function scoreTone(score: number) {
  return score >= 80 ? "#73da82" : score >= 70 ? "#e7b45c" : "#a7b4a9";
}

function SaveButton({
  job,
  saved,
  onSave,
}: {
  job: Job;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <button
      className={`curated-save ${saved ? "is-saved" : ""}`}
      aria-label={saved ? `Retirer ${job.title} des sauvegardés` : `Sauvegarder ${job.title}`}
      onClick={(event) => {
        event.stopPropagation();
        onSave();
      }}
      style={{ transition: "color 160ms ease, transform 160ms ease" }}
    >
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function LeadMatch({
  job,
  saved,
  opened,
  onSave,
  onOpen,
}: {
  job: Job;
  saved: boolean;
  opened: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="guided-lead">
      <div className="guided-lead-ribbon">
        <span><Sparkles size={12} /> À regarder en premier</span>
        <span>86% de compatibilité</span>
      </div>
      <div className="guided-lead-head">
        <div className="guided-mark">W</div>
        <div className="guided-company">
          <span>{job.company}</span>
          <small>Offre vérifiée</small>
        </div>
        <SaveButton job={job} saved={saved} onSave={onSave} />
      </div>
      <div className="guided-score-line">
        <strong>{job.score}%</strong>
        <span>match<br />profil</span>
      </div>
      <h2>{job.title}</h2>
      <div className="guided-meta">
        <span><MapPin size={13} /> {job.location}</span>
        <span className="guided-contract">{job.jobType}</span>
      </div>
      <div className="guided-why">
        <div><Check size={14} /> Pourquoi cette offre</div>
        <p>Vos expériences en <b>{job.skills[0]}</b> et <b>{job.skills[1]}</b> correspondent directement au poste.</p>
      </div>
      <div className="guided-skills">
        {job.skills.map((skill) => <span key={skill}>{skill}</span>)}
      </div>
      <div className="guided-lead-footer">
        <span><CalendarDays size={12} /> {job.postedAt}</span>
        <button className="guided-cta" onClick={onOpen}>
          Voir l'offre <ArrowUpRight size={15} />
        </button>
      </div>
      {opened && <div className="guided-open-note">L'offre est prête à être consultée.</div>}
    </article>
  );
}

function OpportunityRow({
  job,
  saved,
  expanded,
  onSave,
  onToggle,
  onOpen,
}: {
  job: Job;
  saved: boolean;
  expanded: boolean;
  onSave: () => void;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={`guided-row ${expanded ? "is-expanded" : ""}`} onClick={onToggle}>
      <div className="guided-row-top">
        <div className="guided-row-mark">{job.company[0]}</div>
        <div className="guided-row-copy">
          <div className="guided-row-company">{job.company} <b>{job.score}%</b></div>
          <h3>{job.title}</h3>
          <div className="guided-row-meta">
            <span>{job.location}{job.remote ? " · Remote" : ""}</span>
            <i>·</i><span>{job.jobType}</span><i>·</i><span>{job.postedAt}</span>
          </div>
        </div>
        <SaveButton job={job} saved={saved} onSave={onSave} />
        <span className="guided-disclosure">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </div>
      {expanded && (
        <div className="guided-row-details" onClick={(event) => event.stopPropagation()}>
          <div className="guided-row-skills">
            {job.skills.map((skill) => <span key={skill}>{skill}</span>)}
          </div>
          <button className="guided-row-open" onClick={onOpen}>Ouvrir l'offre <ArrowUpRight size={14} /></button>
        </div>
      )}
    </article>
  );
}

export function ShortlistGuided() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const toggleSaved = (id: number) => {
    setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };

  return (
    <main className="guided-shell">
      <header className="guided-header">
        <img src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" />
        <div className="guided-header-status"><span /> Sélection du jour</div>
        <button className={`curated-refresh ${refreshing ? "curated-spin" : ""}`} aria-label="Actualiser les offres" onClick={refresh}>
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="guided-intro">
        <div className="guided-kicker">Votre shortlist, en clair</div>
        <h1>Les offres qui<br /><em>méritent votre temps.</em></h1>
        <p>Une priorité, puis quelques pistes à comparer tranquillement.</p>
        <div className="guided-guide">
          <span><b>01</b> meilleur match</span><span><b>02</b> à comparer</span><span><b>03</b> à garder en tête</span>
        </div>
      </section>

      <section className="guided-content">
        <div className="guided-period"><span className="guided-period-dot" /> <strong>Aujourd'hui</strong><small>Votre meilleur match</small></div>
        <LeadMatch
          job={jobs[0]}
          saved={savedIds.includes(jobs[0].id)}
          opened={openedId === jobs[0].id}
          onSave={() => toggleSaved(jobs[0].id)}
          onOpen={() => setOpenedId(jobs[0].id)}
        />

        <div className="guided-queue-head">
          <div><h2>À comparer ensuite</h2><p>Des pistes solides, sans bruit.</p></div>
          <span>{jobs.length - 1} offres</span>
        </div>
        <div className="guided-queue">
          {jobs.slice(1).map((job, index) => (
            <div key={job.id}>
              {index === 0 && <div className="guided-group-label">Hier</div>}
              {index === 2 && <div className="guided-group-label">Cette semaine</div>}
              <OpportunityRow
                job={job}
                saved={savedIds.includes(job.id)}
                expanded={expandedId === job.id}
                onSave={() => toggleSaved(job.id)}
                onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
                onOpen={() => setOpenedId(job.id)}
              />
              {openedId === job.id && <div className="guided-row-note">L'offre est prête à être consultée.</div>}
            </div>
          ))}
        </div>
        <div className="guided-footnote"><Wifi size={13} /> Les nouvelles offres apparaissent ici chaque matin.</div>
      </section>
    </main>
  );
}