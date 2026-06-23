"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import toast from 'react-hot-toast';
import { useT } from "@/lib/i18n";

export default function RobotPage() {
    const t = useT();
    const { requireAuth, AuthModal, loggedIn } = useRequireAuth();
    
    const [loading, setLoading] = useState(true);
    const [statusData, setStatusData] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);
    
    // Form state
    const [balance, setBalance] = useState(1000000);
    const [duration, setDuration] = useState(5);
    const [mode, setMode] = useState("Normal");
    
    const fetchStatus = async () => {
        setLoading(true);
        try {
            const [statusRes, historyRes] = await Promise.all([
                api.get('/robot/status'),
                api.get('/robot/history')
            ]);
            setStatusData(statusRes.data);
            setHistoryData(historyRes.data);
        } catch (e) {
            console.error("Robot verileri alınamadı", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loggedIn === true) {
            fetchStatus();
        } else if (loggedIn === false) {
            setLoading(false);
        }
    }, [loggedIn]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/robot/start', { initial_balance: balance, duration_days: duration, mode });
            fetchStatus();
        } catch (e) {
            console.error(e);
            toast.error(t("rb.startFail"));
        }
    };

    const handleStop = () => {
        toast((to) => (
            <div className="flex flex-col gap-3">
                <span className="font-medium text-white">{t("rb.stopConfirm")}</span>
                <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 bg-[#2b3139] hover:bg-[#3b4149] text-white rounded transition-colors text-sm" onClick={() => toast.dismiss(to.id)}>{t("rb.cancel")}</button>
                    <button className="px-3 py-1 bg-[var(--color-b-red)] hover:bg-red-600 text-white font-bold rounded transition-colors text-sm" onClick={async () => {
                        toast.dismiss(to.id);
                        try {
                            await api.post('/robot/stop');
                            fetchStatus();
                            toast.success(t("rb.stopped"));
                        } catch (e) {
                            console.error(e);
                            toast.error(t("rb.stopFail"));
                        }
                    }}>{t("rb.confirmStop")}</button>
                </div>
            </div>
        ), { duration: Infinity, style: { background: '#1e2329', border: '1px solid #2b3139', color: '#fff' } });
    };

    if (loading) {
        return <div className="p-8 text-center text-[var(--color-text-dim)]">{t("common.loading")}</div>;
    }

    const isActive = statusData?.active;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                        <span className="text-4xl">🤖</span> {t("rb.title")}
                    </h1>
                    <p className="text-[var(--color-text-dim)] text-lg">
                        {t("rb.subtitle")}
                    </p>
                </div>
                {isActive && (
                    <button 
                        onClick={fetchStatus} 
                        disabled={loading}
                        className="px-4 py-2 bg-[#2b3139] text-white rounded hover:bg-[#3b4149] transition-colors border border-[#3b4149] flex items-center gap-2 font-medium"
                    >
                        {loading ? t("rb.refreshing") : t("rb.refresh")}
                    </button>
                )}
            </header>

            {!isActive ? (
                <div className="glass-panel p-8 max-w-xl">
                    <h2 className="text-xl font-bold text-white mb-4">{t("rb.startTitle")}</h2>
                    <form onSubmit={handleStart} className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--color-text-dim)] mb-1">{t("rb.initialCapital")}</label>
                            <input 
                                type="number" 
                                value={balance} 
                                onChange={(e) => setBalance(Number(e.target.value))}
                                className="w-full bg-[#0b0e14] border border-[#2b3139] rounded px-4 py-3 text-white focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--color-text-dim)] mb-1">{t("rb.runDuration")}</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full bg-[#0b0e14] border border-[#2b3139] rounded px-4 py-3 text-white focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--color-text-dim)] mb-1">{t("rb.modeRisk")}</label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                className="w-full bg-[#0b0e14] border border-[#2b3139] rounded px-4 py-3 text-white focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                            >
                                <option value="Temkinli">{t("rb.modeCautious")}</option>
                                <option value="Normal">{t("rb.modeNormal")}</option>
                                <option value="Agresif">{t("rb.modeAggressive")}</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-[var(--color-b-yellow)] to-yellow-600 text-[#181a20] font-bold py-3 rounded hover:opacity-90 transition-opacity">
                            {t("rb.startBtn")}
                        </button>
                    </form>
                    
                    {statusData?.status === "completed" || statusData?.status === "stopped" ? (
                        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded">
                            <h3 className="text-green-400 font-bold mb-2">{t("rb.prevSession")}</h3>
                            <p className="text-white">{t("rb.start")}: ${statusData.initial_balance.toLocaleString("en-US")}</p>
                            <p className="text-white">{t("rb.end")}: ${statusData.total_assets.toLocaleString("en-US")}</p>
                            <p className={`font-bold ${statusData.pnl_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {t("rb.return")}: %{statusData.pnl_pct.toFixed(2)}
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="glass-panel p-6">
                            <div className="text-sm text-[var(--color-text-dim)] mb-1">{t("rb.initialCapShort")}</div>
                            <div className="text-2xl font-bold text-white">${statusData.initial_balance.toLocaleString("en-US", {maximumFractionDigits:2})}</div>
                            <div className="text-xs text-[var(--color-b-yellow)] mt-2 font-bold bg-[#2b3139]/50 inline-block px-2 py-1 rounded">{t("rb.mode")}: {statusData.mode} (Max: {statusData.max_positions})</div>
                        </div>
                        <div className="glass-panel p-6">
                            <div className="text-sm text-[var(--color-text-dim)] mb-1">{t("rb.cashBalance")}</div>
                            <div className="text-2xl font-bold text-[var(--color-b-yellow)]">${statusData.current_balance.toLocaleString("en-US", {maximumFractionDigits:2})}</div>
                        </div>
                        <div className="glass-panel p-6">
                            <div className="text-sm text-[var(--color-text-dim)] mb-1">{t("rb.totalAssets")}</div>
                            <div className="text-2xl font-bold text-white">${statusData.total_assets.toLocaleString("en-US", {maximumFractionDigits:2})}</div>
                        </div>
                        <div className="glass-panel p-6 border-l-4 border-[var(--color-b-yellow)]">
                            <div className="text-sm text-[var(--color-text-dim)] mb-1">{t("rb.netPnl")}</div>
                            <div className={`text-3xl font-bold ${statusData.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {statusData.pnl_pct >= 0 ? '+' : ''}{statusData.pnl_pct.toFixed(2)}%
                            </div>
                        </div>
                        <div className="glass-panel p-6 border-l-2 border-red-500/30 bg-red-500/5">
                            <div className="text-sm text-[var(--color-text-dim)] mb-1">{t("rb.tradesComm")}</div>
                            <div className="text-lg font-bold text-white mb-1">{statusData.total_trades_count || 0} {t("rb.trades")}</div>
                            <div className="text-sm font-medium text-red-400">-${statusData.total_commission_paid?.toLocaleString("en-US", {maximumFractionDigits:2}) || 0}</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-[#1e2329] p-4 rounded border border-[#2b3139]">
                        <div className="text-sm text-[var(--color-text-dim)]">
                            {t("rb.endDate")}: <span className="text-white ml-2">{new Date(statusData.end_date).toLocaleString('en-US')}</span>
                        </div>
                        <button onClick={handleStop} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/40 transition-colors text-sm font-bold">
                            {t("rb.forceClose")}
                        </button>
                    </div>

                    {/* Aktif Portföy Tablosu */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>💼</span> {t("rb.activePortfolio")}
                        </h2>
                        {statusData.portfolio && statusData.portfolio.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#2b3139] text-[var(--color-text-dim)] text-sm">
                                            <th className="py-3 px-4 font-medium">{t("rb.colStock")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colQty")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colCost")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colLive")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colValue")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colPnl")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statusData.portfolio.map((p: any, i: number) => (
                                            <tr key={i} className="border-b border-[#2b3139]/50 hover:bg-[#2b3139]/30 transition-colors">
                                                <td className="py-3 px-4 font-bold text-white">{p.ticker}</td>
                                                <td className="py-3 px-4 text-right">{p.adet}</td>
                                                <td className="py-3 px-4 text-right">{p.alis_fiyati.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right">{p.anlik_fiyat.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right text-white font-medium">{p.toplam_deger.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                                                <td className={`py-3 px-4 text-right font-bold ${p.kar_zarar_yuzde >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    %{p.kar_zarar_yuzde.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-[var(--color-text-dim)] text-center py-8">{t("rb.noHoldings")}</p>
                        )}
                    </div>

                    {/* İşlem Geçmişi */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>📜</span> {t("rb.tradeLogs")}
                        </h2>
                        {statusData.trades && statusData.trades.length > 0 ? (
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="sticky top-0 bg-[#181a20]">
                                        <tr className="border-b border-[#2b3139] text-[var(--color-text-dim)]">
                                            <th className="py-3 px-4 font-medium">{t("rb.colDate")}</th>
                                            <th className="py-3 px-4 font-medium">{t("rb.colAction")}</th>
                                            <th className="py-3 px-4 font-medium">{t("rb.colStock")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colPrice")}</th>
                                            <th className="py-3 px-4 font-medium text-right">{t("rb.colQty")}</th>
                                            <th className="py-3 px-4 font-medium">{t("rb.colReason")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statusData.trades.map((tr: any, i: number) => (
                                            <tr key={i} className="border-b border-[#2b3139]/30 hover:bg-[#2b3139]/30">
                                                <td className="py-2 px-4 text-[var(--color-text-dim)]">{new Date(tr.date).toLocaleString('en-US')}</td>
                                                <td className="py-2 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${tr.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {tr.type}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-4 font-bold text-white">{tr.ticker}</td>
                                                <td className="py-2 px-4 text-right">{tr.price.toFixed(2)}</td>
                                                <td className="py-2 px-4 text-right">{tr.adet}</td>
                                                <td className="py-2 px-4 text-[var(--color-text-dim)] italic">{tr.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-[var(--color-text-dim)] text-center py-8">{t("rb.noTrades")}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Geçmiş Seanslar Tablosu */}
            {historyData.length > 0 && (
                <div className="glass-panel p-6 mt-12">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🕰️</span> {t("rb.prevSessions")}
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-[#181a20]">
                                <tr className="border-b border-[#2b3139] text-[var(--color-text-dim)]">
                                    <th className="py-3 px-4 font-medium">{t("rb.colStart")}</th>
                                    <th className="py-3 px-4 font-medium">{t("rb.colEnd")}</th>
                                    <th className="py-3 px-4 font-medium text-right">{t("rb.colInitCap")}</th>
                                    <th className="py-3 px-4 font-medium text-right">{t("rb.colEndAssets")}</th>
                                    <th className="py-3 px-4 font-medium text-right">{t("rb.colComm")}</th>
                                    <th className="py-3 px-4 font-medium text-right">{t("rb.colNetReturn")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyData.map((h: any, i: number) => (
                                    <tr key={i} className="border-b border-[#2b3139]/50 hover:bg-[#2b3139]/30 transition-colors">
                                        <td className="py-3 px-4 text-white">{new Date(h.start_date).toLocaleString('en-US')}</td>
                                        <td className="py-3 px-4 text-white">{new Date(h.end_date).toLocaleString('en-US')}</td>
                                        <td className="py-3 px-4 text-right">${h.initial_balance.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                                        <td className="py-3 px-4 text-right font-medium text-white">${h.total_assets.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                                        <td className="py-3 px-4 text-right text-red-400">-${h.total_commission_paid.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${h.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <AuthModal />
        </div>
    );
}
