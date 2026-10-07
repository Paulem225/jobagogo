import { useState } from "react";
import {
  BatteryFull,
  Bookmark,
  Check,
  ChevronLeft,
  MapPin,
  Share2,
  Signal,
  Wifi,
} from "lucide-react";
import "./JobDetails.css";

type Tab = "Description" | "Exigences" | "À propos";

const tabs: Tab[] = ["Description", "Exigences", "À propos"];

const job = {
  id: 673,
  title: "Commercial (e) Externe - Bondoukou (Côte d'Ivoire)",
  company: "Lapaire",
  logoUrl:
    "https://media.licdn.com/dms/image/v2/D4D0BAQHqw7e1_4e3Bg/company-logo_100_100/company-logo_100_100/0/1685958701451/lapaire_logo?e=2147483647&v=beta&t=tYC52nYs5CqEetWab0aKRtAKBaPCT2seSEYTK7s97b0",
  location: "Bondoukou, Zanzan, Côte d'Ivoire",
  remote: false,
  jobType: "CDI",
  skills: ["Vente", "CRM", "Formation", "Service client", "Qualité", "Livraison", "Vue.js"],
  source: "LinkedIn",
  sector: "Commercial",
  diplomaRequired: "Bac+2",
  experience: "Une expérience en vente ou service client est appréciée",
  description:
    "Le poste se décompose en trois volets : développer les ventes en dehors de l'agence, assurer une bonne expérience client dès le seuil de l'agence et accompagner le client dans son parcours d'achat. Le rôle comprend la prospection terrain, le conseil sur les montures et les verres, le suivi jusqu'à la livraison, l'enregistrement des prospects et des ventes dans le CRM, ainsi que la participation à l'encaissement.",
};

const requirements = [
  "Bac+2 minimum en Gestion commerciale ou formation similaire.",
  "Une expérience en vente ou service client est fortement appréciée ; les débutants motivés sont les bienvenus.",
  "Être à l'aise avec les nouvelles technologies, les applications mobiles et les logiciels sur tablette.",
  "Savoir écouter, comprendre et reformuler le besoin du prospect pour proposer la solution adaptée.",
  "Enregistrer correctement les prospects et les ventes dans le logiciel CRM.",
  "Être dynamique, positif, très motivé, commercial dans l'âme et capable de travailler en équipe.",
  "Être ponctuel et garder une attitude accueillante avec les clients.",
];

const about =
  `${job.company} recrute dans le secteur ${job.sector.toLowerCase()} pour renforcer son équipe à ${job.location}. Cette offre est référencée sur ${job.source}. Le diplôme demandé est ${job.diplomaRequired} et le poste est proposé en ${job.jobType}.`;

const matching = {
  score: 86,
  reasons: [
    { label: "Compétences", value: "Vente · CRM · Service client" },
    { label: "Secteur", value: job.sector },
    { label: "Niveau", value: job.diplomaRequired },
    { label: "Expérience", value: "Vente ou service client" },
  ],
};

function StatusBar() {
  return (
    <div className="jobdetails-status" aria-hidden="true">
      <strong>9:41</strong>
      <div className="jobdetails-status-icons">
        <Signal size={14} strokeWidth={2.4} />
        <Wifi size={14} strokeWidth={2.4} />
        <BatteryFull size={17} strokeWidth={2.2} />
      </div>
    </div>
  );
}

function CompanyLogo() {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="jobdetails-company-logo" aria-label="Logo Google">
      {job.logoUrl && !hasError ? (
        <img src={job.logoUrl} alt={`Logo de ${job.company}`} onError={() => setHasError(true)} />
      ) : (
        <span className="jobdetails-logo-blue">{job.company.charAt(0)}</span>
      )}
    </div>
  );
}

function TabContent({ activeTab }: { activeTab: Tab }) {
  if (activeTab === "Description") {
    return <p className="jobdetails-copy">{job.description}</p>;
  }

  if (activeTab === "À propos") {
    return <p className="jobdetails-copy">{about}</p>;
  }

  return (
    <ul className="jobdetails-requirements">
      {requirements.map((requirement) => (
        <li key={requirement}>
          <span className="jobdetails-bullet" />
          <span>{requirement}</span>
        </li>
      ))}
    </ul>
  );
}

type JobDetailsProps = {
  onBack?: () => void;
};

export function JobDetails({ onBack }: JobDetailsProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>("Exigences");
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");

  const shareOffer = async () => {
    const shareUrl = `https://jobagogo.app/offres/${job.id}`;
    const shareData = {
      title: `${job.title} — ${job.company}`,
      text: `${job.title} chez ${job.company}, ${job.location}`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        setShareStatus("shared");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("copied");
      } else {
        setShareStatus("copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("copied");
    }

    window.setTimeout(() => setShareStatus("idle"), 2200);
  };

  return (
    <main className="jobdetails-stage">
      <section className="jobdetails-phone" aria-label={`Détails de l'offre ${job.title} chez ${job.company}`}>
        <header className="jobdetails-hero">
          <div className="jobdetails-pattern" aria-hidden="true" />
          <StatusBar />

          <div className="jobdetails-topbar">
             <button
               type="button"
               aria-label="Retour"
               className="jobdetails-icon-button"
               onClick={onBack}
             >
              <ChevronLeft size={25} strokeWidth={2.4} />
            </button>
            <div className="jobdetails-topbar-actions">
              {shareStatus !== "idle" ? (
                <span className="jobdetails-share-status" role="status">
                  {shareStatus === "shared" ? "Offre partagée" : "Lien copié"}
                </span>
              ) : null}
              <button
                type="button"
                aria-label="Partager cette offre"
                className={`jobdetails-icon-button ${shareStatus !== "idle" ? "is-shared" : ""}`}
                onClick={shareOffer}
              >
                <Share2 size={21} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label={saved ? "Retirer l'offre des sauvegardes" : "Sauvegarder l'offre"}
                aria-pressed={saved}
                className={`jobdetails-icon-button ${saved ? "is-saved" : ""}`}
                onClick={() => setSaved((current) => !current)}
              >
                <Bookmark size={22} fill={saved ? "currentColor" : "none"} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="jobdetails-hero-content">
            <CompanyLogo />
            <h1>{job.title}</h1>
            <p className="jobdetails-company">{job.company}</p>
            <div className="jobdetails-tags">
              <span>{job.sector}</span>
              <span>{job.jobType}</span>
              <span>{job.diplomaRequired}</span>
            </div>
            <div className="jobdetails-summary">
              <span><MapPin size={14} /> {job.location}</span>
            </div>
          </div>
        </header>

        <div className="jobdetails-tabs" role="tablist" aria-label="Informations sur l'offre">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "is-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="jobdetails-scroll">
          <div className="jobdetails-content">
            <section className="jobdetails-match-card" aria-label={`Matching de ${matching.score} pour cent`}>
              <div className="jobdetails-match-heading">
                <div>
                  <p className="jobdetails-match-kicker">Compatibilité avec votre profil</p>
                  <h2>Pourquoi cette offre vous correspond</h2>
                </div>
                <div className="jobdetails-match-score">
                  <strong>{matching.score}%</strong>
                  <span>match</span>
                </div>
              </div>
              <div className="jobdetails-match-reasons">
                {matching.reasons.map((reason) => (
                  <div className="jobdetails-match-reason" key={reason.label}>
                    <span className="jobdetails-match-check">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span>
                      <strong>{reason.label}</strong>
                      {reason.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <TabContent activeTab={activeTab} />
          </div>
        </div>

        <div className="jobdetails-apply-wrap">
          <button
            type="button"
            className={`jobdetails-apply ${applied ? "is-applied" : ""}`}
            onClick={() => setApplied(true)}
          >
            {applied ? <Check size={18} /> : null}
            {applied ? "Candidature envoyée" : "Postuler maintenant"}
          </button>
        </div>
        <div className="jobdetails-home-indicator" aria-hidden="true" />
      </section>
    </main>
  );
}

export default JobDetails;