/**
 * Lightweight keyword extraction from job descriptions.
 * No external AI required — runs locally with regex and curated lists.
 */

export const SKILL_KEYWORDS = [
  // Programming languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "PHP",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "Ruby",
  "Scala",
  "Langage R",
  "MATLAB",
  "SQL",
  "NoSQL",
  "HTML",
  "CSS",
  "Sass",
  "Bash",
  "PowerShell",
  // Frameworks & libraries
  "React",
  "React Native",
  "Node.js",
  "Angular",
  "Vue.js",
  "Next.js",
  "Laravel",
  "Symfony",
  "Django",
  "Flask",
  "Spring Boot",
  "Express",
  "FastAPI",
  "Flutter",
  "TensorFlow",
  "PyTorch",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "Spark",
  "Hadoop",
  "Kafka",
  // Tools & platforms
  "Git",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Linux",
  "Figma",
  "Adobe XD",
  "Photoshop",
  "Illustrator",
  "Jira",
  "Trello",
  "Notion",
  "Slack",
  "Excel",
  "Word",
  "PowerPoint",
  "SAP",
  "Salesforce",
  "HubSpot",
  "Google Analytics",
  "SEO",
  "WordPress",
  "Shopify",
  // Databases
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Oracle",
  "Elasticsearch",
  // Data & AI
  "Machine Learning",
  "Deep Learning",
  "NLP",
  "Computer Vision",
  "Data Science",
  "Data Engineering",
  "Data Analysis",
  "Business Intelligence",
  "ETL",
  "Big Data",
  // Mobile
  "iOS",
  "Android",
  "Xcode",
  "Android Studio",
  // Design
  "UX Design",
  "UI Design",
  "Design System",
  "Prototyping",
  "Wireframing",
  // Marketing & sales
  "Marketing Digital",
  "Social Media",
  "Content Marketing",
  "Email Marketing",
  "Copywriting",
  "Community Management",
  "Vente",
  "B2B",
  "B2C",
  "CRM",
  "Lead Generation",
  // Finance & admin
  "Comptabilité",
  "Finance",
  "Budget",
  "Trésorerie",
  "Audit",
  "Fiscalité",
  "OHADA",
  "Sage",
  "QuickBooks",
  "Paie",
  "Financement",
  "Financements structurés",
  "Modélisation financière",
  "Analyse financière",
  "Montage de dossiers de crédit",
  "Syndication",
  "Term Sheet",
  "Origination",
  // HR & management
  "Recrutement",
  "Formation",
  "Gestion de projet",
  "Agile",
  "Scrum",
  "Kanban",
  "Leadership",
  "Management",
  "Management d'équipe",
  // Languages
  "Anglais",
  "Français",
  "Espagnol",
  "Allemand",
  "Mandarin",
  // General domains
  "Gestion de projet",
  "Gestion de crise",
  "Service client",
  "Logistique",
  "Supply Chain",
  "Achats",
  "Qualité",
  "Maintenance",
  "Sécurité",
  "Hygiène",
  "Santé",
  "Éducation",
  "Enseignement",
  "Rédaction",
  "Traduction",
  "Interprétation",
  "Médiation",
  "Conduite",
  "Livraison",
  "Manutention",
];

const DIPLOMA_KEYWORDS = [
  "Bac",
  "Bac+1",
  "Bac+2",
  "Bac+3",
  "Bac+4",
  "Bac+5",
  "BTS",
  "DUT",
  "Licence",
  "Master",
  "Doctorat",
  "PhD",
  "MBA",
  "CAP",
  "BEPC",
  "Diplôme d'ingénieur",
  "École de commerce",
  "Grande école",
];

const SOFT_SKILLS_KEYWORDS = [
  "Rigueur",
  "Organisation",
  "Autonomie",
  "Proactivité",
  "Communication",
  "Travail en équipe",
  "Esprit d'équipe",
  "Leadership",
  "Créativité",
  "Innovation",
  "Adaptabilité",
  "Résistance au stress",
  "Négociation",
  "Relationnel",
  "Sens du service",
  "Orientation client",
  "Orientation résultats",
  "Analyse",
  "Synthèse",
  "Résolution de problèmes",
  "Prise de décision",
];

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9+\s]/g, " ");
}

/**
 * Extract skills from a job description, merging with existing explicit skills.
 */
export function extractSkillsFromDescription(
  description: string,
  existingSkills: string[] = []
): string[] {
  const normalizedDesc = normalizeForMatch(description);
  // Tokenize to avoid short-skill false positives (e.g. "R" inside "Responsable")
  const descTokens = normalizedDesc.split(/\s+/).filter(Boolean);

  const found = new Set(
    existingSkills
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s !== "R") // drop single-letter leftovers
  );

  for (const skill of SKILL_KEYWORDS) {
    const normalizedSkill = normalizeForMatch(skill);
    const skillTokens = normalizedSkill.split(/\s+/).filter(Boolean);

    // Phrase match (e.g. "react native")
    let phraseFound = false;
    for (let i = 0; i <= descTokens.length - skillTokens.length; i++) {
      const slice = descTokens.slice(i, i + skillTokens.length);
      if (slice.join(" ") === normalizedSkill) {
        phraseFound = true;
        break;
      }
      // Allow c++ tokenization: c++ becomes "c" in normalizeForMatch, so compare
      if (skillTokens.length === 1 && slice[0] === normalizedSkill) {
        phraseFound = true;
        break;
      }
    }
    if (!phraseFound) {
      // Fallback: whole word/phrase regex for skills with punctuation like "node.js"
      const pattern = new RegExp(
        `(?:^|[\\s,/()])${normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,/()])`,
        "i"
      );
      if (pattern.test(normalizedDesc)) phraseFound = true;
    }

    if (phraseFound) {
      found.add(skill);
    }
  }

  return Array.from(found);
}

/**
 * Extract diploma level from description if not already set.
 */
export function extractDiplomaFromDescription(description: string): string | null {
  const normalizedDesc = normalizeForMatch(description);

  // Look for "Bac+5", "Bac + 5", etc.
  const bacPlusMatch = normalizedDesc.match(/bac\s*\+\s*(\d)/i);
  if (bacPlusMatch) return `Bac+${bacPlusMatch[1]}`;

  // Look for explicit diploma keywords
  for (const diploma of DIPLOMA_KEYWORDS) {
    const normalized = normalizeForMatch(diploma);
    const pattern = new RegExp(
      `(?:^|[\\s,/()])${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,/()])`,
      "i"
    );
    if (pattern.test(normalizedDesc)) return diploma;
  }

  return null;
}

/**
 * Extract minimum required years of experience from description.
 * Supports: "minimum 3 ans", "au moins 2 ans", "5 ans d'expérience", etc.
 */
export function extractExperienceYearsFromDescription(description: string): number | null {
  const normalizedDesc = normalizeForMatch(description);

  const patterns = [
    /(?:minimum|min|au moins|at least|plus de|plus que)\s*(\d+)\s*ans?/i,
    /(\d+)\s*ans?\s*(?:minimum|min|au moins|d['\s]exp[eé]rience|d['\s]exp)/i,
    /exp[eé]rience\s*(?:de|d['\s])?\s*(\d+)\s*ans?/i,
    /(\d+)\s*\+?\s*ans?\s*d['\s]exp[eé]rience/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedDesc.match(pattern);
    if (match) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years >= 0 && years <= 40) return years;
    }
  }

  return null;
}

/**
 * Enrich a job's fields using its description.
 */
export function enrichJobFromDescription(job: {
  description: string;
  skills: string[];
  experienceYears?: number | null;
  diplomaRequired?: string | null;
}): {
  skills: string[];
  experienceYears: number | null;
  diplomaRequired: string | null;
} {
  return {
    skills: extractSkillsFromDescription(job.description, job.skills),
    experienceYears:
      job.experienceYears ?? extractExperienceYearsFromDescription(job.description),
    diplomaRequired:
      job.diplomaRequired ?? extractDiplomaFromDescription(job.description),
  };
}
