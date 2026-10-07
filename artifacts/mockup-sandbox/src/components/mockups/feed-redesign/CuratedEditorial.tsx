import "./CuratedEditorial.css";

import { useState } from "react";
import { ArrowUpRight, Bookmark, CalendarDays, Check, ChevronRight, MapPin, RefreshCw, Sparkles, Wifi } from "lucide-react";

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

function Meta({ job }: { job: Job }) {
  return <div className="editorial-meta"><span><MapPin size={13} /> {job.location}</span>{job.remote && <span><Wifi size={13} /> Remote</span>}<span className="editorial-type">{job.jobType}</span></div>;
}

function SaveButton({ saved, onClick, title }: { saved: boolean; onClick: () => void; title: string }) {
  return <button type="button" aria-label={saved ? `Retirer ${title} des sauvegardés` : `Sauvegarder ${title}`} onClick={onClick} className={`editorial-save ${saved ? "is-saved" : ""}`}><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button>;
}

export function CuratedEditorial() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [refreshing, setRefreshing] = useState(false);
  const [openedId, setOpenedId] = useState<number | null>(null);
  const toggleSave = (id: number) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const refresh = () => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 650); };
  const lead = jobs[0];
  const queue = jobs.slice(1);

  return <main className="editorial-shell">
    <header className="editorial-header">
      <img src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" />
      <button type="button" aria-label="Actualiser les offres" className="editorial-refresh" onClick={refresh}><RefreshCw size={19} className={refreshing ? "editorial-spin" : ""} /></button>
    </header>
    <section className="editorial-intro">
      <div className="editorial-kicker"><Sparkles size={14} /> Préparée pour vous</div>
      <h1>Votre sélection<br /><em>du jour.</em></h1>
      <p>Une offre se démarque. Voici pourquoi elle mérite votre attention.</p>
    </section>
    <section className="editorial-lead-wrap" aria-label="Meilleure correspondance">
      <article className={`editorial-lead ${openedId === lead.id ? "is-opened" : ""}`} onClick={() => setOpenedId(lead.id)}>
        <div className="editorial-lead-top"><div className="editorial-company-mark">{lead.company[0]}</div><div className="editorial-company">{lead.company}</div><SaveButton saved={savedIds.includes(lead.id)} onClick={() => toggleSave(lead.id)} title={lead.title} /></div>
        <div className="editorial-lead-score"><strong>{lead.score}</strong><span>%<br />match</span></div>
        <h2>{lead.title}</h2><Meta job={lead} />
        <div className="editorial-reason"><div className="editorial-reason-label"><Check size={14} /> Pourquoi ce match</div><p>Votre expérience en <b>service client</b> et votre maîtrise du <b>français</b> correspondent directement à ce poste.</p></div>
        <div className="editorial-lead-bottom"><span><CalendarDays size={13} /> {lead.postedAt}</span><button type="button" onClick={() => setOpenedId(lead.id)} className="editorial-cta">Voir l'offre <ArrowUpRight size={16} /></button></div>
        {openedId === lead.id && <div className="editorial-open-note">Ouverture de l'offre en préparation</div>}
      </article>
    </section>
    <section className="editorial-queue"><div className="editorial-queue-heading"><h3>À regarder ensuite</h3><span>{queue.length} offres</span></div>
      {queue.map((job) => <article key={job.id} className={`editorial-row ${openedId === job.id ? "is-opened" : ""}`} onClick={() => setOpenedId(job.id)}><div className="editorial-row-mark">{job.company[0]}</div><div className="editorial-row-copy"><div className="editorial-row-company">{job.company} <span>· {job.score}%</span></div><h4>{job.title}</h4><div className="editorial-row-meta">{job.location}{job.remote ? " · Remote" : ""} <span>·</span> {job.jobType}</div></div><SaveButton saved={savedIds.includes(job.id)} onClick={() => toggleSave(job.id)} title={job.title} /><ChevronRight size={17} className="editorial-chevron" /></article>)}
    </section>
  </main>;
}