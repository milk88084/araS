import { formatCurrency } from "../../lib/format";

interface Props {
  amount: number;
}

export function DisposableBalanceHeader({ amount }: Props) {
  const isOverdraft = amount < 0;
  return (
    <div className="pt-2">
      <p className="mb-1 text-sm text-gray-500">本月可支配餘額</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-3xl font-bold tracking-tight ${
            isOverdraft ? "text-red-500" : "text-green-700"
          }`}
        >
          {formatCurrency(amount)}
        </span>
        {isOverdraft && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
            透支
          </span>
        )}
      </div>
    </div>
  );
}
