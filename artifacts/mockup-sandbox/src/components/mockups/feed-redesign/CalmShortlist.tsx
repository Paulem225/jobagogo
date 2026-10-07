import "./CalmShortlist.css";

import { useState } from "react";
import { ArrowUpRight, Bookmark, CalendarDays, Check, MapPin, RefreshCw, Wifi } from "lucide-react";

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
  { id: 1, company: "Wave Côte d'Ivoire", title: "Chargé de clientèle — Abidjan", location: "Abidjan", remote: false, jobType: "CDI", skills: ["Service client", "Vente", "Français"], score: 86, postedAt: "Aujourd'hui" },
  { id: 2, company: "MTN Côte d'Ivoire", title: "Commercial terrain B2B", location: "Abidjan", remote: false, jobType: "CDD", skills: ["Prospection", "CRM", "Négociation"], score: 74, postedAt: "Il y a 1 jour" },
  { id: 3, company: "Orange CI", title: "Assistant administratif et commercial", location: "Bouaké", remote: true, jobType: "CDI", skills: ["Excel", "Organisation", "Reporting"], score: 68, postedAt: "Il y a 3 jours" },
  { id: 4, company: "Jumia", title: "Responsable des ventes régional", location: "Yamoussoukro", remote: false, jobType: "CDI", skills: ["Management", "Vente", "Leadership"], score: 61, postedAt: "Il y a 5 jours" },
];

function JobMeta({ job }: { job: Job }) {
  return (
    <div className="calm-meta">
      <span><MapPin size={13} /> {job.location}</span>
      {job.remote && <span><Wifi size={13} /> Remote</span>}
      <span className="type">{job.jobType}</span>
    </div>
  );
}

export function CalmShortlist() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("Toutes");

  const toggleSave = (id: number) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };
  const visibleJobs = filter === "Remote" ? jobs.filter((job) => job.remote) : filter === "CDI" ? jobs.filter((job) => job.jobType === "CDI") : jobs;

  return (
    <main className="calm-shortlist">
      <header className="calm-shortlist-header">
        <img src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" />
        <button type="button" aria-label="Actualiser les offres" className="calm-refresh" onClick={refresh}>
          <RefreshCw size={18} className={refreshing ? "calm-spin" : ""} />
        </button>
      </header>

      <section className="calm-shortlist-intro">
        <p className="calm-shortlist-eyebrow">Votre shortlist · 04 juin</p>
        <h1>Des pistes qui<br /><em>vous ressemblent.</em></h1>
        <p>Nous avons retenu les offres où votre expérience peut faire la différence. Prenez le temps de regarder.</p>
        <div className="calm-shortlist-filter" aria-label="Filtrer les offres">
          {["Toutes", "CDI", "Remote"].map((item) => (
            <button key={item} type="button" className={`calm-pill ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
      </section>

      <section className="calm-shortlist-list" aria-label="Offres recommandées">
        <div className="calm-count">{visibleJobs.length} offres retenues pour vous</div>
        {visibleJobs.map((job, index) => (
          <article key={job.id} className={`calm-job ${openedId === job.id ? "opened" : ""}`} onClick={() => setOpenedId(job.id)}>
            <div className="calm-job-head">
              <div className="calm-mark">{job.company[0]}</div>
              <div>
                <p className="calm-job-company">{job.company}</p>
                <h2>{job.title}</h2>
              </div>
              <div className="calm-match"><strong>{job.score}</strong>% match</div>
              <button type="button" aria-label={savedIds.includes(job.id) ? `Retirer ${job.title} des sauvegardés` : `Sauvegarder ${job.title}`} className={`calm-save ${savedIds.includes(job.id) ? "saved" : ""}`} onClick={(event) => { event.stopPropagation(); toggleSave(job.id); }}>
                <Bookmark size={18} fill={savedIds.includes(job.id) ? "currentColor" : "none"} />
              </button>
            </div>
            <JobMeta job={job} />
            <div className="calm-job-bottom">
              <span><CalendarDays size={13} /> {job.postedAt}</span>
              <button type="button" className="calm-view" onClick={(event) => { event.stopPropagation(); setOpenedId(job.id); }}>
                Voir l'offre <ArrowUpRight size={15} />
              </button>
            </div>
            {index === 0 && <div className="calm-reason"><Check size={13} /> Votre expérience en <b>service client</b> et votre maîtrise du <b>français</b> font la différence ici.</div>}
            {openedId === job.id && <div className="calm-open-note">Ouverture de l'offre en préparation</div>}
          </article>
        ))}
      </section>
    </main>
  );
}