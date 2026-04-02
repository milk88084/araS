import type { Transaction } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  transactions: Transaction[];
}

export function RecentTransactionsList({ transactions }: Props) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">最近交易</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">尚無交易紀錄</p>
        ) : (
          <ul>
            {transactions.map((t, i) => (
              <li
                key={t.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== transactions.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.category}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(t.date).toLocaleDateString("zh-TW", {
                      month: "numeric",
                      day: "numeric",
                    })}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === "income" ? "text-green-700" : "text-red-500"
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
