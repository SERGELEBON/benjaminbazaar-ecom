import { getCategories } from "@/lib/serialize";
import { AppShell } from "@/components/site/app-shell";

export const dynamic = "force-dynamic";

export default async function Page() {
  const categories = await getCategories();
  return <AppShell categories={categories} />;
}
