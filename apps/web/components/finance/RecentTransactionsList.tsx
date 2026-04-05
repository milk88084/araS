import type { Transaction } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  transactions: Transaction[];
}

export function RecentTransactionsList({ transactions }: Props) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-[#8e8e93]">最近交易</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {transactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#c7c7cc]">尚無交易紀錄</p>
        ) : (
          <ul>
            {transactions.map((t, i) => (
              <li
                key={t.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i !== transactions.length - 1 ? "border-b border-[#f2f2f7]" : ""
                }`}
              >
                <div>
                  <p className="text-[15px] font-medium text-[#1c1c1e]">{t.category}</p>
                  <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                    {new Date(t.date).toLocaleDateString("zh-TW", {
                      month: "numeric",
                      day: "numeric",
                    })}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[15px] font-semibold ${
                    t.type === "income" ? "text-[#34c759]" : "text-[#ff3b30]"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
