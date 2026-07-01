// Single source of truth for site-wide constants.
export const SITE = {
  name: "Kyle J. Card",
  fullName: "Kyle J. Card, Ph.D.",
  title: "HHMI Hanna H. Gray Postdoctoral Fellow",
  org: "Cleveland Clinic Research",
  dept: "Department of Genomic Sciences and Systems Biology",
  address: "2111 E. 96th Street NE6, Cleveland, OH 44106",
  email: "cardkyle1@gmail.com",
  url: "https://www.kylejcard.com",
  tagline: "Predict. Control. Cure.",
  thesis:
    "Exploring the genetic and ecological factors driving antibiotic resistance — and pioneering new technologies to design effective, evolution-inspired therapeutic strategies.",
  description:
    "Kyle J. Card, Ph.D. — evolutionary biologist studying the predictability and control of antibiotic resistance, and the future Card Lab's Evolution-on-a-Chip program.",
} as const;

// The downloadable CV — drop a new PDF in public/cv/ and bump this one constant.
export const CV_PDF = "/cv/Card_062726.pdf";

export const LINKS = {
  scholar: "https://scholar.google.com/citations?user=pi1TWfMAAAAJ&hl=en",
  cvPdf: CV_PDF,
};

// Minimal nav — the homepage is one continuous walk, so nav is utility only.
export const NAV = [
  { label: "CV", href: "/cv" },
  { label: "Publications", href: "/publications" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const AFFILIATIONS = [
  { name: "Cleveland Clinic", logo: "logo-ccf.png" },
  { name: "Howard Hughes Medical Institute", logo: "hhmi.png" },
];
