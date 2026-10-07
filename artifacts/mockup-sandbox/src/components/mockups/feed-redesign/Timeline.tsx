import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Wifi,
} from "lucide-react";

type Job = {
  id: number;
  company: string;
  title: string;
  location: string;
  remote?: boolean;
  type: string;
  skills: string[];
  score: number;
  date: string;
  age: string;
  color: string;
  featured?: boolean;
};

const jobs: Job[] = [
  {
    id: 1,
    company: "Wave Côte d'Ivoire",
    title: "Chargé de clientèle — Abidjan",
    location: "Abidjan",
    type: "CDI",
    skills: ["Service client", "Vente"],
    score: 86,
    date: "Aujourd'hui",
    age: "Il y a 2 h",
    color: "#ff785a",
    featured: true,
  },
  {
    id: 2,
    company: "MTN Côte d'Ivoire",
    title: "Commercial terrain B2B",
    location: "Abidjan",
    type: "CDD",
    skills: ["Prospection", "CRM"],
    score: 74,
    date: "Hier",
    age: "Hier · 16:40",
    color: "#f5bf43",
  },
  {
    id: 3,
    company: "Orange CI",
    title: "Assistant administratif et commercial",
    location: "Bouaké",
    remote: true,
    type: "CDI",
    skills: ["Excel", "Organisation"],
    score: 68,
    date: "Il y a 3 jours",
    age: "Lun. 12 mai",
    color: "#ef795d",
  },
  {
    id: 4,
    company: "Jumia",
    title: "Responsable des ventes régional",
    location: "Yamoussoukro",
    type: "CDI",
    skills: ["Management", "Leadership"],
    score: 61,
    date: "Il y a 5 jours",
    age: "Sam. 10 mai",
    color: "#5972c9",
  },
];

function SaveButton({ saved, onClick, title }: { saved: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      aria-label={saved ? `Retirer ${title} des sauvegardés` : `Sauvegarder ${title}`}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      className={`timeline-save ${saved ? "saved" : ""}`}
    >
      <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function Timeline() {
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleSave = (id: number) => setSavedIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ));
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };

  return (
    <main className="timeline-shell">
      <style>{`
        .timeline-shell{--ink:#26334a;--muted:#748096;--line:#dfe4eb;--paper:#f7f5f0;--card:#fffdfa;min-height:100vh;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,sans-serif;padding:0 22px 40px;overflow:hidden}
        .timeline-shell *{box-sizing:border-box}.timeline-top{max-width:760px;margin:0 auto;padding:24px 0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7e4dc}
        .timeline-brand{width:120px;height:auto}.timeline-icon{border:1px solid #dfe2e7;background:#fffdfa;color:var(--ink);width:40px;height:40px;border-radius:12px;display:grid;place-items:center;cursor:pointer;transition:transform .2s}.timeline-icon:active{transform:scale(.94)}
        .timeline-hero{max-width:760px;margin:0 auto;padding:29px 0 25px}.timeline-eyebrow{display:flex;align-items:center;gap:7px;color:#e36b50;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.timeline-hero h1{font-family:Georgia,serif;font-size:39px;line-height:1.03;font-weight:400;letter-spacing:-.045em;margin:12px 0 10px}.timeline-hero h1 em{color:#e36b50;font-style:italic}.timeline-hero p{color:var(--muted);font-size:14px;line-height:1.5;margin:0;max-width:380px}
        .timeline-toolbar{max-width:760px;margin:0 auto 30px;display:flex;align-items:center;justify-content:space-between}.timeline-count{font-size:13px;color:var(--muted)}.timeline-count b{color:var(--ink)}.timeline-filter{display:flex;align-items:center;gap:7px;background:transparent;border:0;color:var(--ink);font-size:12px;font-weight:800;cursor:pointer}.timeline-filter svg{color:#e36b50}.timeline-filters{max-width:760px;margin:-18px auto 24px;display:flex;gap:7px;flex-wrap:wrap}.timeline-chip{border:1px solid #dfe2e7;background:#fffdfa;padding:7px 11px;border-radius:20px;color:var(--muted);font-size:11px}.timeline-chip.active{color:#e36b50;border-color:#f0b3a4;background:#fff3ef}
        .timeline{max-width:760px;margin:0 auto}.timeline-day{position:relative;padding-left:30px;margin-bottom:28px}.timeline-day:before{content:"";position:absolute;left:6px;top:28px;bottom:-29px;width:1px;background:var(--line)}.timeline-day:last-child:before{display:none}.timeline-date{position:relative;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8791a0;margin:0 0 13px}.timeline-date:before{content:"";position:absolute;left:-29px;top:3px;width:9px;height:9px;border:2px solid #e36b50;background:var(--paper);border-radius:50%}
        .timeline-card{position:relative;background:var(--card);border:1px solid #e9e5dc;border-radius:17px;padding:18px 17px 15px;box-shadow:0 7px 22px rgba(42,51,74,.045);cursor:pointer;transition:transform .2s,box-shadow .2s}.timeline-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(42,51,74,.09)}.timeline-card.featured{border-color:#f2b4a4;background:#fffaf7}.timeline-card.opened{border-color:#e36b50}.timeline-card-head{display:flex;align-items:center;gap:10px}.timeline-mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:white;font-weight:800;font-size:14px}.timeline-company{font-size:12px;font-weight:800;flex:1}.timeline-age{font-size:11px;color:#8992a0;display:flex;align-items:center;gap:4px}.timeline-save{border:0;background:transparent;color:#a8afbb;padding:5px;cursor:pointer}.timeline-save.saved{color:#e36b50}.timeline-card h2{font-size:17px;line-height:1.25;letter-spacing:-.02em;margin:15px 0 9px;font-weight:750;max-width:500px}.timeline-meta{display:flex;align-items:center;gap:13px;flex-wrap:wrap;color:#7d8797;font-size:11px}.timeline-meta span{display:flex;align-items:center;gap:4px}.timeline-type{border-radius:5px;background:#eef0f5;padding:4px 7px;color:#5f6b80;font-weight:800}.timeline-card.featured .timeline-type{background:#fff0eb;color:#d86249}.timeline-reason{margin:15px 0 2px;border-left:2px solid #f2b4a4;padding:1px 0 1px 11px;color:#6e788b;font-size:11px;line-height:1.45}.timeline-reason b{color:var(--ink)}.timeline-reason-label{display:flex;align-items:center;gap:5px;color:#e36b50;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}.timeline-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:15px;padding-top:12px;border-top:1px solid #efebe5}.timeline-skills{display:flex;gap:5px;flex-wrap:wrap}.timeline-skill{color:#8a93a0;font-size:10px}.timeline-cta{border:0;background:transparent;color:#e36b50;display:flex;align-items:center;gap:3px;font-size:12px;font-weight:800;cursor:pointer}.timeline-open-note{font-size:11px;color:#e36b50;margin-top:12px;padding-top:10px;border-top:1px dashed #efb8aa}.timeline-foot{text-align:center;color:#9aa1ad;font-size:11px;padding:2px 0 0}.timeline-spin{animation:timeline-spin .65s linear infinite}@keyframes timeline-spin{to{transform:rotate(360deg)}}@media(max-width:520px){.timeline-shell{padding:0 16px 32px}.timeline-hero h1{font-size:35px}.timeline-day{padding-left:25px}.timeline-date:before{left:-24px}.timeline-day:before{left:5px}.timeline-card{padding:16px 14px}.timeline-age{font-size:10px}}
      `}</style>
      <header className="timeline-top">
        <img className="timeline-brand" src="/__mockup/images/jobagogo-feed-logo.png" alt="Jobagogo" />
        <button type="button" className="timeline-icon" aria-label="Actualiser les offres" onClick={refresh}>
          <RefreshCw size={18} className={refreshing ? "timeline-spin" : ""} />
        </button>
      </header>
      <section className="timeline-hero">
        <div className="timeline-eyebrow"><Sparkles size={14} /> Votre fil d'opportunités</div>
        <h1>Les bonnes offres,<br /><em>au bon moment.</em></h1>
        <p>Suivez les opportunités au fil de leur arrivée. Votre prochaine étape commence peut-être aujourd'hui.</p>
      </section>
      <div className="timeline-toolbar">
        <span className="timeline-count"><b>12 offres</b> pour votre profil</span>
        <button type="button" className="timeline-filter" onClick={() => setFilterOpen((open) => !open)}>
          <SlidersHorizontal size={15} /> Filtrer
        </button>
      </div>
      {filterOpen && <div className="timeline-filters"><span className="timeline-chip active">Toutes</span><span className="timeline-chip">CDI</span><span className="timeline-chip">À distance</span><span className="timeline-chip">Abidjan</span></div>}
      <section className="timeline" aria-label="Offres d'emploi par ordre chronologique">
        {jobs.map((job, index) => (
          <div className="timeline-day" key={job.id}>
            <p className="timeline-date">{job.date}</p>
            <article className={`timeline-card ${job.featured ? "featured" : ""} ${openedId === job.id ? "opened" : ""}`} onClick={() => setOpenedId(job.id)}>
              <div className="timeline-card-head">
                <div className="timeline-mark" style={{ background: job.color }}>{job.company[0]}</div>
                <div className="timeline-company">{job.company}</div>
                <div className="timeline-age"><Clock3 size={12} /> {job.age}</div>
                <SaveButton saved={savedIds.includes(job.id)} onClick={() => toggleSave(job.id)} title={job.title} />
              </div>
              <h2>{job.title}</h2>
              <div className="timeline-meta"><span><MapPin size={13} /> {job.location}</span>{job.remote && <span><Wifi size={13} /> Remote</span>}<span className="timeline-type">{job.type}</span><span>{job.score}% match</span></div>
              {job.featured && <div className="timeline-reason"><div className="timeline-reason-label"><Check size={13} /> Pourquoi ce match</div>Votre expérience en <b>service client</b> et votre maîtrise du <b>français</b> correspondent directement à ce poste.</div>}
              <div className="timeline-bottom"><div className="timeline-skills">{job.skills.map((skill) => <span className="timeline-skill" key={skill}>#{skill}</span>)}</div><button type="button" className="timeline-cta" onClick={(event) => { event.stopPropagation(); setOpenedId(job.id); }}>Ouvrir <ArrowUpRight size={15} /></button></div>
              {openedId === job.id && <div className="timeline-open-note"><CalendarDays size={12} /> Offre sélectionnée — détails en préparation</div>}
            </article>
            {index === jobs.length - 1 && <p className="timeline-foot">Vous êtes à jour · Revenez demain pour de nouvelles offres</p>}
          </div>
        ))}
      </section>
    </main>
  );
}