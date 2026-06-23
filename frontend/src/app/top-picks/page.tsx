"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import AIAnalyzeModal from "../components/AIAnalyzeModal";
import toast from 'react-hot-toast';
import { addTickerToWatchlist } from "@/lib/watchlist";
import { useT, useTv } from "@/lib/i18n";
import { useSymbolNames } from "@/lib/symbolNames";

export default function TopPicksPage() {
    const t = useT();
    const { tv, tp } = useTv();
    const nameOf = useSymbolNames();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [picks, setPicks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [historyDates, setHistoryDates] = useState<any[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState("");
    const [topN, setTopN] = useState<number>(5);
    const [pool, setPool] = useState<string>("BIST30");
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
    const [addingToPort, setAddingToPort] = useState(false);
    
    // Portfolio Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTicker, setModalTicker] = useState("");
    const [modalPrice, setModalPrice] = useState("");
    const [modalQty, setModalQty] = useState("100");

    // AI Modal State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiProps, setAiProps] = useState<any>({ ticker: "", price: 0 });
    
    // Progress Tracking
    const [scanProgress, setScanProgress] = useState<number>(0);
    const [scanText, setScanText] = useState<string>("");
    const [taskId, setTaskId] = useState<string>("");

    useEffect(() => {
        fetchHistoryDates();
    }, []);

    const fetchHistoryDates = async () => {
        try {
            const res = await api.get('/top_picks/history-dates');
            if (res.data && res.data.dates) {
                setHistoryDates(res.data.dates);
                if (res.data.dates.length > 0 && !selectedHistoryId && !loading) {
                    const firstId = res.data.dates[0].id.toString();
                    setSelectedHistoryId(firstId);
                    fetchHistoryById(firstId);
                }
            }
        } catch (error) {
            console.error("Geçmiş tarihler çekilemedi", error);
        }
    };

    const fetchHistoryById = async (id: string) => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await api.get(`/top_picks/history/${id}`);
            if (res.data && res.data.data) {
                setPicks(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedHistoryId(id);
        if (id) {
            fetchHistoryById(id);
        } else {
            setPicks([]);
        }
    };

    const handleScan = () => {
        toast((to) => (
            <div className="flex flex-col gap-3">
                <span className="font-medium text-white">{t("tp.scanConfirm").replace("{n}", String(topN))}</span>
                <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 bg-[#2b3139] hover:bg-[#3b4149] text-white rounded transition-colors text-sm" onClick={() => toast.dismiss(to.id)}>{t("tp.cancel")}</button>
                    <button className="px-3 py-1 bg-[var(--color-b-yellow)] hover:bg-yellow-400 text-black font-bold rounded transition-colors text-sm" onClick={async () => {
                        toast.dismiss(to.id);
                        setLoading(true);
                        setPicks([]);
                        setSelectedHistoryId("");
                        setScanProgress(0);
                        setScanText(t("tp.preparing"));
                        try {
                            const res = await api.post('/top_picks/scan', { top_n: topN, pool: pool });
                            if (res.data && res.data.task_id) {
                                setTaskId(res.data.task_id);
                            }
                        } catch (error) {
                            console.error("Tarama hatası:", error);
                            toast.error(t("tp.scanStartError"));
                            setLoading(false);
                        }
                    }}>{t("tp.confirm")}</button>
                </div>
            </div>
        ), { duration: Infinity, style: { background: '#1e2329', border: '1px solid #2b3139', color: '#fff' } });
    };

    useEffect(() => {
        let interval: any;
        if (loading && taskId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/top_picks/scan/progress/${taskId}`);
                    if (res.data) {
                        if (res.data.progress) setScanProgress(res.data.progress);
                        if (res.data.text) setScanText(res.data.text);
                        
                        if (res.data.status === "completed") {
                            setPicks(res.data.results || []);
                            setLoading(false);
                            setTaskId("");
                            fetchHistoryDates();
                        } else if (res.data.status === "error") {
                            toast.error(t("tp.scanError") + res.data.text);
                            setLoading(false);
                            setTaskId("");
                        }
                    }
                } catch(e) {
                    // API ulaşılamazsa pollinge devam et
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading, taskId]);

    const getScoreColor = (score: number) => {
        if (score >= 70) return "text-green-500 bg-green-500/10";
        if (score >= 50) return "text-yellow-500 bg-yellow-500/10";
        return "text-red-500 bg-red-500/10";
    };

    const openModal = (ticker: string, price: string | number) => {
        setModalTicker(ticker);
        setModalPrice(price ? parseFloat(price.toString()).toFixed(2) : "");
        setModalQty("100");
        setModalOpen(true);
    };

    const handleAddToAlphaRank = async (ticker: string) => {
        requireAuth(async () => {
            try {
                const res = await api.post('/alpharank/pool/add', { ticker });
                toast.success(res.data.message);
            } catch (err: any) {
                toast.error(err.response?.data?.detail || 'AlphaRank havuzuna eklenemedi.');
            }
        });
    };

    const handlePortfolioAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/portfolio/transaction', {
                ticker: modalTicker,
                type: 'ALIS',
                quantity: parseFloat(modalQty),
                price: parseFloat(modalPrice)
            });
            setModalOpen(false);
            toast.success(t("sc.addedPortfolio").replace("{t}", modalTicker));
        } catch(error) {
            console.error("Portföy ekleme hatası:", error);
            toast.error(t("sc.portfolioError"));
        }
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const handleSendTelegram = async () => {
        if (!picks || picks.length === 0) return;
        setLoading(true);
        try {
            let listStr = sortedPicks.map((p, i) => `${i+1}. *${p.ticker || p.Hisse}* - ${t("an.tgPrice")}: $${p.fiyat || p.Fiyat} | ${t("tp.cardScore")}: ${p.kompozit_skor} | PGS: ${p.pgs} | ${p.karar}`).join("\n");

            const msg = `*🏆 ${t("tp.title")}*\n\n${listStr}`;

            const res = await api.post("/telegram/send", { message: msg });
            toast.success(res.data.message || t("an.tgSent"));
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || t("an.tgError"));
        } finally {
            setLoading(false);
        }
    };

    const sortedPicks = useMemo(() => {
        let sortableItems = [...picks];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key] ?? "";
                let bValue = b[sortConfig.key] ?? "";
                
                // Parse numbers if applicable
                if (typeof aValue === 'string') {
                    const parsedA = parseFloat(aValue.replace(/[^\d.-]/g, ''));
                    if (!isNaN(parsedA) && aValue.match(/\d/)) aValue = parsedA;
                }
                if (typeof bValue === 'string') {
                    const parsedB = parseFloat(bValue.replace(/[^\d.-]/g, ''));
                    if (!isNaN(parsedB) && bValue.match(/\d/)) bValue = parsedB;
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [picks, sortConfig]);

    const renderSortArrow = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return " ↕";
        return sortConfig.direction === 'asc' ? " 🔼" : " 🔽";
    };

    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)] overflow-y-auto">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t("tp.title")}</h1>
                    <p className="text-[var(--color-b-muted)]">
                        {t("tp.subtitle")}
                    </p>
                </div>
                
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col">
                        <label className="text-xs text-[var(--color-b-muted)] mb-1">{t("tp.pool")}</label>
                        <select
                            value={pool}
                            onChange={(e) => setPool(e.target.value)}
                            className="bg-[#1e2329] border border-[var(--color-b-border)] text-white px-3 py-2 rounded focus:outline-none"
                        >
                            <option value="BIST30">{t("tp.pool30")}</option>
                            <option value="BIST100">{t("tp.pool100")}</option>
                            <option value="ALL">{t("tp.poolAll")}</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-[var(--color-b-muted)] mb-1">{t("tp.howMany")}</label>
                        <select 
                            value={topN} 
                            onChange={(e) => setTopN(Number(e.target.value))}
                            className="bg-[#1e2329] border border-[var(--color-b-border)] text-white px-3 py-2 rounded focus:outline-none"
                        >
                            <option value={3}>3 {t("tp.nStocks")}</option>
                            <option value={5}>5 {t("tp.nStocks")}</option>
                            <option value={10}>10 {t("tp.nStocks")}</option>
                            <option value={20}>20 {t("tp.nStocks")}</option>
                            <option value={50}>50 {t("tp.nStocks")}</option>
                            <option value={100}>100 {t("tp.nStocks")}</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-[var(--color-b-muted)] mb-1">{t("tp.pastScans")}</label>
                        <select
                            value={selectedHistoryId}
                            onChange={handleHistoryChange}
                            className="bg-[#1e2329] border border-[var(--color-b-border)] text-white px-3 py-2 rounded focus:outline-none"
                        >
                            <option value="">{t("tp.newScanOpt")}</option>
                            {historyDates.map(d => (
                                <option key={d.id} value={d.id}>{d.run_date}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col justify-end">
                        <button 
                            onClick={() => requireAuth(handleScan)}
                            disabled={loading}
                            className="px-6 py-2 h-[42px] bg-[var(--color-b-yellow)] text-black font-bold rounded hover:bg-yellow-500 transition-colors"
                        >
                            {loading ? t("tp.scanning") : t("tp.startScan")}
                        </button>
                    </div>
                    {picks && picks.length > 0 && (
                        <div className="flex flex-col justify-end">
                            <button 
                                onClick={handleSendTelegram}
                                disabled={loading}
                                className="px-6 py-2 h-[42px] bg-[#24A1DE] text-white font-medium rounded hover:bg-[#1d82b5] transition-colors flex items-center gap-2"
                            >
                                {t("tp.sendTelegram")}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-b-muted)] border-2 border-dashed border-[var(--color-b-border)] rounded-lg p-12">
                    <div className="animate-spin text-5xl mb-4">⏳</div>
                    <h2 className="text-xl font-bold text-white mb-2">{t("tp.scanningTitle")}</h2>
                    <p className="mb-6">{t("tp.scanningDesc")}</p>
                    
                    <div className="w-full max-w-lg bg-[#181a20] p-4 rounded-lg border border-[var(--color-b-border)]">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-[var(--color-b-yellow)]">{tp(scanText)}</span>
                            <span className="text-sm font-bold text-white">{scanProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[var(--color-b-yellow)] transition-all duration-500 ease-out"
                                style={{ width: `${scanProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ) : picks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-b-muted)] border-2 border-dashed border-[var(--color-b-border)] rounded-lg p-12">
                    <div className="text-6xl mb-4">🤖</div>
                    <h2 className="text-xl font-bold text-white mb-2">{t("tp.noScanTitle")}</h2>
                    <p>{t("tp.noScanDesc")}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="glass-panel overflow-hidden rounded-lg">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-[#1e2329] text-[var(--color-b-muted)] sticky top-0">
                                <tr>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("tp.colRank")}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white" onClick={() => requestSort('ticker')}>{t("tp.colStock")}{renderSortArrow('ticker')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white" onClick={() => requestSort('fiyat')}>{t("tp.colPrice")}{renderSortArrow('fiyat')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold text-center cursor-pointer hover:text-white tip" data-tip={t("tip.hybridScore")} onClick={() => requestSort('kompozit_skor')}>{t("tp.colHybrid")}{renderSortArrow('kompozit_skor')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white tip" data-tip={t("tip.confidence")} onClick={() => requestSort('pgs')}>{t("tp.colConfidence")}{renderSortArrow('pgs')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold text-center tip" data-tip={t("tip.weight")}>{t("tp.colWeight")}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white tip" data-tip={t("tip.fundamental")} onClick={() => requestSort('temel_durum')}>{t("tp.colFundamental")}{renderSortArrow('temel_durum')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white tip" data-tip={t("tip.decision")} onClick={() => requestSort('karar')}>{t("tp.colDecision")}{renderSortArrow('karar')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold cursor-pointer hover:text-white tip" data-tip={t("tip.graham")} onClick={() => requestSort('graham_value')}>{t("tp.colGraham")}{renderSortArrow('graham_value')}</th>
                                    <th className="p-4 border-b border-[var(--color-b-border)] font-semibold text-center">{t("tp.colAction")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPicks.map((row: any, i: number) => {
                                    const score = row.kompozit_skor || 0;
                                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                                    const tckr = row.ticker || row.Hisse;
                                    const prc = row.fiyat || row.Fiyat || 0;
                                    
                                    return (
                                    <tr key={i} className="hover:bg-[#1e2329] transition-colors border-b border-[var(--color-b-border)]">
                                        <td className="p-4 font-bold text-xl">{medal}</td>
                                        <td className="p-4 font-bold text-[var(--color-b-yellow)] text-lg">
                                            {tckr}
                                            {nameOf(tckr) && (
                                                <div className="text-xs text-white font-normal truncate max-w-[180px]">{nameOf(tckr)}</div>
                                            )}
                                            <div className="text-xs text-[var(--color-b-muted)] font-normal">{row.sektor || "-"}</div>
                                        </td>
                                        <td className="p-4 text-white font-medium">
                                            ${prc?.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded font-bold ${getScoreColor(score)}`}>
                                                {score} / 100
                                            </span>
                                        </td>
                                        <td className={`p-4 font-bold ${row.pgs >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                                            {row.pgs || "-"}
                                        </td>
                                        <td className="p-4 text-center">
                                            {row.risk_position && row.risk_position.suggested_weight_pct > 0 ? (
                                                <div>
                                                    <span className="font-bold text-cyan-400">%{row.risk_position.suggested_weight_pct.toFixed(1)}</span>
                                                    <div className="text-[10px] text-[var(--color-b-muted)] tip" data-tip={t("tip.stopLoss")}>SL: ${Number(row.risk_position.stop_loss).toFixed(2)}</div>
                                                </div>
                                            ) : <span className="text-[var(--color-b-muted)]">-</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 text-xs rounded bg-[#181a20] border border-[var(--color-b-border)]">
                                                {tv(row.temel_durum || "-")}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-bold ${String(row.karar).includes("AL") || String(row.karar).includes("Lider") ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {tv(row.karar || "-")}
                                        </td>
                                        <td className="p-4 text-white font-medium">
                                            {typeof row.graham_value === 'number' ? `$${row.graham_value.toFixed(2)}` : row.graham_value || "-"}
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setAiProps({ ticker: tckr, price: prc });
                                                    setAiModalOpen(true);
                                                }}
                                                className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700 hover:bg-purple-600 hover:text-white px-3 py-1 rounded transition-colors"
                                            >
                                                ✨ {t("sc.aiAnalyze")}
                                            </button>
                                            <button
                                                onClick={() => requireAuth(() => openModal(tckr, prc))}
                                                className="text-xs bg-[#1e2329] text-[var(--color-b-green)] hover:bg-[var(--color-b-green)] hover:text-black border border-[var(--color-b-green)] px-3 py-1 rounded transition-colors"
                                            >
                                                {t("sc.addPortfolio")}
                                            </button>
                                            <button
                                                onClick={() => handleAddToAlphaRank(tckr)}
                                                className="text-xs bg-[#1e2329] text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500 px-3 py-1 rounded transition-colors"
                                            >
                                                AlphaRank
                                            </button>
                                            <button
                                                onClick={() => addTickerToWatchlist(tckr)}
                                                className="text-xs bg-[#1e2329] text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500 px-3 py-1 rounded transition-colors"
                                            >
                                                {t("sc.addWatch")}
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedPicks.map((pick: any, idx: number) => (
                            <div key={idx} className="glass-panel p-4 rounded-lg border-t-2" style={{ borderTopColor: pick.kompozit_skor >= 70 ? '#22c55e' : '#eab308' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-xl text-white">{pick.ticker}</div>
                                    <div className="text-sm px-2 py-1 bg-[#181a20] rounded border border-gray-700">{tv(pick.karar)}</div>
                                </div>
                                <div className="flex justify-between text-sm text-[var(--color-b-muted)] mb-4">
                                    <span>{t("tp.cardScore")}: <strong className="text-white">{pick.kompozit_skor}</strong></span>
                                    <span>{t("tp.cardConfidence")}: <strong className="text-white">{pick.pgs}</strong></span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-[#1e2329] p-2 rounded">
                                        <div className="text-gray-500">{t("tp.fundScore")}</div>
                                        <div className="text-white font-bold">{pick.temel_skor || "-"}</div>
                                    </div>
                                    <div className="bg-[#1e2329] p-2 rounded">
                                        <div className="text-gray-500">{t("tp.techScore")}</div>
                                        <div className="text-white font-bold">{pick.teknik_skor || "-"}</div>
                                    </div>
                                    <div className="bg-[#1e2329] p-2 rounded">
                                        <div className="text-gray-500">F/K</div>
                                        <div className="text-white font-bold">{pick.pe || "-"}</div>
                                    </div>
                                    <div className="bg-[#1e2329] p-2 rounded">
                                        <div className="text-gray-500">PD/DD</div>
                                        <div className="text-white font-bold">{pick.pb || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Portfolio Add Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#181a20] border border-[var(--color-b-border)] rounded-lg shadow-xl w-[400px] flex flex-col overflow-hidden">
                        <div className="bg-[#1e2329] p-4 flex justify-between items-center border-b border-[var(--color-b-border)]">
                            <h3 className="font-bold text-lg text-white">{t("sc.modalAddTitle")}{modalTicker}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-[var(--color-b-muted)] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handlePortfolioAdd} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("sc.modalTicker")}</label>
                                <input type="text" value={modalTicker} disabled className="w-full bg-[#2b3139] border border-[var(--color-b-border)] rounded p-2 text-white disabled:opacity-70" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("sc.modalCost")}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={modalPrice} 
                                    onChange={(e) => setModalPrice(e.target.value)}
                                    className="w-full bg-[#181a20] border border-[var(--color-b-border)] focus:border-[var(--color-b-yellow)] focus:outline-none rounded p-2 text-white" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("sc.modalQty")}</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={modalQty}
                                    onChange={(e) => setModalQty(e.target.value)}
                                    className="w-full bg-[#181a20] border border-[var(--color-b-border)] focus:border-[var(--color-b-yellow)] focus:outline-none rounded p-2 text-white" 
                                />
                            </div>
                            
                            <div className="mt-4 flex gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 p-2 rounded border border-[var(--color-b-border)] hover:bg-[#2b3139] transition-colors">
                                    {t("sc.cancel")}
                                </button>
                                <button type="submit" className="flex-1 p-2 rounded bg-[var(--color-b-yellow)] text-black font-bold hover:bg-yellow-500 transition-colors">
                                    {t("sc.buySave")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
            <AIAnalyzeModal 
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                {...aiProps}
            />
        <AuthModal />
        </>
    );
}
