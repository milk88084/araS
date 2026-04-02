"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useFinanceStore } from "../../store/useFinanceStore";
import type { TransactionSource, TransactionType } from "@repo/shared";

const EXPENSE_CATEGORIES = ["餐飲", "交通", "住房", "購物", "娛樂", "醫療", "教育", "其他"];
const INCOME_CATEGORIES = ["薪資", "投資收益", "兼職", "獎金", "其他"];
const SOURCES: { key: TransactionSource; label: string }[] = [
  { key: "daily", label: "日常開銷" },
  { key: "emergency", label: "緊急備用金" },
  { key: "excluded", label: "不計入預算" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TransactionBottomSheet({ open, onClose }: Props) {
  const { addTransaction } = useFinanceStore();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0] ?? "");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<TransactionSource>("daily");
  const [submitting, setSubmitting] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !category || !date) return;
    setSubmitting(true);
    await addTransaction({
      type,
      amount: parseFloat(amount),
      category,
      source,
      note: note || undefined,
      date,
    });
    setSubmitting(false);
    setAmount("");
    setCategory("");
    setNote("");
    setSource("daily");
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 bottom-0 left-0 z-50 rounded-t-2xl bg-white transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-md p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">紀錄收支</h2>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setCategory("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  type === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {t === "expense" ? "支出" : "收入"}
              </button>
            ))}
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">金額</label>
            <div className="flex items-center rounded-xl bg-gray-50 px-3 py-2.5">
              <span className="mr-2 text-sm text-gray-400">TWD</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">類別</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
            >
              <option value="">選擇類別</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">備註</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="選填"
              className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-xs text-gray-500">資金來源</label>
            <div className="flex gap-2">
              {SOURCES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                    source === key
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || !category || submitting}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </>
  );
}
