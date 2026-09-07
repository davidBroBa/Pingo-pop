import { MainLayout } from "@/components/layout";
import {
  CTA,
  Categories,
  FeaturedProducts,
  Hero,
  HowItWorks,
} from "@/components/sections";

export default function Home() {
  return (
    <MainLayout>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <HowItWorks />
      <CTA />
    </MainLayout>
  );
}
