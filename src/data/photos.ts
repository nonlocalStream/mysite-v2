import type { ImageMetadata } from "astro";

type Work = {
  title: string;
  meta: string;
  alt: string;
  src: ImageMetadata | null;
  section: WorkSectionId;
};

type WorkSectionId = "paintings" | "watercolor" | "digital";

type WorkSection = {
  id: WorkSectionId;
  label: string;
  meta: string;
  works: Work[];
};

const images = import.meta.glob<{ default: ImageMetadata }>(
  "../../art_porfolio/**/*.{jpg,jpeg,png,webp,avif}",
  { eager: true }
);

function titleFromPath(path: string) {
  const file = path.split("/").pop() ?? "";
  const name = file.replace(/\.(jpg|jpeg|png|webp|avif)$/i, "");
  return name
    .replace(/^\d+[-_ ]*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionFromPath(path: string): WorkSectionId {
  if (path.includes("/watercolor/")) return "watercolor";
  if (path.includes("/digital/") || path.includes("/physical_product/")) return "digital";
  return "paintings";
}

function metaFromPath(path: string) {
  if (path.includes("/watercolor/")) return "Watercolor";
  if (path.includes("/digital/")) return "Digital";
  if (path.includes("/physical_product/")) return "Object / design";
  return "Painting";
}

const generatedWorks: Work[] = Object.entries(images).map(([path, module]) => {
  const title = titleFromPath(path);
  return {
    title,
    meta: metaFromPath(path),
    alt: title,
    src: module.default,
    section: sectionFromPath(path)
  };
});

const sampleWorks: Work[] = [
  { title: "Torres del Paine, I", meta: "Oil on panel / 2024", alt: "Torres del Paine landscape painting", src: null, section: "paintings" },
  { title: "Dissolution Study", meta: "Watercolor / 2023", alt: "Watercolor dissolution study", src: null, section: "watercolor" },
  { title: "Slate Ground, III", meta: "Oil on slate / 2024", alt: "Oil painting on slate", src: null, section: "paintings" },
  { title: "Horizon", meta: "Digital / 2023", alt: "Digital horizon study", src: null, section: "digital" }
];

export const works = generatedWorks.length ? generatedWorks : sampleWorks;

export const workSections: WorkSection[] = [
  { id: "paintings", label: "Paintings", meta: "Oil / acrylic / canvas", works: works.filter((work) => work.section === "paintings") },
  { id: "watercolor", label: "Watercolor", meta: "Sketchbook / paper", works: works.filter((work) => work.section === "watercolor") },
  { id: "digital", label: "Digital & objects", meta: "Digital studies / products", works: works.filter((work) => work.section === "digital") }
].filter((section) => section.works.length);
