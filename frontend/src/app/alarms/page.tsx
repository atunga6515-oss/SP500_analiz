"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import toast from 'react-hot-toast';
import { useT } from "@/lib/i18n";

const CONDITION_KEYS: Record<string, string> = {
    price_above: "al.condPriceAbove",
    price_below: "al.condPriceBelow",
    rsi_above: "al.condRsiAbove",
    rsi_below: "al.condRsiBelow",
};

interface Alarm {
    id: number;
    ticker: string;
    condition: string;
    target_value: number;
    status: string;
    note: string;
    created_at: string;
    triggered_at: string;
}

export default function AlarmsPage() {
    const t = useT();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formTicker, setFormTicker] = useState("");
    const [formCondition, setFormCondition] = useState("price_above");
    const [formValue, setFormValue] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formError, setFormError] = useState("");

    const fetchAlarms = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/alarms/");
            setAlarms(res.data.alarms || []);
        } catch (e: any) {
            if (e?.response?.status === 401) {
                setError(t("al.loginNeeded"));
            } else {
                setError(t("al.loadError"));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlarms();
    }, [fetchAlarms]);

    const handleDelete = (id: number) => {
        toast((to) => (
            <div className="flex flex-col gap-3">
                <span className="font-medium text-white">{t("al.deleteConfirm")}</span>
                <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 bg-[#2b3139] hover:bg-[#3b4149] text-white rounded transition-colors text-sm" onClick={() => toast.dismiss(to.id)}>{t("al.cancel")}</button>
                    <button className="px-3 py-1 bg-[var(--color-b-red)] hover:bg-red-600 text-white font-bold rounded transition-colors text-sm" onClick={async () => {
                        toast.dismiss(to.id);
                        try {
                            await api.delete(`/alarms/${id}`);
                            setAlarms((prev) => prev.filter((a) => a.id !== id));
                            toast.success(t("al.deleted"));
                        } catch {
                            toast.error(t("al.deleteError"));
                        }
                    }}>{t("al.confirmDelete")}</button>
                </div>
            </div>
        ), { duration: Infinity, style: { background: '#1e2329', border: '1px solid #2b3139', color: '#fff' } });
    };

    const handleSaveAlarm = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!formTicker.trim()) { setFormError(t("al.tickerEmpty")); return; }
        if (!formValue || isNaN(parseFloat(formValue))) { setFormError(t("al.validValue")); return; }

        setSaving(true);
        try {
            await api.post("/alarms/", {
                ticker: formTicker.toUpperCase().trim(),
                condition: formCondition,
                target_value: parseFloat(formValue),
                note: formNote,
            });
            setModalOpen(false);
            setFormTicker(""); setFormCondition("price_above"); setFormValue(""); setFormNote("");
            await fetchAlarms();
        } catch (e: any) {
            setFormError(e?.response?.data?.detail || t("al.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <span className="px-2 py-1 bg-[var(--color-b-yellow)] text-black rounded text-xs font-bold">{t("al.statusActive")}</span>;
            case "triggered":
                return <span className="px-2 py-1 bg-[var(--color-b-green)] text-black rounded text-xs font-bold">{t("al.statusTriggered")}</span>;
            default:
                return <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">{t("al.statusPending")}</span>;
        }
    };

    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)] overflow-y-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t("al.title")}</h1>
                    <p className="text-[var(--color-b-muted)]">
                        {t("al.subtitle")}
                    </p>
                </div>
                <button
                    onClick={() => requireAuth(() => setModalOpen(true))}
                    className="px-6 py-3 bg-[var(--color-b-yellow)] text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-[rgba(252,213,53,0.2)]"
                >
                    {t("al.newAlarm")}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4 flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}

            {/* Table */}
            <div className="glass-panel rounded-lg overflow-hidden flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1e2329] text-[var(--color-b-muted)] text-sm sticky top-0">
                        <tr>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("al.colStock")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("al.colCondition")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("al.colTarget")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("al.colNote")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("al.colStatus")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold text-right">{t("al.colAction")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-[var(--color-b-muted)]">
                                    <div className="animate-spin text-4xl mb-3">⏳</div>
                                    {t("al.loadingAlarms")}
                                </td>
                            </tr>
                        ) : alarms.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-16 text-center text-[var(--color-b-muted)]">
                                    <div className="text-5xl mb-4">🔕</div>
                                    <p className="font-semibold text-white mb-1">{t("al.emptyTitle")}</p>
                                    <p className="text-sm">{t("al.emptyDesc")}</p>
                                </td>
                            </tr>
                        ) : (
                            alarms.map((alarm) => (
                                <tr
                                    key={alarm.id}
                                    className="hover:bg-[#1e2329] transition-colors border-b border-[var(--color-b-border)]"
                                >
                                    <td className="p-4 font-bold text-white text-lg">{alarm.ticker}</td>
                                    <td className="p-4 text-[var(--color-b-muted)] text-sm">
                                        {CONDITION_KEYS[alarm.condition] ? t(CONDITION_KEYS[alarm.condition]) : alarm.condition}
                                    </td>
                                    <td className="p-4 font-bold text-[var(--color-b-yellow)] text-lg">
                                        {alarm.target_value}
                                    </td>
                                    <td className="p-4 text-[var(--color-b-muted)] text-sm">{alarm.note || "—"}</td>
                                    <td className="p-4">{statusBadge(alarm.status)}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(alarm.id)}
                                            className="text-sm px-3 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            {t("al.delete")}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
                >
                    <div className="glass-panel w-full max-w-md mx-4 p-8 rounded-2xl border border-[var(--color-b-border)] shadow-2xl relative">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 text-[var(--color-b-muted)] hover:text-white transition-colors text-xl"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-1">{t("al.modalTitle")}</h2>
                        <p className="text-[var(--color-b-muted)] text-sm mb-6">
                            {t("al.modalSubtitle")}
                        </p>

                        <form onSubmit={handleSaveAlarm} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">
                                    {t("al.fTicker")}
                                </label>
                                <SymbolAutocomplete
                                    value={formTicker}
                                    onChange={(val) => setFormTicker(val)}
                                    placeholder={t("al.fTickerPh")}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">
                                    {t("al.fCondition")}
                                </label>
                                <select
                                    value={formCondition}
                                    onChange={(e) => setFormCondition(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded-lg text-white focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                                >
                                    {Object.entries(CONDITION_KEYS).map(([val, labelKey]) => (
                                        <option key={val} value={val}>{t(labelKey)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">
                                    {t("al.fTarget")}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formValue}
                                    onChange={(e) => setFormValue(e.target.value)}
                                    placeholder={formCondition.startsWith("rsi") ? "30, 70..." : "150.50"}
                                    className="w-full px-4 py-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">
                                    {t("al.fNote")}
                                </label>
                                <input
                                    type="text"
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    placeholder={t("al.fNotePh")}
                                    className="w-full px-4 py-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                                />
                            </div>

                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm flex items-center gap-2">
                                    ⚠️ {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3 rounded-lg border border-[var(--color-b-border)] text-[var(--color-b-muted)] hover:text-white hover:border-white/30 transition-colors font-medium"
                                >
                                    {t("al.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-[var(--color-b-yellow)] text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-60"
                                >
                                    {saving ? t("al.saving") : t("al.saveAlarm")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        <AuthModal />
        </>
    );
}
