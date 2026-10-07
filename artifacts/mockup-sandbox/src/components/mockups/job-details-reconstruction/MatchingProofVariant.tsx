import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react";
import "./MatchingProofVariant.css";

const evidence = [
  {
    label: "Compétences",
    value: "Vente, CRM, service client",
    icon: BriefcaseBusiness,
  },
  {
    label: "Secteur",
    value: "Commercial",
    icon: Sparkles,
  },
  {
    label: "Niveau",
    value: "Bac+2",
    icon: GraduationCap,
  },
  {
    label: "Localisation",
    value: "Bondoukou, Côte d'Ivoire",
    icon: MapPin,
  },
];

export function MatchingProofVariant() {
  const [expanded, setExpanded] = useState(false);

  return (
    <main className="matching-proof-variant-stage">
      <section className="matching-proof-variant-card" aria-label="Preuve du matching de l'offre Lapaire">
        <div className="matching-proof-variant-topline">
          <div className="matching-proof-variant-eyebrow">
            <span className="matching-proof-variant-eyebrow-icon">
              <Sparkles size={13} strokeWidth={2.4} />
            </span>
            Analyse Jobagogo
          </div>
          <div className="matching-proof-variant-score" aria-label="86 pour cent de compatibilité">
            <strong>86</strong>
            <span>%</span>
          </div>
        </div>

        <h1>Cette offre vous ressemble.</h1>
        <p className="matching-proof-variant-intro">
          Votre profil répond aux signaux clés recherchés par Lapaire pour ce poste commercial.
        </p>

        <div className="matching-proof-variant-meter" aria-label="Niveau de compatibilité élevé">
          <div className="matching-proof-variant-meter-track">
            <span />
          </div>
          <div className="matching-proof-variant-meter-labels">
            <span>Compatibilité élevée</span>
            <span>4 signaux détectés</span>
          </div>
        </div>

        <div className="matching-proof-variant-highlight">
          <span className="matching-proof-variant-highlight-icon">
            <BadgeCheck size={18} strokeWidth={2.3} />
          </span>
          <div>
            <strong>Un bon point de départ</strong>
            <span>Les éléments les plus importants sont alignés.</span>
          </div>
        </div>

        <button
          type="button"
          className="matching-proof-variant-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{expanded ? "Masquer la preuve" : "Voir la preuve complète"}</span>
          <ChevronDown size={17} className={expanded ? "is-open" : ""} strokeWidth={2.2} />
        </button>

        {expanded ? (
          <div className="matching-proof-variant-details">
            {evidence.map(({ label, value, icon: Icon }) => (
              <div className="matching-proof-variant-detail" key={label}>
                <span className="matching-proof-variant-detail-icon">
                  <Icon size={14} strokeWidth={2} />
                </span>
                <div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default MatchingProofVariant;