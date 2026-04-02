import { BottomNav } from "../../components/layout/BottomNav";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
