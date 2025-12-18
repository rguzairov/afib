import { notFound } from "next/navigation";
import SurveyPage from "@/components/features/disease-elements/survey-page";
import { fetchDiseaseElementCards } from "@/lib/disease-elements";
import { getCategoryConfig } from "@/lib/category-config";

export const dynamic = "force-dynamic";

type PageParams = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return ["triggers", "symptoms", "supplements"].map((category) => ({ category }));
}

export default async function CategorySurveyPage({ params }: PageParams) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return notFound();

  const cards = await fetchDiseaseElementCards(config.typeId);
  const surveyCards = cards.length ? cards : config.survey.fallbackCards;

  return <SurveyPage copy={config.survey.copy} cards={surveyCards} />;
}
