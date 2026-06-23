"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import toast from 'react-hot-toast';
import { useT } from "@/lib/i18n";

export default function StrategyComparePage() {
    const t = useT();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [ticker, setTicker] = useState("");
    const [period, setPeriod] = useState("1y");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleCompare = async () => {
        if (!ticker) return;
        setLoading(true);
        try {
            const res = await api.post('/backtest/compare', {
                ticker: ticker,
                period: period
            });
            if (res.data && res.data.data) {
                setResults(res.data.data);
            } else if (res.data && res.data.error) {
                toast.success(res.data.error);
            }
        } catch (error) {
            console.error("Comparison error:", error);
            toast.error(t("cmp.error"));
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)] overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">{t("cmp.title")}</h1>
                <p className="text-[var(--color-b-muted)]">{t("cmp.subtitle")}</p>
            </div>

            <div className="glass-panel p-6 rounded-lg mb-6 flex gap-4">
                <SymbolAutocomplete
                    value={ticker}
                    onChange={(val) => setTicker(val)}
                    placeholder={t("cmp.tickerPh")}
                    className="w-64"
                />
                <select
                    className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white font-bold w-48 focus:outline-none"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                >
                    <option value="1y">{t("cmp.period1y")}</option>
                    <option value="6mo">{t("cmp.period6mo")}</option>
                    <option value="2y">{t("cmp.period2y")}</option>
                </select>
                <button
                    onClick={() => requireAuth(handleCompare)}
                    disabled={loading}
                    className="px-6 py-3 bg-[var(--color-b-yellow)] text-black font-bold rounded hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                    {loading ? t("cmp.calculating") : t("cmp.run")}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {results.length > 0 ? (
                    results.map((res: any, idx: number) => {
                        const getiri = res['Toplam Getiri (%)'];
                        const isPositive = getiri >= 0;
                        const dd = res['Maks Düşüş (%)'];
                        return (
                            <div key={idx} className={`glass-panel p-6 rounded-lg border-t-4 ${isPositive ? 'border-[var(--color-b-green)]' : 'border-[var(--color-b-red)]'}`}>
                                <h2 className="text-xl font-bold text-white mb-4">{res['Strateji']}</h2>
                                <div className={`text-4xl font-bold mb-2 ${isPositive ? 'text-[var(--color-b-green)]' : 'text-[var(--color-b-red)]'}`}>
                                    {isPositive ? '+' : ''}{getiri}%
                                </div>
                                <p className="text-[var(--color-b-muted)] text-sm">{t("cmp.annualReturn")}</p>
                                <hr className="border-[var(--color-b-border)] my-4" />
                                <p className="text-sm text-white">{t("cmp.tradeCount")}: <span className="float-right font-bold">{res['Toplam İşlem']}</span></p>
                                <p className="text-sm text-white mt-2">Max Drawdown: <span className="float-right font-bold text-[var(--color-b-red)]">-{dd}%</span></p>
                                <p className="text-sm text-white mt-2">Win Rate: <span className="float-right font-bold text-blue-400">%{res['Kazanma Oranı (%)']}</span></p>
                                <p className="text-sm text-white mt-2">Sharpe: <span className="float-right font-bold text-purple-400">{res['Sharpe Oranı']}</span></p>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-3 text-center text-[var(--color-b-muted)] p-12">
                        {loading ? t("cmp.running") : t("cmp.empty")}
                    </div>
                )}
            </div>
        </div>
        <AuthModal />
        </>
    );
}
