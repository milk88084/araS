"use client";

import { PenLine, Landmark, PieChart, CreditCard } from "lucide-react";

interface Props {
  onRecordExpense: () => void;
}

const actions = [
  { icon: PenLine, label: "紀錄生活", key: "record" },
  { icon: Landmark, label: "更新存款", key: "deposit" },
  { icon: PieChart, label: "配置資產", key: "allocate" },
  { icon: CreditCard, label: "新增負債", key: "liability" },
];

export function QuickActionsGrid({ onRecordExpense }: Props) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">快速操作</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, key }) => (
          <button
            key={key}
            onClick={() => key === "record" && onRecordExpense()}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition-transform active:scale-95"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
              <Icon size={18} className="text-gray-700" />
            </div>
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
