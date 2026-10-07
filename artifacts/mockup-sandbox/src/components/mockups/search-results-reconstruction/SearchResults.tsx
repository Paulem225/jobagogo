import { useState } from "react";
import {
  BatteryFull,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  Filter,
  MapPin,
  SearchX,
  Signal,
  SlidersHorizontal,
  Wifi,
  X,
} from "lucide-react";
import "./_group.css";
import "./SearchResults.css";

type Job = {
  id: string;
  logo: string;
  logoClass: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  skills: string[];
  score: number;
};

const results: Job[] = [
  {
    id: "lapaire-673",
    logo: "L",
    logoClass: "is-lapaire",
    title: "Commercial (e) Externe",
    company: "Lapaire",
    location: "Bondoukou, Côte d'Ivoire",
    jobType: "CDI",
    skills: ["Vente", "CRM", "Service client"],
    score: 86,
  },
  {
    id: "agiloya-666",
    logo: "A",
    logoClass: "is-agiloya",
    title: "UN (1) COMMERCIAL - H/F",
    company: "AGILOYA AFRIQUE",
    location: "Abidjan, Côte d'Ivoire",
    jobType: "CDI",
    skills: ["Vente", "Communication", "Négociation"],
    score: 82,
  },
  {
    id: "xcmg-1355",
    logo: "X",
    logoClass: "is-xcmg",
    title: "Key Account Manager",
    company: "XCMG Group",
    location: "Abidjan, Côte d'Ivoire",
    jobType: "CDI",
    skills: ["Commercial", "Relation client"],
    score: 79,
  },
  {
    id: "sunda-1863",
    logo: "S",
    logoClass: "is-sunda",
    title: "GM Sales Specialist / Commercial vaisselle",
    company: "Sunda International",
    location: "Abidjan, Côte d'Ivoire",
    jobType: "CDI",
    skills: ["Vente", "Développement commercial"],
    score: 76,
  },
];

function StatusBar() {
  return (
    <div className="search-results-status" aria-hidden="true">
      <strong>9:41</strong>
      <div className="search-results-status-icons">
        <Signal size={15} strokeWidth={2.4} />
        <Wifi size={15} strokeWidth={2.4} />
        <BatteryFull size={18} strokeWidth={2.1} />
      </div>
    </div>
  );
}

function HomeIndicator() {
  return <div className="search-results-home-indicator" aria-hidden="true" />;
}

function SearchResultsHeader({
  query,
  count,
  onBack,
  onClear,
  onFilter,
  filterOpen,
}: {
  query: string;
  count: number;
  onBack: () => void;
  onClear: () => void;
  onFilter: () => void;
  filterOpen: boolean;
}) {
  return (
    <header className="search-results-header">
      <StatusBar />
      <div className="search-results-titlebar">
        <button type="button" onClick={onBack} aria-label="Retour">
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <h1>{query}</h1>
        <button type="button" onClick={onClear} aria-label="Effacer la recherche">
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
      <div className="search-results-divider" />
      <div className="search-results-toolbar">
        <p>{count} offres trouvées</p>
        <button
          type="button"
          aria-label="Filtrer les résultats"
          aria-pressed={filterOpen}
          className={filterOpen ? "is-filtered" : ""}
          onClick={onFilter}
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} />
        </button>
      </div>
      {filterOpen ? (
        <div className="search-results-filter-note" role="status">
          <Filter size={13} />
          Filtres prêts à être affinés
        </div>
      ) : null}
    </header>
  );
}

function JobRow({ job, onSelect }: { job: Job; onSelect?: (id: string) => void }) {
  return (
    <article
      className="search-results-job"
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(job.id)}
      onKeyDown={(event) => {
        if (onSelect && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect(job.id);
        }
      }}
    >
      <div className={`search-results-logo ${job.logoClass}`} aria-hidden="true">
        {job.logo}
      </div>
      <div className="search-results-job-main">
        <h2>{job.title}</h2>
        <p>{job.company}</p>
        <div className="search-results-job-location">
          <MapPin size={11} strokeWidth={2.2} />
          <span>{job.location}</span>
        </div>
        <div className="search-results-job-tags">
          <span>
            <BriefcaseBusiness size={10} strokeWidth={2.2} />
            {job.jobType}
          </span>
          <span>{job.skills.slice(0, 2).join(" · ")}</span>
        </div>
      </div>
      <div className="search-results-job-meta">
        <strong>{job.score}%</strong>
        <span>match</span>
        <div className="search-results-match-proof">
          <Check size={10} strokeWidth={3} />
          Profil ciblé
        </div>
      </div>
    </article>
  );
}

type SearchResultsProps = {
  initialQuery?: string;
  onBack?: () => void;
  onSelectJob?: (id: string) => void;
};

export function SearchResults({
  initialQuery = "Commercial",
  onBack,
  onSelectJob,
}: SearchResultsProps = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <main className="search-results-reconstruction">
      <section className="search-results-phone" aria-label={`Résultats de recherche pour ${query}`}>
        <SearchResultsHeader
          query={query}
          count={results.length}
           onBack={() => {
             setQuery(initialQuery);
             onBack?.();
           }}
          onClear={() => setQuery("")}
          onFilter={() => setFilterOpen((current) => !current)}
          filterOpen={filterOpen}
        />
        <div className="search-results-list">
          {query ? (
             results.map((job) => <JobRow key={job.id} job={job} onSelect={onSelectJob} />)
          ) : (
            <div className="search-results-empty">
              <SearchX size={22} />
              <strong>Aucune recherche active</strong>
              <span>Revenez en arrière pour choisir un poste.</span>
            </div>
          )}
        </div>
        <HomeIndicator />
      </section>
    </main>
  );
}

export default SearchResults;