import { formatCurrency } from "../../lib/format";

interface Props {
  amount: number;
}

export function DisposableBalanceHeader({ amount }: Props) {
  const isOverdraft = amount < 0;
  return (
    <div className="pt-4">
      <p className="mb-1 text-[13px] text-[#8e8e93]">本月可支配餘額</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-[36px] font-bold tracking-tight ${
            isOverdraft ? "text-[#ff3b30]" : "text-[#1c1c1e]"
          }`}
        >
          {formatCurrency(amount)}
        </span>
        {isOverdraft && (
          <span className="rounded-full bg-[#ff3b30]/10 px-2.5 py-0.5 text-xs font-semibold text-[#ff3b30]">
            透支
          </span>
        )}
      </div>
    </div>
  );
}
