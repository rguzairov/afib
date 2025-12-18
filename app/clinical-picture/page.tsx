import type { Metadata } from "next";
import ClinicalPicturePage, {
  clinicalPictureMetaDescription,
} from "@/components/features/clinical-picture/clinical-picture-page";

export const metadata: Metadata = {
  title: "Clinical Picture | AFib Dashboard",
  description: clinicalPictureMetaDescription,
};

export const dynamic = "force-dynamic";

export default function ClinicalPicture() {
  return <ClinicalPicturePage />;
}
