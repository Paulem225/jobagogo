import { useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react";
import "./JobMatchingVariant.css";

const proofItems = [
  {
    label: "Compétences clés",
    value: "Vente, CRM et service client",
    detail: "3 compétences correspondent à votre profil",
    icon: BriefcaseBusiness,
  },
  {
    label: "Secteur recherché",
    value: "Commercial",
    detail: "Le secteur de l’offre est cohérent",
    icon: MapPin,
  },
  {
    label: "Niveau demandé",
    value: "Bac+2",
    detail: "Le niveau indiqué dans votre profil est accepté",
    icon: GraduationCap,
  },
  {
    label: "Expérience",
    value: "Vente ou service client",
    detail: "Votre parcours couvre le besoin principal",
    icon: Check,
  },
];

export function JobMatchingVariant() {
  const [expanded, setExpanded] = useState(false);
  const visibleProofs = expanded ? proofItems : proofItems.slice(0, 3);

  return (
    <main className="jobmatching-stage">
      <section className="jobmatching-card" aria-label="Alternative de preuve du matching">
        <header className="jobmatching-topbar">
          <span className="jobmatching-brand">jobagogo</span>
          <span className="jobmatching-context">Détail du matching</span>
        </header>

        <div className="jobmatching-intro">
          <div className="jobmatching-score-ring" aria-label="86 pour cent compatible">
            <div className="jobmatching-score-inner">
              <strong>86<span>%</span></strong>
              <small>compatible</small>
            </div>
          </div>
          <div className="jobmatching-intro-copy">
            <p className="jobmatching-eyebrow">
              <Sparkles size={13} strokeWidth={2.4} />
              Votre signal fort
            </p>
            <h1>Cette offre vous ressemble.</h1>
            <p>Votre profil coche les critères les plus importants pour ce poste.</p>
          </div>
        </div>

        <div className="jobmatching-highlight">
          <span className="jobmatching-highlight-dot" />
          <p><strong>4 signaux détectés</strong> dans votre profil et cette offre</p>
        </div>

        <div className="jobmatching-proof-list">
          {visibleProofs.map((proof) => {
            const Icon = proof.icon;

            return (
              <article className="jobmatching-proof" key={proof.label}>
                <span className="jobmatching-proof-icon">
                  <Icon size={16} strokeWidth={2.3} />
                </span>
                <div className="jobmatching-proof-copy">
                  <p>{proof.label}</p>
                  <strong>{proof.value}</strong>
                  {expanded ? <small>{proof.detail}</small> : null}
                </div>
                <span className="jobmatching-proof-check" aria-label="Correspondance trouvée">
                  <Check size={12} strokeWidth={3} />
                </span>
              </article>
            );
          })}
        </div>

        <button
          className={`jobmatching-toggle ${expanded ? "is-expanded" : ""}`}
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? "Réduire les preuves" : "Voir la preuve complète"}
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>

        <p className="jobmatching-footnote">
          Score calculé à partir des informations de votre profil et de l’offre Lapaire.
        </p>
      </section>
    </main>
  );
}

export default JobMatchingVariant;