import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "../../lib/clerk";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isClerkEnabled) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
