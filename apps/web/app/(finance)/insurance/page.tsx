"use client";

import { useEffect, useState, useCallback } from "react";
import type { Insurance } from "@repo/shared";
import { PolicySummaryCard } from "@/components/finance/PolicySummaryCard";
import { PolicyUpdateForm } from "@/components/finance/PolicyUpdateForm";
import { PolicyDetailSheet } from "@/components/finance/PolicyDetailSheet";

type PolicyWithEntry = Insurance & { entry: { name: string } | null };

export default function InsurancePage() {
  const [policies, setPolicies] = useState<PolicyWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpdate, setSelectedUpdate] = useState<PolicyWithEntry | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PolicyWithEntry | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/insurance");
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      // API returns { success, data } envelope
      const data = json.data ?? json;
      setPolicies(Array.isArray(data) ? data : []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-[#8e8e93]">載入中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-xl font-bold text-[#1c1c1e]">保險</h1>

      {policies.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
          尚無保單記錄
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {policies.map((policy) => (
            <PolicySummaryCard
              key={policy.id}
              insurance={policy}
              onUpdate={() => setSelectedUpdate(policy)}
              onViewDetail={() => setSelectedDetail(policy)}
            />
          ))}
        </div>
      )}

      {selectedUpdate && (
        <PolicyUpdateForm
          open={selectedUpdate !== null}
          insurance={selectedUpdate}
          onClose={() => setSelectedUpdate(null)}
          onSaved={() => {
            setSelectedUpdate(null);
            fetchPolicies();
          }}
        />
      )}

      {selectedDetail && (
        <PolicyDetailSheet
          open={selectedDetail !== null}
          insurance={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
}
