"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Asset } from "@repo/shared";
import { useFinanceStore } from "../../store/useFinanceStore";

const PRESET_CATEGORIES = ["流動資金", "投資", "固定資產", "應收款", "其他"];

interface Props {
  open: boolean;
  onClose: () => void;
  editItem?: Asset | null;
}

export function AssetSheet({ open, onClose, editItem }: Props) {
  const { addAsset, updateAsset } = useFinanceStore();
  const isEdit = !!editItem;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editItem?.name ?? "");
      setCategory(editItem?.category ?? "");
      setValue(editItem ? String(editItem.value) : "");
    }
  }, [open, editItem]);

  const handleSubmit = async () => {
    if (!name || !category || !value) return;
    setSubmitting(true);
    if (isEdit && editItem) {
      await updateAsset(editItem.id, {
        name,
        category,
        value: parseFloat(value),
      });
    } else {
      await addAsset({ name, category, value: parseFloat(value) });
    }
    setSubmitting(false);
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
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#e5e5ea]" />
        </div>
        <div className="mx-auto max-w-md px-4 pt-2 pb-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#1c1c1e]">
              {isEdit ? "編輯資產" : "新增資產"}
            </h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f2f7]"
            >
              <X size={14} className="text-[#8e8e93]" />
            </button>
          </div>

          {/* Category chips */}
          <div className="mb-3">
            <label className="mb-2 block text-xs font-medium text-[#8e8e93]">類別</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {PRESET_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === c ? "bg-[#007aff] text-white" : "bg-[#f2f2f7] text-[#8e8e93]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="或輸入自訂類別"
              className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-sm text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：台新銀行活存"
              className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-sm text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-[#8e8e93]">金額</label>
            <div className="flex items-center rounded-xl bg-[#f2f2f7] px-3 py-3">
              <span className="mr-2 text-sm text-[#8e8e93]">TWD</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-sm text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name || !category || !value || submitting}
            className="w-full rounded-xl bg-[#007aff] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "儲存中..." : isEdit ? "更新" : "新增"}
          </button>
        </div>
      </div>
    </>
  );
}
