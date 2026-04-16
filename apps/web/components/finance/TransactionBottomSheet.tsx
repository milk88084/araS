"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "../ui/Spinner";
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
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 bottom-0 left-0 z-50 rounded-t-3xl bg-white transition-transform duration-300 ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#e5e5ea]" />
        </div>
        <div className="mx-auto max-w-md px-4 pt-2 pb-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#1c1c1e]">紀錄收支</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f2f7]"
            >
              <X size={14} className="text-[#8e8e93]" />
            </button>
          </div>

          <div className="mb-4 flex rounded-xl bg-[#f2f2f7] p-1">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setCategory("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  type === t ? "bg-white text-[#1c1c1e] shadow-sm" : "text-[#8e8e93]"
                }`}
              >
                {t === "expense" ? "支出" : "收入"}
              </button>
            ))}
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">金額</label>
            <div className="flex items-center rounded-xl bg-[#f2f2f7] px-3 py-3">
              <span className="mr-2 text-sm text-[#8e8e93]">TWD</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-sm text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">類別</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-sm text-[#1c1c1e] outline-none"
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
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-sm text-[#1c1c1e] outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">備註</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="選填"
              className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-sm text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">資金來源</label>
            <div className="flex gap-2">
              {SOURCES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                    source === key
                      ? "border-[#007aff] bg-[#007aff]/10 text-[#007aff]"
                      : "border-[#e5e5ea] text-[#8e8e93]"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007aff] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting && <Spinner size={14} />}
            {submitting ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </>
  );
}
