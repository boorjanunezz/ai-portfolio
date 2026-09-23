import { LangProvider } from "@/components/LangProvider";
import { Portfolio } from "@/components/Portfolio";
import { getSiteData } from "@/lib/portfolio";

// Estática: los datos se leen de /content en build.
export default function HomePage() {
  return (
    <LangProvider>
      <Portfolio data={getSiteData()} />
    </LangProvider>
  );
}
