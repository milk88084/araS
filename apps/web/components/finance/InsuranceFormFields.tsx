"use client";

import type { CashValueRow } from "@repo/shared";

export interface InsuranceFormValues {
  declaredRate: number;
  premiumTotal: number;
  currentAge: number;
  startDate: string;
  cashValueData: CashValueRow[];
}

interface Props {
  values: InsuranceFormValues;
  onChange: (values: InsuranceFormValues) => void;
}

export function InsuranceFormFields({ values, onChange }: Props) {
  const set = <K extends keyof InsuranceFormValues>(key: K, val: InsuranceFormValues[K]) =>
    onChange({ ...values, [key]: val });

  const sortedRows = [...values.cashValueData].sort((a, b) => a.policyYear - b.policyYear);

  const handleAddRow = () => {
    const lastYear = sortedRows.length > 0 ? sortedRows[sortedRows.length - 1]!.policyYear : 0;
    set("cashValueData", [...values.cashValueData, { policyYear: lastYear + 1, cashValue: 0 }]);
  };

  const handleUpdateRow = (index: number, field: keyof CashValueRow, raw: string) => {
    const num = parseFloat(raw);
    const updated = [...values.cashValueData];
    const originalRow = sortedRows[index]!;
    const realIndex = values.cashValueData.findIndex(
      (r) => r.policyYear === originalRow.policyYear && r.cashValue === originalRow.cashValue
    );
    if (realIndex === -1) return;
    updated[realIndex] = { ...updated[realIndex]!, [field]: isNaN(num) ? 0 : num };
    set("cashValueData", updated);
  };

  const handleRemoveRow = (index: number) => {
    const originalRow = sortedRows[index]!;
    set(
      "cashValueData",
      values.cashValueData.filter(
        (r) => !(r.policyYear === originalRow.policyYear && r.cashValue === originalRow.cashValue)
      )
    );
  };

  return (
    <div className="divide-y divide-[#f2f2f7]">
      {/* Declared rate */}
      <div className="px-5 py-4">
        <p className="mb-1 text-[12px] text-[#8e8e93]">宣告利率 (%)</p>
        <input
          type="number"
          value={values.declaredRate === 0 ? "" : values.declaredRate}
          onChange={(e) =>
            set("declaredRate", e.target.value === "" ? 0 : parseFloat(e.target.value))
          }
          placeholder="2.00"
          step="0.01"
          min={0}
          max={20}
          className="w-full bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
        />
      </div>

      {/* Premium total */}
      <div className="px-5 py-4">
        <p className="mb-1 text-[12px] text-[#8e8e93]">保費總額 (USD)</p>
        <input
          type="number"
          value={values.premiumTotal === 0 ? "" : values.premiumTotal}
          onChange={(e) =>
            set("premiumTotal", e.target.value === "" ? 0 : parseFloat(e.target.value))
          }
          placeholder="0"
          min={0}
          className="w-full bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
        />
      </div>

      {/* Current age + start date (split row) */}
      <div className="flex divide-x divide-[#f2f2f7]">
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">投保年齡</p>
          <input
            type="number"
            value={values.currentAge === 0 ? "" : values.currentAge}
            onChange={(e) =>
              set("currentAge", e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value)))
            }
            placeholder="30"
            min={0}
            max={120}
            className="w-full bg-transparent text-[17px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
          />
        </div>
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">起保日期</p>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold text-[#1c1c1e] outline-none"
          />
        </div>
      </div>

      {/* Cash value table */}
      <div className="px-5 py-4">
        <p className="mb-3 text-[12px] text-[#8e8e93]">現金價值表</p>
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-3">
          {sortedRows.length > 0 && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <p className="flex-1 text-[11px] font-medium text-[#8e8e93]">保單年度</p>
              <p className="flex-1 text-right text-[11px] font-medium text-[#8e8e93]">
                現金價值 (USD)
              </p>
              <div className="w-6" />
            </div>
          )}
          <div className="space-y-2">
            {sortedRows.map((row, index) => (
              <div
                key={`${row.policyYear}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2"
              >
                <input
                  type="number"
                  value={row.policyYear}
                  onChange={(e) => handleUpdateRow(index, "policyYear", e.target.value)}
                  className="flex-1 bg-transparent text-[14px] font-semibold text-[#1c1c1e] outline-none"
                  min={1}
                />
                <input
                  type="number"
                  value={row.cashValue === 0 ? "" : row.cashValue}
                  onChange={(e) => handleUpdateRow(index, "cashValue", e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-right text-[14px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[#8e8e93] hover:bg-[#e5e5ea]"
                >
                  <span className="text-[14px] leading-none">×</span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-3 w-full rounded-lg bg-white py-2 text-[13px] font-semibold text-[#8e8e93] hover:bg-[#e5e5ea]"
          >
            ＋ 新增年度
          </button>
        </div>
      </div>
    </div>
  );
}
