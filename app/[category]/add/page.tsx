import { notFound } from "next/navigation";
import AddPage from "@/components/features/disease-elements/add-page";
import { getCategoryConfig } from "@/lib/category-config";

type PageParams = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return ["triggers", "symptoms", "supplements"].map((category) => ({ category }));
}

export default async function CategoryAddPage({ params }: PageParams) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return notFound();

  return <AddPage copy={config.add.copy} typeId={config.typeId} redirectHref={config.survey.copy.backHref} />;
}
