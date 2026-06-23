"use client";
import { useState, useEffect, Suspense } from "react";
import api from "@/lib/api";
import TradingChart from "@/components/TradingChart";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSearchParams } from "next/navigation";
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import toast from 'react-hot-toast';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useT, useTv } from "@/lib/i18n";
import { useSymbolNames } from "@/lib/symbolNames";

function AnalysisPageContent() {
    const t = useT();
    const { tv } = useTv();
    const nameOf = useSymbolNames();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [ticker, setTicker] = useState("");
    const [data, setData] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
    
    const searchParams = useSearchParams();

    useEffect(() => {
        // Cookie-based auth: token kontrolü yok, interceptor 401 yönetir
        
        const tickerParam = searchParams.get("ticker");
        if (tickerParam) {
            setTicker(tickerParam.toUpperCase());
            requireAuth(() => fetchAnalysis(tickerParam.toUpperCase()));
        }
    }, [searchParams]);


    const fetchAnalysis = async (symbol: string) => {
        if (!symbol) return;
        setLoading(true);
        setError("");
        setData(null);
        try {
            const res = await api.get(`/analysis/${symbol}`);
            if (res.data && res.data.data) {
                setData(res.data.data);
            }
            // Fetch chart data as well
            const chartRes = await api.get(`/data/ohlcv/${symbol}?interval=1d&period=1y`);
            if (chartRes.data && chartRes.data.data) {
                setChartData(chartRes.data.data);
            } else {
                setChartData([]);
            }
        } catch (err: any) {
            console.error("Analiz yüklenemedi", err);
            setError(err?.response?.data?.detail || t("an.fetchError"));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        requireAuth(() => fetchAnalysis(ticker));
    };

    const getDecisionColor = (decision: string) => {
        if (!decision) return "bg-[var(--color-b-panel)] border-gray-600";
        const d = decision.toLowerCase();
        if (d.includes("al") || d.includes("buy") || d.includes("lider") || d.includes("pozitif") || d.includes("positive") || d.includes("long")) return "bg-green-900/40 border-green-500/50 text-green-400";
        if (d.includes("sat") || d.includes("sell") || d.includes("negatif") || d.includes("negative") || d.includes("baskı") || d.includes("short")) return "bg-red-900/40 border-red-500/50 text-red-400";
        return "bg-blue-900/40 border-blue-500/50 text-blue-400";
    };

    const handleSendTelegram = async () => {
        if (!data) return;
        setLoading(true);
        try {
            const ssot = data.ssot_result || {};
            const risk = ssot.risk || {};
            const msg = `*🚀 ${data.ticker} ${t("an.tgReport")}*
*${t("an.tgPrice")}:* $${data.current_price}
*${t("an.tgHybridScore")}:* ${ssot.score} | *${t("an.tgConfidence")}:* ${ssot.pgs}
*${t("an.tgDecision")}:* ${ssot.decision}

*🛡️ ${t("an.tgRisk")}*
*${t("an.stopLoss")}:* $${risk.SL ? risk.SL : "-"}
*${t("an.tgTrailing")}:* $${risk.TrailingStop ? risk.TrailingStop : "-"}
*${t("an.target1")}:* $${risk.TP1 ? risk.TP1 : "-"}
*${t("an.target2")}:* $${risk.TP2 ? risk.TP2 : "-"}

*🤖 ${t("an.tgAiSummary")}:*
${ssot.summary || "-"}`;

            const res = await api.post("/telegram/send", { message: msg });
            toast.success(res.data.message || t("an.tgSent"));
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || t("an.tgError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t("an.title")}</h1>
                    <p className="text-[var(--color-b-muted)]">{t("an.subtitle")}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <SymbolAutocomplete 
                            value={ticker}
                            onChange={(val) => setTicker(val)}
                            className="w-64"
                        />
                        <button 
                            type="submit"
                            className="bg-[var(--color-b-yellow)] text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? "..." : t("an.analyzeBtn")}
                        </button>
                    </form>
                    {data && (
                        <div className="flex gap-2 items-center">
                            {data.ssot_result?.core_votes_list && data.ssot_result.core_votes_list.length > 0 && (
                                <button 
                                    onClick={() => setIsIndicatorModalOpen(true)}
                                    className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] hover:from-[#0284c7] hover:to-[#0891b2] border-none text-white px-4 py-2 rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                                >
                                    {t("an.indicatorSignals")}
                                </button>
                            )}
                            <button 
                                type="button"
                                onClick={() => requireAuth(handleSendTelegram)}
                                className="bg-[#24A1DE] hover:bg-[#1d82b5] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                disabled={loading}
                            >
                                {t("an.sendTelegram")}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded text-white mb-6">
                    🚨 {error}
                </div>
            )}

            {!data && !loading && !error && (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-b-muted)] border-2 border-dashed border-[var(--color-b-border)] rounded-lg p-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-xl font-bold text-white mb-2">{t("an.waitingTitle")}</h2>
                    <p>{t("an.waitingDesc")}</p>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-b-muted)] border-2 border-dashed border-[var(--color-b-border)] rounded-lg p-12">
                    <div className="animate-spin text-5xl mb-4">⏳</div>
                    <h2 className="text-xl font-bold text-white mb-2">{t("an.runningTitle")}</h2>
                    <p>{t("an.runningDesc")}</p>
                </div>
            )}

            {data && (
                <div className="flex-1 w-full flex mb-2" style={{ minHeight: "800px", height: "calc(100vh - 160px)" }}>
                    <PanelGroup orientation="horizontal" id="analysis-layout" autoSave="analysis-layout">
                        {/* LEFT COLUMN: Metrics */}
                        <Panel defaultSize={30} minSize={20} className="flex flex-col space-y-6 overflow-y-auto pr-4 pb-4">
                            
                        {/* Premium Card */}
                        <div className="glass-panel p-6 rounded-lg border border-[var(--color-b-border)] bg-gradient-to-br from-[#1e2329] to-[#0d1117]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-3xl font-black text-white">{data.ticker}</div>
                                    {nameOf(data.ticker) && (
                                        <div className="text-sm font-normal text-[var(--color-b-muted)]">{nameOf(data.ticker)}</div>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-white">${data.current_price?.toFixed(2)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-[#181a20] p-3 rounded text-center border border-[var(--color-b-border)]">
                                    <div className="text-[var(--color-b-muted)] text-xs mb-1">{t("an.hybridPotential")}</div>
                                    <div className="text-2xl font-bold text-[var(--color-b-green)]">{data.ssot_result?.score}</div>
                                </div>
                                <div className="bg-[#181a20] p-3 rounded text-center border border-[var(--color-b-border)]">
                                    <div className="text-[var(--color-b-muted)] text-xs mb-1">{t("an.confidence")}</div>
                                    <div className="text-2xl font-bold text-[var(--color-b-yellow)]">{data.ssot_result?.pgs}</div>
                                </div>
                            </div>
                        </div>

                        {/* 3'lü Vade Kartları (Time Horizons) */}
                        <div className="bg-[#181a20] p-4 rounded-lg border border-[var(--color-b-border)]">
                            <h3 className="font-bold text-white mb-4">{t("an.strategyByHorizon")}</h3>

                            {/* Kısa Vade */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold text-[var(--color-b-muted)]">{t("an.shortTerm")}</span>
                                    <span className={`font-black ${getDecisionColor(data.ssot_result?.short_term?.decision).replace('bg-', 'text-').replace('/10', '')}`}>{tv(data.ssot_result?.short_term?.decision) || t("an.neutral")} ({data.ssot_result?.short_term?.score}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{width: `${data.ssot_result?.short_term?.score || 50}%`}}></div>
                                </div>
                            </div>
                            
                            {/* Orta Vade */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold text-[var(--color-b-muted)]">{t("an.mediumTerm")}</span>
                                    <span className={`font-black ${getDecisionColor(data.ssot_result?.medium_term?.decision).replace('bg-', 'text-').replace('/10', '')}`}>{tv(data.ssot_result?.medium_term?.decision) || t("an.neutral")} ({data.ssot_result?.medium_term?.score}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{width: `${data.ssot_result?.medium_term?.score || 50}%`}}></div>
                                </div>
                            </div>
                            
                            {/* Uzun Vade */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold text-[var(--color-b-muted)]">{t("an.longTerm")}</span>
                                    <span className={`font-black ${getDecisionColor(data.ssot_result?.long_term?.decision).replace('bg-', 'text-').replace('/10', '')}`}>{tv(data.ssot_result?.long_term?.decision) || t("an.neutral")} ({data.ssot_result?.long_term?.score}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{width: `${data.ssot_result?.long_term?.score || 50}%`}}></div>
                                </div>
                            </div>
                        </div>

                        {/* Risk Management */}
                        <div className="bg-[#181a20] p-5 rounded-lg border border-[var(--color-b-border)]">
                            <h3 className="font-bold text-white mb-4">{t("an.riskTitle")}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.stopLoss")}</div>
                                    <div className="text-red-400 font-bold">${data.ssot_result?.risk?.SL ? data.ssot_result.risk.SL.toFixed(2) : "-"}</div>
                                </div>
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.trailingStop")}</div>
                                    <div className="text-orange-400 font-bold">${data.ssot_result?.risk?.TrailingStop ? data.ssot_result.risk.TrailingStop.toFixed(2) : "-"}</div>
                                </div>
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.target1")}</div>
                                    <div className="text-green-400 font-bold">${data.ssot_result?.risk?.TP1 ? data.ssot_result.risk.TP1.toFixed(2) : "-"}</div>
                                </div>
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.target2")}</div>
                                    <div className="text-blue-400 font-bold">${data.ssot_result?.risk?.TP2 ? data.ssot_result.risk.TP2.toFixed(2) : "-"}</div>
                                </div>
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.interTargetAtr")}</div>
                                    <div className="text-[var(--color-b-green)] font-bold">${data.smart_targets?.tp_intermediate_atr ? data.smart_targets.tp_intermediate_atr.toFixed(2) : "-"}</div>
                                </div>
                                <div>
                                    <div className="text-[var(--color-b-muted)] text-xs">{t("an.interTargetPeak")}</div>
                                    <div className="text-[var(--color-b-green)] font-bold">${data.smart_targets?.tp_intermediate_peak ? data.smart_targets.tp_intermediate_peak.toFixed(2) : "-"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Market Structure (SMC) */}
                        <div className="bg-[#181a20] p-5 rounded-lg border border-[var(--color-b-border)]">
                            <h3 className="font-bold text-white mb-4">{t("an.smcTitle")}</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-sm text-gray-400">{t("an.bos")}</span>
                                    <span className={`font-bold ${data.market_structure?.bos_detected ? 'text-[var(--color-b-yellow)]' : 'text-gray-500'}`}>
                                        {data.market_structure?.bos_detected ? t("an.bosBreak") : "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">{t("an.trendConfirm")}</span>
                                    <span className="font-bold text-[var(--color-b-green)]">
                                        {data.market_structure?.bos_detected ? t("an.trendUp") : t("an.trendCons")}
                                    </span>
                                </div>
                            </div>
                        </div>


                        </Panel>

                        <PanelResizeHandle className="w-1.5 mx-2 bg-gray-800 hover:bg-[var(--color-b-yellow)] rounded transition-colors cursor-col-resize flex flex-col justify-center items-center">
                            <div className="h-8 w-0.5 bg-gray-500 rounded-full"></div>
                        </PanelResizeHandle>

                        {/* RIGHT COLUMN: Chart and Details */}
                        <Panel defaultSize={70} minSize={30}>
                            <PanelGroup orientation="vertical" id="analysis-layout-right" autoSave="analysis-layout-right">
                                {/* Chart Area */}
                                <Panel defaultSize={60} minSize={30} className="flex flex-col relative pb-2">
                                    <div className="glass-panel p-4 rounded-lg flex-1 w-full relative">
                                        {chartData.length > 0 ? (
                                            <TradingChart data={chartData} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--color-b-muted)]">
                                                {t("an.chartLoading")}
                                            </div>
                                        )}
                                    </div>
                                </Panel>

                                <PanelResizeHandle className="h-1.5 my-2 bg-gray-800 hover:bg-[var(--color-b-yellow)] rounded transition-colors cursor-row-resize flex justify-center items-center">
                                    <div className="w-8 h-0.5 bg-gray-500 rounded-full"></div>
                                </PanelResizeHandle>

                                <Panel defaultSize={40} minSize={20} className="flex flex-col space-y-6 overflow-y-auto pr-2 pb-4 pt-2">
                                    {/* AI Summary */}
                                    <div className="bg-[#1e2329] p-5 rounded-lg border-l-4 border-[var(--color-b-yellow)] flex-shrink-0">
                            <h3 className="font-bold text-white mb-2">{t("an.aiSummary")}</h3>
                            <p className="text-[var(--color-b-muted)] text-sm leading-relaxed whitespace-pre-wrap">
                                {tv(data.ssot_result?.summary)}
                            </p>
                        </div>

                        {/* Indicator Proof Table moved to Modal */}
                                </Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                </div>
            )}
        </div>
        <AuthModal />
        
        {isIndicatorModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsIndicatorModalOpen(false)}>
                <div 
                    className="bg-[#181a20] border border-[var(--color-b-border)] rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-5 border-b border-[var(--color-b-border)]">
                        <div>
                            <h3 className="font-bold text-white text-xl">{t("an.modalTitle")}</h3>
                            <p className="text-[var(--color-b-muted)] text-sm mt-1">{t("an.modalSubtitle")}</p>
                        </div>
                        <button onClick={() => setIsIndicatorModalOpen(false)} className="text-gray-400 hover:text-white text-2xl font-bold p-2">
                            &times;
                        </button>
                    </div>
                    <div className="overflow-y-auto w-full p-4">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1e2329] text-[var(--color-b-muted)] sticky top-0 shadow-md">
                                <tr>
                                    <th className="p-3 font-semibold rounded-tl-md">{t("an.colRule")}</th>
                                    <th className="p-3 font-semibold">{t("an.colStatus")}</th>
                                    <th className="p-3 font-semibold rounded-tr-md">{t("an.colWeight")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.ssot_result?.core_votes_list?.map((vote: any, idx: number) => {
                                    const isAl = vote.Durum?.includes("AL");
                                    const isSat = vote.Durum?.includes("SAT");
                                    return (
                                        <tr key={idx} className="border-b border-[#2a3038] hover:bg-[#1e2329] transition-colors">
                                            <td className="p-3 text-white">{vote["İndikatör/Kural"]}</td>
                                            <td className={`p-3 font-bold ${isAl ? 'text-green-500' : isSat ? 'text-red-500' : 'text-gray-400'}`}>
                                                {tv(vote.Durum)}
                                            </td>
                                            <td className="p-3 text-[var(--color-b-muted)]">{t("an.weight")}: {vote["Ağırlık Puanı"]}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
            <AnalysisPageContent />
        </Suspense>
    );
}
