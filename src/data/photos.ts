import type { ImageMetadata } from "astro";

type Work = {
  title: string;
  meta: string;
  alt: string;
  src: ImageMetadata | null;
};

const images = import.meta.glob<{ default: ImageMetadata }>(
  "../../photos/*.{jpg,jpeg,png,webp,avif}",
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

const generatedWorks: Work[] = Object.entries(images).map(([path, module]) => {
  const title = titleFromPath(path);
  return {
    title,
    meta: "Artwork photo",
    alt: title,
    src: module.default
  };
});

const sampleWorks: Work[] = [
  { title: "Torres del Paine, I", meta: "Oil on panel / 2024", alt: "Torres del Paine landscape painting", src: null },
  { title: "Dissolution Study", meta: "Watercolor / 2023", alt: "Watercolor dissolution study", src: null },
  { title: "Slate Ground, III", meta: "Oil on slate / 2024", alt: "Oil painting on slate", src: null },
  { title: "Horizon", meta: "Acrylic / 2023", alt: "Acrylic horizon study", src: null }
];

export const works = generatedWorks.length ? generatedWorks : sampleWorks;
