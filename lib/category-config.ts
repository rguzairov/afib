import { type AddPageCopy } from "@/components/features/disease-elements/add-page";
import { type SurveyCard, type SurveyCopy } from "@/components/features/disease-elements/survey-page";
import { type TablePageData } from "@/components/features/disease-elements/table-page";
import { type DiseaseElementTypeId } from "@/lib/disease-elements";

export type CategorySlug = "triggers" | "symptoms" | "supplements";

export type CategoryConfig = {
  slug: CategorySlug;
  typeId: DiseaseElementTypeId;
  columnKey: string;
  table: TablePageData;
  survey: {
    copy: SurveyCopy;
    fallbackCards: SurveyCard[];
  };
  add: {
    copy: AddPageCopy;
  };
};

export const categoryConfigs: Record<CategorySlug, CategoryConfig> = {
  triggers: {
    slug: "triggers",
    typeId: 1,
    columnKey: "trigger",
    table: {
      title: "Triggers",
      description:
        "Community results from all past responses. Tap Contribute to record your triggers and add one if it’s missing.",
      ctaHref: "/triggers/survey",
      ctaLabel: "Contribute",
      rowsPerPage: 5,
      defaultSort: {
        column: "trigger",
        order: "asc",
      },
      columns: [
        { key: "trigger", label: "Trigger", sortable: true },
        { key: "yes", label: "Yes", sortable: true, className: "text-emerald-600 font-semibold" },
        { key: "no", label: "No", sortable: true, className: "text-rose-600 font-semibold" },
        { key: "diff", label: "Yes - No", sortable: true },
      ],
    },
    survey: {
      copy: {
        title: "Trigger survey",
        description:
          "Pick the triggers that apply to you. Tap Yes, No, or Skip — and add your own trigger at the end if none of these fit.",
        backHref: "/triggers",
        backLabel: "Back to triggers",
        addHref: "/triggers/add",
        addLabel: "Add a trigger",
        completedTitle: "Thanks for contributing",
        completedDescription: "Add your own trigger if it isn’t listed.",
      },
      fallbackCards: [
        { title: "Caffeine", description: "Coffee, energy drinks, pre-workout." },
        { title: "Alcohol", description: "Wine, beer, spirits." },
        { title: "Stress", description: "Acute stress, deadlines, arguments." },
        { title: "Lack of sleep", description: "Short or disrupted nights." },
        { title: "Cold exposure", description: "Cold weather or cold showers." },
      ],
    },
    add: {
      copy: {
        pageTitle: "Add a trigger",
        pageDescription: "Name and a brief description shown on swipe cards.",
        nameLabel: "Trigger name",
        namePlaceholder: "e.g., Caffeine",
        descriptionLabel: "Brief description",
        descriptionPlaceholder: "e.g., Coffee, energy drinks, pre-workout.",
        submitLabel: "Save trigger",
        savedLabel: "Saved",
        nameId: "trigger-title",
        descriptionId: "trigger-description",
      },
    },
  },
  symptoms: {
    slug: "symptoms",
    typeId: 2,
    columnKey: "symptom",
    table: {
      title: "Symptoms",
      description:
        "Community results from all past responses. Tap Contribute to record your symptoms and add one if it’s missing.",
      ctaHref: "/symptoms/survey",
      ctaLabel: "Contribute",
      rowsPerPage: 5,
      defaultSort: {
        column: "symptom",
        order: "asc",
      },
      columns: [
        { key: "symptom", label: "Symptom", sortable: true },
        { key: "yes", label: "Yes", sortable: true, className: "text-emerald-600 font-semibold" },
        { key: "no", label: "No", sortable: true, className: "text-rose-600 font-semibold" },
        { key: "diff", label: "Yes - No", sortable: true },
      ],
    },
    survey: {
      copy: {
        title: "Symptom survey",
        description:
          "Call out the symptoms that match you. Tap Yes, No, or Skip — and add your own symptom at the end if it’s missing.",
        backHref: "/symptoms",
        backLabel: "Back to symptoms",
        addHref: "/symptoms/add",
        addLabel: "Add a symptom",
        completedTitle: "Thanks for contributing",
        completedDescription: "Add your own symptom if it isn’t listed.",
      },
      fallbackCards: [
        { title: "Palpitations", description: "Racing or fluttering heart sensations." },
        { title: "Dizziness", description: "Feeling lightheaded or unsteady." },
        { title: "Chest discomfort", description: "Tightness or pressure in the chest." },
        { title: "Shortness of breath", description: "Breathlessness with light activity." },
        { title: "Fatigue", description: "Unusual tiredness without clear cause." },
      ],
    },
    add: {
      copy: {
        pageTitle: "Add a symptom",
        pageDescription: "Name and a brief description shown on swipe cards.",
        nameLabel: "Symptom name",
        namePlaceholder: "e.g., Palpitations",
        descriptionLabel: "Brief description",
        descriptionPlaceholder: "e.g., Racing or fluttering heart sensations.",
        submitLabel: "Save symptom",
        savedLabel: "Saved",
        nameId: "symptom-title",
        descriptionId: "symptom-description",
      },
    },
  },
  supplements: {
    slug: "supplements",
    typeId: 3,
    columnKey: "supplement",
    table: {
      title: "Supplements",
      description:
        "Community results from all past responses. Tap Contribute to record your supplements and add one if it’s missing.",
      ctaHref: "/supplements/survey",
      ctaLabel: "Contribute",
      rowsPerPage: 5,
      defaultSort: {
        column: "supplement",
        order: "asc",
      },
      columns: [
        { key: "supplement", label: "Supplement", sortable: true },
        { key: "yes", label: "Yes", sortable: true, className: "text-emerald-600 font-semibold" },
        { key: "no", label: "No", sortable: true, className: "text-rose-600 font-semibold" },
        { key: "diff", label: "Yes - No", sortable: true },
      ],
    },
    survey: {
      copy: {
        title: "Supplement survey",
        description:
          "Pick the supplements you actually use. Tap Yes, No, or Skip — and add your own at the end if we missed one.",
        backHref: "/supplements",
        backLabel: "Back to supplements",
        addHref: "/supplements/add",
        addLabel: "Add a supplement",
        completedTitle: "Thanks for contributing",
        completedDescription: "Add your own supplement if it isn’t listed.",
      },
      fallbackCards: [
        { title: "Magnesium", description: "Supplemental magnesium (glycinate, citrate)." },
        { title: "Omega-3", description: "Fish oil or algae-based omega-3s." },
        { title: "CoQ10", description: "Ubiquinone/ubiquinol coenzyme Q10." },
        { title: "Electrolytes", description: "Electrolyte mixes with sodium/potassium." },
        { title: "Taurine", description: "Amino acid often used for calming effects." },
      ],
    },
    add: {
      copy: {
        pageTitle: "Add a supplement",
        pageDescription: "Name and a brief description shown on swipe cards.",
        nameLabel: "Supplement name",
        namePlaceholder: "e.g., Magnesium",
        descriptionLabel: "Brief description",
        descriptionPlaceholder: "e.g., Supplemental magnesium (glycinate, citrate).",
        submitLabel: "Save supplement",
        savedLabel: "Saved",
        nameId: "supplement-title",
        descriptionId: "supplement-description",
      },
    },
  },
};

export function getCategoryConfig(slug: string): CategoryConfig | null {
  if (isCategorySlug(slug)) {
    return categoryConfigs[slug];
  }
  return null;
}

export function isCategorySlug(value: string): value is CategorySlug {
  return value === "triggers" || value === "symptoms" || value === "supplements";
}
