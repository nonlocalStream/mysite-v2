import type { ImageMetadata } from "astro";

type Work = {
  title: string;
  meta: string;
  alt: string;
  src: ImageMetadata | null;
  section: WorkSectionId;
  size?: WorkSize;
  priority?: number;
};

type WorkSectionId = "paintings" | "watercolor" | "digital";
type WorkSize = "featured" | "tall";

type WorkOverride = {
  title?: string;
  meta?: string;
  hidden?: boolean;
  priority?: number;
  size?: WorkSize;
};

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

const workOverrides: Record<string, WorkOverride> = {
  "art_porfolio/digital/flamingo.png": { hidden: true },
  "art_porfolio/digital/flower_study.png": { hidden: true },
  "art_porfolio/paintings/bird_study.jpg": { title: "Bird of Paradise (Plein Air)" },
  "art_porfolio/paintings/blue_lake.jpg": { title: "Untitled (Plein Air)" },
  "art_porfolio/paintings/blue_surf.jpg": { title: "Poipu Beach (Plein Air)" },
  "art_porfolio/paintings/dad.jpg": { priority: 0, size: "featured" },
  "art_porfolio/paintings/grandpa.jpg": { priority: 1, size: "featured" },
  "art_porfolio/paintings/jellyfish.jpg": { priority: 2, size: "tall" },
  "art_porfolio/paintings/ocean_beach.jpg": { title: "Ocean Beach (Plein Air)" },
  "art_porfolio/paintings/pink_shore.jpg": { title: "Poipu Sunset (Plein Air)" },
  "art_porfolio/paintings/red_roofs.jpg": { title: "Presidio Heights (Plein Air)" },
  "art_porfolio/paintings/river_valley.jpg": { title: "Bear Lake (Plein Air)" },
  "art_porfolio/physical_product/group_shirts.jpg": { hidden: true },
  "art_porfolio/physical_product/shirt_design.png": { hidden: true },
  "art_porfolio/physical_product/turquoise_ring.jpg": { hidden: true },
  "art_porfolio/watercolor/beach_pair.jpg": { title: "California Beach (Plein Air)" },
  "art_porfolio/watercolor/bear_study.jpg": { hidden: true },
  "art_porfolio/watercolor/blue_harbor.jpg": { title: "Rincon Hill View" },
  "art_porfolio/watercolor/blue_pattern.jpg": { title: "Ocean Waves" },
  "art_porfolio/watercolor/capybara.jpg": { title: "Katmai Bear" },
  "art_porfolio/watercolor/city_view.jpg": { title: "Copenhagen" },
  "art_porfolio/watercolor/girl_portrait.jpg": { title: "Dora" },
  "art_porfolio/watercolor/gray_hills.jpg": { title: "South SF Hills" },
  "art_porfolio/watercolor/green_branches.jpg": { title: "Sneath Ln (Plein Air)" },
  "art_porfolio/watercolor/green_tree.jpg": { title: "Garden" },
  "art_porfolio/watercolor/ink_village.jpg": { title: "LiLi (Chinese Village)" },
  "art_porfolio/watercolor/inktober_crocodile.jpg": { title: "Crocodile" },
  "art_porfolio/watercolor/inktober_monkey.jpg": { title: "Monkey" },
  "art_porfolio/watercolor/inktober_tiger.jpg": { title: "Tiger" },
  "art_porfolio/watercolor/inktober_turtle.jpg": { title: "Turtle" },
  "art_porfolio/watercolor/night_tent.jpg": { title: "Glimmers II" },
  "art_porfolio/watercolor/open_sky.jpg": { title: "Ocean Beach" },
  "art_porfolio/watercolor/purple_figure.jpg": { title: "Cherry Blossom Tree" },
  "art_porfolio/watercolor/purple_notes.jpg": { title: "Quiet Night" },
  "art_porfolio/watercolor/rainy_road.jpg": { title: "Roadtrip" },
  "art_porfolio/watercolor/shrine.jpg": { title: "YanXi Church" },
  "art_porfolio/watercolor/street_steps.jpg": { title: "Crossroad" },
  "art_porfolio/watercolor/wave_study.jpg": { title: "Katmai" }
};

function keyFromPath(path: string) {
  return path.replace(/^.*?(art_porfolio\/)/, "$1");
}

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

const generatedWorks: Work[] = Object.entries(images)
  .flatMap(([path, module]) => {
    const override = workOverrides[keyFromPath(path)] ?? {};
    if (override.hidden) return [];

    const title = override.title ?? titleFromPath(path);
    const meta = override.meta ?? metaFromPath(path);
    return [{
      title,
      meta,
      alt: title,
      src: module.default,
      section: sectionFromPath(path),
      size: override.size,
      priority: override.priority
    }];
  })
  .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.title.localeCompare(b.title));

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
