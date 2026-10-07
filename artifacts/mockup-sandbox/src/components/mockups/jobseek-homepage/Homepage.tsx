import { useRef, useState } from "react";
import {
  BatteryFull,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clock3,
  Home,
  MapPin,
  Search,
  Signal,
  UserRound,
  Wifi,
} from "lucide-react";
import "./Homepage.css";

type FeaturedJob = {
  id: string;
  company: string;
  title: string;
  fitScore: number;
  location: string;
  tags: string[];
  logo: string;
  tone: "blue" | "yellow" | "green";
};

const featuredJobs: FeaturedJob[] = [
  {
    id: "responsable-commercial",
    company: "Nawara Projects",
    title: "Responsable commercial",
    fitScore: 86,
    location: "Abidjan",
    tags: ["Vente", "CDI", "Abidjan"],
    logo: "N",
    tone: "blue",
  },
  {
    id: "country-manager",
    company: "Fleeti",
    title: "Country Manager",
    fitScore: 82,
    location: "Abidjan",
    tags: ["Stratégie", "CDI", "Abidjan"],
    logo: "F",
    tone: "yellow",
  },
  {
    id: "sales-executive",
    company: "Romeu",
    title: "Sales Executive",
    fitScore: 78,
    location: "Abidjan · Remote",
    tags: ["Commercial", "CDI", "Remote"],
    logo: "R",
    tone: "green",
  },
];

type OpportunityJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  jobType: string;
  skills: string[];
  fitScore: number;
  date: string;
  period: "Aujourd'hui" | "Hier" | "Cette semaine";
};

const opportunityJobs: OpportunityJob[] = [
  {
    id: "wave-client",
    company: "Wave Côte d'Ivoire",
    title: "Chargé de clientèle — Abidjan",
    location: "Abidjan",
    remote: false,
    jobType: "CDI",
    skills: ["Service client", "Vente", "Français"],
    fitScore: 86,
    date: "Aujourd'hui",
    period: "Aujourd'hui",
  },
  {
    id: "mtn-commercial",
    company: "MTN Côte d'Ivoire",
    title: "Commercial terrain B2B",
    location: "Abidjan",
    remote: false,
    jobType: "CDD",
    skills: ["Prospection", "CRM", "Négociation"],
    fitScore: 74,
    date: "Il y a 1 jour",
    period: "Hier",
  },
  {
    id: "orange-assistant",
    company: "Orange CI",
    title: "Assistant administratif et commercial",
    location: "Bouaké",
    remote: true,
    jobType: "CDI",
    skills: ["Excel", "Organisation", "Reporting"],
    fitScore: 68,
    date: "Il y a 3 jours",
    period: "Cette semaine",
  },
  {
    id: "jumia-sales",
    company: "Jumia",
    title: "Responsable des ventes régional",
    location: "Yamoussoukro",
    remote: false,
    jobType: "CDI",
    skills: ["Management", "Vente", "Leadership"],
    fitScore: 61,
    date: "Il y a 5 jours",
    period: "Cette semaine",
  },
];

const opportunityPeriods: OpportunityJob["period"][] = ["Aujourd'hui", "Hier", "Cette semaine"];
const userName = "Aïcha";

type SearchSuggestion = {
  id: string;
  title: string;
  company: string;
  location: string;
  fitScore: number;
};

const searchableJobs: SearchSuggestion[] = [
  ...featuredJobs.map(({ id, title, company, location, fitScore }) => ({ id, title, company, location, fitScore })),
  ...opportunityJobs.map(({ id, title, company, location, fitScore }) => ({ id, title, company, location, fitScore })),
].filter((job, index, jobs) => jobs.findIndex((candidate) => candidate.id === job.id) === index);

type HomepageProps = {
  onSearch?: (query: string) => void;
};

export function Homepage({ onSearch }: HomepageProps = {}) {
  const [query, setQuery] = useState("");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(["Product Designer", "Commercial terrain"]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const featuredListRef = useRef<HTMLDivElement>(null);

  const toggleSaved = (id: string) => {
    setSavedJobs((current) =>
      current.includes(id) ? current.filter((jobId) => jobId !== id) : [...current, id],
    );
  };

  const rememberSearch = (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    setSearchHistory((current) => [
      normalizedValue,
      ...current.filter((item) => item.toLowerCase() !== normalizedValue.toLowerCase()),
    ].slice(0, 4));
  };

  const selectSearch = (value: string) => {
    setQuery(value);
    rememberSearch(value);
    setSearchFocused(false);
  };

  const visibleFeaturedJobs = featuredJobs.filter((job) =>
    `${job.title} ${job.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  const trimmedQuery = query.trim().toLowerCase();
  const searchSuggestions = trimmedQuery.length >= 3
    ? searchableJobs.filter((job) =>
      `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(trimmedQuery),
    ).slice(0, 4)
    : [];
  const showSearchPanel = searchFocused && (
    (trimmedQuery.length === 0 && searchHistory.length > 0) || trimmedQuery.length >= 3
  );

  const handleFeaturedScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const cardStep = 320 + 16;
    const nextIndex = Math.round(event.currentTarget.scrollLeft / cardStep);
    setActiveFeaturedIndex(Math.max(0, Math.min(nextIndex, featuredJobs.length - 1)));
  };

  const scrollToFeatured = (index: number) => {
    featuredListRef.current?.scrollTo({ left: index * (320 + 16), behavior: "smooth" });
    setActiveFeaturedIndex(index);
  };

  return (
    <main className="jobseek-stage">
      <section className="jobseek-phone" aria-label="Jobseek home screen">
        <div className="jobseek-status">
          <span>9:41</span>
          <div className="jobseek-status-icons" aria-label="Device status">
            <Signal size={16} strokeWidth={2.4} />
            <Wifi size={16} strokeWidth={2.4} />
            <BatteryFull size={18} strokeWidth={2} />
          </div>
        </div>

        <div className="jobseek-scroll">
          <header className="jobseek-header">
            <div>
              <p className="jobseek-eyebrow">Bienvenue chez Jobagogo !</p>
              <h1 className="jobseek-title">Bonjour, {userName} !</h1>
            </div>
            <button className="jobseek-profile" type="button" aria-label="Open profile">
              <UserRound size={22} strokeWidth={2.4} />
            </button>
          </header>

          <div className="jobseek-search-area">
            <div className="jobseek-search-row">
              <label className={`jobseek-search ${searchFocused ? "is-focused" : ""}`}>
                <Search size={18} color="#95969d" strokeWidth={2.2} />
                <input
                  aria-label="Rechercher un métier ou un poste"
                  aria-expanded={showSearchPanel}
                  aria-controls="jobseek-search-panel"
                  placeholder="Quel poste recherchez-vous ?"
                  value={query}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && query.trim().length >= 3) {
                      rememberSearch(query);
                      setSearchFocused(false);
                      onSearch?.(query.trim());
                    }
                  }}
                />
              </label>
            </div>

            {showSearchPanel && (
              <div className="jobseek-search-panel" id="jobseek-search-panel">
                {trimmedQuery.length === 0 ? (
                  <>
                    <div className="jobseek-search-panel-heading">
                      <span>Recherches récentes</span>
                      <span>{searchHistory.length}</span>
                    </div>
                    <div className="jobseek-search-history">
                      {searchHistory.map((item) => (
                        <button
                          className="jobseek-search-history-item"
                          type="button"
                          key={item}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSearch(item)}
                        >
                          <Clock3 size={15} />
                          <span>{item}</span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="jobseek-search-panel-heading">
                      <span>Résultats pour « {query.trim()} »</span>
                      <span>{searchSuggestions.length}</span>
                    </div>
                    <div className="jobseek-search-results">
                      {searchSuggestions.length > 0 ? searchSuggestions.map((job) => (
                        <button
                          className="jobseek-search-result"
                          type="button"
                          key={job.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSearch(job.title)}
                        >
                          <span className="jobseek-search-result-logo">{job.company.charAt(0)}</span>
                          <span className="jobseek-search-result-copy">
                            <strong>{job.title}</strong>
                            <small>{job.company} · {job.location}</small>
                          </span>
                          <span className="jobseek-search-result-score">{job.fitScore}%</span>
                        </button>
                      )) : (
                        <p className="jobseek-search-empty">Aucune offre ne correspond encore à cette recherche.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <section className="jobseek-section">
            <div className="jobseek-section-heading">
              <h2>Votre meilleur match</h2>
            </div>
            <div
              className="jobseek-featured-list"
              ref={featuredListRef}
              onScroll={handleFeaturedScroll}
              aria-label="Offres correspondantes"
            >
              {(visibleFeaturedJobs.length ? visibleFeaturedJobs : featuredJobs).map((job) => {
                const isSaved = savedJobs.includes(job.id);
                return (
                  <article className={`jobseek-featured-card jobseek-${job.tone}`} key={job.id}>
                    <div className="jobseek-card-top">
                      <div className={`jobseek-company-logo ${job.tone === "yellow" ? "google" : job.tone === "green" ? "green" : ""}`}>
                        {job.logo}
                      </div>
                      <div className="jobseek-card-actions">
                        <div className="jobseek-match-badge" aria-label={`${job.fitScore}% matching`}>
                          <strong>{job.fitScore}%</strong>
                          <span>MATCH</span>
                        </div>
                        <button
                          className={`jobseek-bookmark ${isSaved ? "is-saved" : ""}`}
                          type="button"
                          aria-label={`${isSaved ? "Remove" : "Save"} ${job.title}`}
                          aria-pressed={isSaved}
                          onClick={() => toggleSaved(job.id)}
                        >
                          <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div className="jobseek-card-copy">
                      <h3>{job.title}</h3>
                      <p>{job.company}</p>
                    </div>
                    <div className="jobseek-tags">
                      {job.tags.map((tag) => <span className="jobseek-tag" key={tag}>{tag}</span>)}
                    </div>
                    <div className="jobseek-card-meta">
                      <span><MapPin size={13} /> {job.location}</span>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="jobseek-scroll-hint" aria-label="Faire défiler les offres">
              <div className="jobseek-scroll-dots">
                {featuredJobs.map((job, index) => (
                  <button
                    className={`jobseek-scroll-dot ${activeFeaturedIndex === index ? "is-active" : ""}`}
                    key={job.id}
                    type="button"
                    aria-label={`Afficher l'offre ${index + 1}`}
                    aria-current={activeFeaturedIndex === index ? "true" : undefined}
                    onClick={() => scrollToFeatured(index)}
                  />
                ))}
              </div>
              <span>Glissez pour découvrir</span>
            </div>
          </section>

          <section className="jobseek-opportunities">
            <div className="jobseek-section-heading">
              <h2>Fil des opportunités</h2>
              <span className="jobseek-opportunity-count">{opportunityJobs.length} offres</span>
            </div>
            <div className="jobseek-opportunity-timeline">
              {opportunityPeriods.map((period) => {
                const periodJobs = opportunityJobs.filter((job) => job.period === period);
                if (periodJobs.length === 0) return null;

                return (
                  <section className="jobseek-opportunity-period" key={period} aria-label={`Offres ${period.toLowerCase()}`}>
                    <div className="jobseek-period-heading">
                      <span className="jobseek-period-label">
                        <span className="jobseek-period-dot" />
                        {period}
                      </span>
                    </div>
                    <div className="jobseek-period-list">
                      {periodJobs.map((job) => {
                        const isSaved = savedJobs.includes(job.id);
                        return (
                          <article className="jobseek-opportunity-row" key={job.id}>
                            <div className="jobseek-opportunity-mark border-t-[0px] border-r-[0px] border-b-[0px] border-l-[0px] rounded-tl-[50px] rounded-tr-[50px] rounded-br-[50px] rounded-bl-[50px] text-xl font-extrabold">{job.company.charAt(0)}</div>
                            <div className="jobseek-opportunity-copy">
                              <p>
                                {job.company} <strong>· {job.fitScore}%</strong>
                              </p>
                              <h3>{job.title}</h3>
                              <div className="jobseek-opportunity-meta">
                                <span>{job.location}{job.remote ? " · Remote" : ""} · {job.jobType}</span>
                                <span><CalendarDays size={11} /> {job.date}</span>
                              </div>
                              <div className="jobseek-opportunity-skills">
                                {job.skills.slice(0, 2).map((skill) => (
                                  <span key={skill}>{skill}</span>
                                ))}
                                {job.skills.length > 2 && <em>+{job.skills.length - 2}</em>}
                              </div>
                            </div>
                            <button
                              className={`jobseek-row-save ${isSaved ? "is-saved" : ""}`}
                              type="button"
                              aria-label={`${isSaved ? "Retirer" : "Sauvegarder"} ${job.title}`}
                              aria-pressed={isSaved}
                              onClick={() => toggleSaved(job.id)}
                            >
                              <Bookmark size={17} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                            <ChevronRight className="jobseek-row-chevron" size={17} />
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </div>

        <nav className="jobseek-bottom-nav" aria-label="Main navigation">
          <div className="jobseek-nav-items">
            <button className={`jobseek-nav-button ${activeNav === "home" ? "active" : ""}`} type="button" onClick={() => setActiveNav("home")} aria-label="Home">
              <Home size={22} fill={activeNav === "home" ? "currentColor" : "none"} strokeWidth={activeNav === "home" ? 0 : 2} />
              {activeNav === "home" && <span className="jobseek-nav-dot" />}
            </button>
            <button className={`jobseek-nav-button ${activeNav === "search" ? "active" : ""}`} type="button" onClick={() => setActiveNav("search")} aria-label="Search">
              <Search size={22} strokeWidth={2} />
              {activeNav === "search" && <span className="jobseek-nav-dot" />}
            </button>
            <button className={`jobseek-nav-button ${activeNav === "saved" ? "active" : ""}`} type="button" onClick={() => setActiveNav("saved")} aria-label="Saved jobs">
              <Bookmark size={22} fill={activeNav === "saved" ? "currentColor" : "none"} strokeWidth={2} />
              {activeNav === "saved" && <span className="jobseek-nav-dot" />}
            </button>
            <button className={`jobseek-nav-button ${activeNav === "profile" ? "active" : ""}`} type="button" onClick={() => setActiveNav("profile")} aria-label="Profile">
              <UserRound size={20} strokeWidth={2} />
              {activeNav === "profile" && <span className="jobseek-nav-dot" />}
            </button>
          </div>
          <div className="jobseek-home-indicator" />
        </nav>
      </section>
    </main>
  );
}

export default Homepage;