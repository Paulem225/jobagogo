import { useState, type ReactNode } from "react";
import {
  BatteryFull,
  Bookmark,
  ChevronLeft,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Signal,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import "./_group.css";

type Screen = "home" | "search" | "results" | "details";
type Job = {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  logo: ReactNode;
  logoClass: string;
  tags?: string[];
};

const featuredJobs: Job[] = [
  {
    id: "software-engineer",
    logo: <span className="facebook-logo">f</span>,
    logoClass: "blue",
    title: "Software Engineer",
    company: "Facebook",
    tags: ["IT", "Full-Time", "Junior"],
    salary: "$180,00/year",
    location: "California, USA",
  },
  {
    id: "fullstack-developer",
    logo: <span className="google-logo">G</span>,
    logoClass: "yellow",
    title: "Full-Stack Developer",
    company: "Google",
    tags: ["Design", "Full-Time", "Junior"],
    salary: "$160,00/year",
    location: "Texas",
  },
];

const popularJobs: Job[] = [
  {
    id: "jr-executive",
    logo: "🍔",
    logoClass: "logo-orange",
    title: "Jr Executive",
    company: "Burger King",
    salary: "$96,000/y",
    location: "Los Angels, US",
  },
  {
    id: "product-manager",
    logo: "🎧",
    logoClass: "logo-pink",
    title: "Product Manager",
    company: "Beats",
    salary: "$84,000/y",
    location: "Florida, US",
  },
];

const searchResults: Job[] = [
  popularJobs[0],
  popularJobs[1],
  {
    id: "fiat",
    logo: "FIAT",
    logoClass: "logo-blue",
    title: "UX Designer L3",
    company: "Fiat",
    salary: "$84,000/y",
    location: "Florida, US",
  },
  {
    id: "starbucks",
    logo: "★",
    logoClass: "logo-green",
    title: "UX Designer",
    company: "Star Bucks",
    salary: "$84,000/y",
    location: "Florida, US",
  },
  {
    id: "booking",
    logo: "B.",
    logoClass: "logo-booking",
    title: "UX Designer L5",
    company: "Booking.com",
    salary: "$84,000/y",
    location: "Florida, US",
  },
  {
    id: "wordpress",
    logo: "W",
    logoClass: "logo-blue",
    title: "UX Designer",
    company: "Wordpress",
    salary: "$84,000/y",
    location: "Florida, US",
  },
];

const popularRoles = [
  "Designer",
  "Administrate",
  "NGO",
  "Manager",
  "Management",
  "IT",
  "Marketing",
  "Developer",
  "SEO",
];

const suggestions = [
  "UX Design",
  "UX Designer",
  "UX Design Lead",
  "UX Developer",
  "UX Design Director",
  "UX Design Researcher",
  "UX Developer Lead",
  "UX Researcher",
  "UX Testing",
  "Product Designer",
  "Product Manager",
  "Software Engineer",
  "Full-Stack Developer",
  "Marketing Manager",
  "SEO Specialist",
];

const requirements = [
  "Master's degree in Design, Computer Science, Computer Interaction, or a related field.",
  "3 years of relevant industry experience.",
  "Ability to lead and ideate products from scratch and improve features, all with a user-centered design process.",
  "Skills in communicating and influencing product design strategy.",
  "Excellent problem-solving skills and familiarity with technical constraints and limitations.",
  "Experience designing across multiple platform.",
  "Portfolio highlighting multiple projects.",
];

function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className="status-bar" style={light ? { color: "white" } : undefined}>
      <span>9:41</span>
      <div className="status-icons">
        <Signal size={16} strokeWidth={2.4} />
        <Wifi size={16} strokeWidth={2.4} />
        <BatteryFull size={18} strokeWidth={2} />
      </div>
    </div>
  );
}

function HomeIndicator() {
  return <div className="home-indicator" />;
}

function PopularRow({ job, onClick }: { job: Job; onClick?: () => void }) {
  return (
    <button type="button" className="popular-row" onClick={onClick}>
      <span className={`popular-logo ${job.logoClass}`}>{job.logo}</span>
      <span className="popular-copy">
        <strong>{job.title}</strong>
        <span>{job.company}</span>
      </span>
      <span className="popular-meta">
        <strong>{job.salary}</strong>
        <span>{job.location}</span>
      </span>
    </button>
  );
}

function FeaturedCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button type="button" className={`featured-card ${job.logoClass}`} onClick={onClick}>
      <span className="dot-pattern" />
      <span className="featured-top">
        <span className="company-logo">{job.logo}</span>
        <span className="bookmark-button">
          <Bookmark size={19} strokeWidth={2} />
        </span>
      </span>
      <span className="featured-copy">
        <h3>{job.title}</h3>
        <p>{job.company}</p>
      </span>
      <span className="featured-tags">
        {job.tags?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </span>
      <span className="featured-footer">
        <span>{job.salary}</span>
        <span>{job.location}</span>
      </span>
    </button>
  );
}

function BottomNav({ onHome }: { onHome: () => void }) {
  return (
    <nav className="bottom-nav">
      <button type="button" className="active" onClick={onHome}>
        <Home />
        Home
      </button>
      <button type="button">
        <Bookmark />
        Saved
      </button>
      <button type="button">
        <UserRound />
        Profile
      </button>
    </nav>
  );
}

function HomeScreen({ onSearch, onDetails }: { onSearch: () => void; onDetails: (job: Job) => void }) {
  return (
    <div className="home-screen">
      <StatusBar />
      <div className="screen-scroll">
        <header className="home-header">
          <div>
            <p className="eyebrow">Welcome to Jobseek!</p>
            <h1 className="page-title">Discover Jobs 🔥</h1>
          </div>
          <div className="profile-mark">
            <div className="profile-avatar">🧑</div>
            <span className="notification-dot" />
          </div>
        </header>

        <div className="search-bar">
          <button type="button" className="search-box" onClick={onSearch}>
            <Search size={18} strokeWidth={2.2} />
            <span>Search a job or position</span>
          </button>
          <button type="button" className="filter-button" onClick={onSearch} aria-label="Filter">
            <SlidersHorizontal size={18} strokeWidth={2.2} />
          </button>
        </div>

        <section className="section">
          <div className="section-heading">
            <h2>Featured Jobs</h2>
            <button type="button">See all</button>
          </div>
          <div className="featured-list">
            {featuredJobs.map((job) => <FeaturedCard key={job.id} job={job} onClick={() => onDetails(job)} />)}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>Popular Jobs</h2>
            <button type="button">See all</button>
          </div>
          <div className="popular-list">
            {popularJobs.map((job) => <PopularRow key={job.id} job={job} onClick={() => onDetails(job)} />)}
          </div>
        </section>
      </div>
      <BottomNav onHome={() => undefined} />
    </div>
  );
}

function SuggestionList({ query, onSelect }: { query: string; onSelect: (value: string) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const matches = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(normalizedQuery),
  );

  if (matches.length === 0) {
    return (
      <div className="suggestions-empty">
        <p>No matching suggestions</p>
      </div>
    );
  }

  return (
    <div className="suggestions-list">
      {matches.map((suggestion) => {
        const matchStart = suggestion.toLowerCase().indexOf(normalizedQuery);
        const before = suggestion.slice(0, matchStart);
        const matched = suggestion.slice(matchStart, matchStart + query.trim().length);
        const after = suggestion.slice(matchStart + query.trim().length);

        return (
          <button type="button" className="suggestion-button" key={suggestion} onClick={() => onSelect(suggestion)}>
            <span className="suggestion-muted">{before}</span>
            <span className="suggestion-muted">{matched}</span>
            <span className="suggestion-bright">{after}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchScreen({
  onClose,
  onSearch,
  showSuggestions = false,
}: {
  onClose: () => void;
  onSearch: (query: string) => void;
  showSuggestions?: boolean;
}) {
  const [value, setValue] = useState("");
  const isTyping = value.trim().length > 0;

  return (
    <div className="search-screen">
      <StatusBar light />
      <div className="search-header">
        <button type="button" onClick={onClose} aria-label="Close search"><X size={22} /></button>
        <h2>Search</h2>
        <span style={{ width: 30 }} />
      </div>
      <form
        className="search-input-wrap"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSearch(value.trim());
        }}
      >
        <Search size={20} />
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search a job or position"
        />
      </form>
      {showSuggestions && isTyping ? (
        <div className="suggestions-scroll">
          <SuggestionList query={value} onSelect={onSearch} />
        </div>
      ) : (
        <>
          <div className="dark-section">
            <h2>Recent Searches</h2>
            <p>You don't have any search history</p>
          </div>
          <div className="dark-section" style={{ marginTop: 30 }}>
            <h2>Popular Roles</h2>
            <div className="role-list">
              {popularRoles.map((role) => (
                <button type="button" className="role-chip" key={role} onClick={() => onSearch(role)}>
                  {role}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResultsScreen({ query, onBack, onDetails }: { query: string; onBack: () => void; onDetails: (job: Job) => void }) {
  return (
    <div className="results-screen">
      <StatusBar />
      <div className="results-header">
        <button type="button" onClick={onBack} aria-label="Back"><ChevronLeft size={24} /></button>
        <h2>Search Results</h2>
        <button type="button" onClick={onBack} aria-label="Clear search"><X size={20} /></button>
      </div>
      <div className="results-query">
        <Search size={17} />
        <span>{query}</span>
      </div>
      <div className="results-count">
        <span>{searchResults.length + 286} Jobs Found</span>
        <SlidersHorizontal size={17} />
      </div>
      <div className="screen-scroll results-list">
        {searchResults.map((job) => <PopularRow key={job.id} job={job} onClick={() => onDetails(job)} />)}
      </div>
      <HomeIndicator />
    </div>
  );
}

function DetailsScreen({ job, onBack }: { job: Job; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("Requirement");

  return (
    <div className="details-screen">
      <div className="details-hero">
        <span className="dot-pattern" />
        <StatusBar light />
        <div className="hero-nav">
          <button type="button" onClick={onBack} aria-label="Back"><ChevronLeft size={24} /></button>
          <button type="button" aria-label="Bookmark"><Bookmark size={22} /></button>
        </div>
        <div className="hero-copy">
          <div className="hero-logo">{job.logo}</div>
          <h1>{job.title}</h1>
          <p>{job.company}</p>
          <div className="hero-tags">
            {(job.tags ?? ["Design", "Full-Time", "Junior"]).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="hero-meta">
            <span>{job.salary}</span>
            <span>{job.location}</span>
          </div>
        </div>
      </div>
      <div className="tabs">
        {["Description", "Requirement", "About", "Reviews"].map((tab) => (
          <button type="button" className={tab === activeTab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="details-copy">
        {activeTab === "Requirement" && (
          <ul className="requirement-list">
            {requirements.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        {activeTab === "Description" && (
          <p>We're looking for a Product Designer to join our team and help shape the future of how people find their next job. You'll work closely with engineering, research and product to design end-to-end experiences that are simple, accessible and delightful.</p>
        )}
        {activeTab === "About" && (
          <p>Google builds products and platforms used by billions of people around the world. Our design team values craft, curiosity and collaboration.</p>
        )}
        {activeTab === "Reviews" && (
          <>
            <div className="review-card">
              <div className="review-head"><strong>Amara O.</strong><span>★★★★★</span></div>
              <div className="review-role">Product Designer, ex-employee</div>
              <p className="review-text">Great mentorship and a real focus on craft. Highly recommend.</p>
            </div>
            <div className="review-card">
              <div className="review-head"><strong>Diego R.</strong><span>★★★★☆</span></div>
              <div className="review-role">Senior Designer</div>
              <p className="review-text">Fast-paced but the team is supportive and the projects are meaningful.</p>
            </div>
          </>
        )}
      </div>
      <div className="apply-wrap"><button type="button" className="apply-button">Apply Now</button></div>
      <HomeIndicator />
    </div>
  );
}

export function UploadedDesign({ showSuggestions = false }: { showSuggestions?: boolean } = {}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("UX Designer");
  const [selectedJob, setSelectedJob] = useState<Job>(featuredJobs[1]);

  return (
    <div className="uploaded-design-root">
      <main className="phone">
        {screen === "home" && (
          <HomeScreen
            onSearch={() => setScreen("search")}
            onDetails={(job) => {
              setSelectedJob(job);
              setScreen("details");
            }}
          />
        )}
        {screen === "search" && (
          <SearchScreen
            onClose={() => setScreen("home")}
            showSuggestions={showSuggestions}
            onSearch={(nextQuery) => {
              setQuery(nextQuery);
              setScreen("results");
            }}
          />
        )}
        {screen === "results" && (
          <ResultsScreen
            query={query}
            onBack={() => setScreen("search")}
            onDetails={(job) => {
              setSelectedJob(job);
              setScreen("details");
            }}
          />
        )}
        {screen === "details" && <DetailsScreen job={selectedJob} onBack={() => setScreen("home")} />}
      </main>
    </div>
  );
}