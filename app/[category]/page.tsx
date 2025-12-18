import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TablePage from "@/components/features/disease-elements/table-page";
import { fetchDiseaseElementStats } from "@/lib/disease-elements";
import { getCategoryConfig } from "@/lib/category-config";

export const dynamic = "force-dynamic";

type PageParams = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return ["triggers", "symptoms", "supplements"].map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return {};

  return {
    title: `${config.table.title} | AFib Dashboard`,
    description: config.table.description,
  };
}

export default async function CategoryTablePage({ params }: PageParams) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return notFound();

  const stats = await fetchDiseaseElementStats(config.typeId);
  const rows = stats.map((item) => ({
    id: item.id,
    description: item.description,
    [config.columnKey]: item.name,
    yes: item.yes,
    no: item.no,
  }));

  return <TablePage pageData={config.table} rows={rows} />;
}
