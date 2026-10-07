import { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe2,
  MapPin,
  Sparkles,
} from "lucide-react";
import "../feed-redesign/_group.css";
import "./DecisionFirst.css";

const breakdown = [
  { label: "Compétences", value: 100, tone: "green" },
  { label: "Localisation", value: 90, tone: "green" },
  { label: "Expérience", value: 100, tone: "green" },
  { label: "Salaire", value: 70, tone: "amber" },
];

const description =
  "Saipem recrute un Payroll Officer pour piloter les opérations de paie et garantir la fiabilité des données collaborateurs. Vous travaillerez avec les équipes RH et Finance à Abidjan, dans un environnement international exigeant.";

export function DecisionFirst() {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [applied, setApplied] = useState(false);

  return (
    <main className="decision-first">
      <div className="decision-first__page">
        <header className="decision-first__topbar">
          <button className="decision-first__icon-button" aria-label="Retour" onClick={() => window.history.back()}>
            <ArrowLeft size={19} strokeWidth={1.8} />
          </button>
          <span className="decision-first__topbar-label">Détail de l'offre</span>
          <button
            className="decision-first__icon-button"
            aria-label={saved ? "Retirer des offres sauvegardées" : "Sauvegarder l'offre"}
            onClick={() => setSaved((value) => !value)}
          >
            <Bookmark size={19} fill={saved ? "currentColor" : "none"} strokeWidth={1.8} />
          </button>
        </header>

        <section className="decision-first__hero">
          <div className="decision-first__eyebrow">
            <span className="decision-first__eyebrow-dot" />
            Recommandée pour vous
          </div>
          <div className="decision-first__identity">
            <div className="decision-first__company-mark" aria-hidden="true">S</div>
            <div>
              <p className="decision-first__company">Saipem</p>
              <h1 className="decision-first__title">Payroll Officer</h1>
            </div>
          </div>
          <div className="decision-first__facts" aria-label="Informations clés">
            <span className="decision-first__fact"><MapPin size={14} /> Abidjan, Côte d'Ivoire</span>
            <span className="decision-first__contract">CDI</span>
            <span className="decision-first__fact"><BriefcaseBusiness size={14} /> Finance &amp; RH</span>
          </div>
          <div className="decision-first__score-hero">
            <div className="decision-first__score-copy">
              <strong>Un très bon choix pour votre profil</strong>
              <span>Votre expérience et vos compétences correspondent presque parfaitement.</span>
            </div>
            <div className="decision-first__ring" aria-label="Score de compatibilité 95 sur 100">
              <strong>95</strong>
              <small>match</small>
            </div>
          </div>
        </section>

        <section className="decision-first__section">
          <div className="decision-first__section-heading">
            <h2>Pourquoi cette offre vous correspond</h2>
            <span>Preuves du score</span>
          </div>
          <p className="decision-first__evidence-note">
            Les éléments ci-dessous expliquent votre score de compatibilité et vous aident à décider.
          </p>
          {breakdown.map((item) => (
            <div className="decision-first__score-row" key={item.label}>
              <span className="decision-first__score-label">{item.label}</span>
              <div className="decision-first__track">
                <div
                  className={`decision-first__fill ${item.tone === "amber" ? "decision-first__fill--amber" : ""}`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="decision-first__score-value">{item.value}%</span>
            </div>
          ))}
          <div className="decision-first__salary-signal">
            <Sparkles size={14} />
            Salaire à vérifier : c'est le seul point qui mérite votre attention.
          </div>
        </section>

        <section className="decision-first__section">
          <div className="decision-first__section-heading">
            <h2>Compétences requises</h2>
            <span>2 compétences</span>
          </div>
          <div className="decision-first__skills">
            <span className="decision-first__skill">Excel</span>
            <span className="decision-first__skill">Management</span>
          </div>
        </section>

        <section className="decision-first__section">
          <div className="decision-first__section-heading">
            <h2>Description</h2>
            <span>À lire avant de postuler</span>
          </div>
          <div className="decision-first__description">
            {expanded ? description : `${description.slice(0, 155)}…`}
          </div>
          <button className="decision-first__more" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Voir moins" : "Voir plus"}
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </section>

        <section className="decision-first__section">
          <div className="decision-first__source">
            <Globe2 size={15} />
            <span>Source : <strong>LinkedIn</strong></span>
            <ExternalLink size={13} />
          </div>
        </section>
      </div>

      <div className="decision-first__bottom-action">
        <button className={`decision-first__apply ${applied ? "is-confirmed" : ""}`} onClick={() => setApplied(true)}>
          {applied ? <Check size={17} /> : <ExternalLink size={16} />}
          {applied ? "Lien ouvert — bonne chance" : "Voir l'offre complète"}
        </button>
        {applied && <p className="decision-first__toast">Vous pouvez revenir ici pour retrouver cette opportunité.</p>}
      </div>
    </main>
  );
}