"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import AIAnalyzeModal from "../components/AIAnalyzeModal";
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import { useT } from "@/lib/i18n";

export default function PortfolioPage() {
    const t = useT();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [positions, setPositions] = useState([]);
    const [livePrices, setLivePrices] = useState<any>({});
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newTicker, setNewTicker] = useState("");
    const [newQuantity, setNewQuantity] = useState("");
    const [newPrice, setNewPrice] = useState("");

    // AI Modal State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiProps, setAiProps] = useState<any>({ ticker: "", price: 0 });
    const [newDate, setNewDate] = useState("");

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<any>(null);
    const [editQuantity, setEditQuantity] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editDate, setEditDate] = useState("");

    // Close Modal State
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [closingTrade, setClosingTrade] = useState<any>(null);
    const [closePrice, setClosePrice] = useState("");


    // Optimize Modal State
    const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);
    const [optimizeRisk, setOptimizeRisk] = useState("Medium");
    const [optimizeLoading, setOptimizeLoading] = useState(false);
    const [optimizeResult, setOptimizeResult] = useState<any>(null);


    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            const res = await api.get('/portfolio/');
            if (res.data && res.data.data) {
                setPositions(res.data.data);
                
                // Fetch live prices for all positions
                const tickers = res.data.data.map((p: any) => p.ticker);
                if (tickers.length > 0) {
                    const priceRes = await api.post('/data/prices/batch', { tickers });
                    if (priceRes.data && priceRes.data.data) {
                        setLivePrices(priceRes.data.data);
                    }
                }
            }
            
            // Fetch portfolio analysis (fundamental)
            const anaRes = await api.get('/portfolio/analysis');
            if (anaRes.data && anaRes.data.data) {
                setAnalysis(anaRes.data.data);
            }
        } catch (error) {
            console.error("Portföy yüklenemedi:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const performAdd = async () => {
            try {
                await api.post('/portfolio/transaction', {
                    ticker: newTicker,
                    type: "ALIS",
                    quantity: parseFloat(newQuantity),
                    price: parseFloat(newPrice),
                    date: newDate || undefined
                });
                setShowModal(false);
                setNewTicker("");
                setNewQuantity("");
                setNewPrice("");
                setNewDate("");
                fetchPortfolio();
                toast.success(t("pf.tradeAdded"));
            } catch (error) {
                console.error("İşlem eklenemedi:", error);
                toast.error(t("pf.tradeAddError"));
            }
        };

        const existing = positions.find((p: any) => p.ticker === newTicker.toUpperCase());
        if (existing) {
            toast((to) => (
                <div className="flex flex-col gap-3">
                    <span className="font-medium text-white">{t("pf.dupConfirm").replace("{t}", newTicker.toUpperCase())}</span>
                    <div className="flex gap-2 justify-end">
                        <button className="px-3 py-1 bg-[#2b3139] hover:bg-[#3b4149] text-white rounded transition-colors text-sm" onClick={() => toast.dismiss(to.id)}>{t("pf.cancel")}</button>
                        <button className="px-3 py-1 bg-[var(--color-b-yellow)] hover:bg-yellow-400 text-black font-bold rounded transition-colors text-sm" onClick={() => {
                            toast.dismiss(to.id);
                            performAdd();
                        }}>{t("pf.confirm")}</button>
                    </div>
                </div>
            ), { duration: Infinity, style: { background: '#1e2329', border: '1px solid #2b3139', color: '#fff' } });
            return;
        }
        
        performAdd();
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put('/portfolio/edit', {
                trade_id: editingTrade.id,
                adet: parseFloat(editQuantity),
                fiyat: parseFloat(editPrice),
                tarih: editDate || undefined
            });
            setEditModalOpen(false);
            fetchPortfolio();
        } catch (error) {
            console.error("Güncellenemedi:", error);
            toast.error(t("pf.updateError"));
        }
    };

    const handleCloseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/portfolio/close', {
                trade_id: closingTrade.id,
                satis_fiyati: parseFloat(closePrice)
            });
            setCloseModalOpen(false);
            fetchPortfolio();
        } catch (error) {
            console.error("Kapatılamadı:", error);
            toast.error(t("pf.closeError"));
        }
    };

    const handleAddToAlphaRank = async (ticker: string) => {
        try {
            const res = await api.post('/alpharank/pool/add', { ticker });
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t("sc.alphaError"));
        }
    };

    const handleOptimize = async () => {
        if (positions.length < 2) {
            toast.error(t("pf.minTwoOpt"));
            return;
        }
        setOptimizeLoading(true);
        setOptimizeResult(null);
        try {
            const uniqueTickers = Array.from(new Set(positions.map((p: any) => p.ticker)));
            const res = await api.post('/portfolio/optimize', {
                tickers: uniqueTickers,
                risk_profile: optimizeRisk
            });
            if (res.data.status === "success") {
                setOptimizeResult(res.data);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || t("pf.optFail"));
        } finally {
            setOptimizeLoading(false);
        }
    };

    const [refreshingPrices, setRefreshingPrices] = useState(false);
    const handleRefreshPrices = async () => {
        setRefreshingPrices(true);
        try {
            const tickers = positions.map((p: any) => p.ticker);
            if (tickers.length > 0) {
                const priceRes = await api.post('/data/prices/batch', { tickers });
                if (priceRes.data && priceRes.data.data) {
                    setLivePrices(priceRes.data.data);
                }
            }
        } catch (error) {
            console.error("Fiyatlar güncellenemedi:", error);
        } finally {
            setRefreshingPrices(false);
        }
    };

    // Calculate Portfolio Totals
    let totalInvestment = 0;
    let totalCurrentValue = 0;

    positions.forEach((row: any) => {
        const liveData = livePrices[row.ticker];
        totalInvestment += (row.alis_fiyati * row.adet);
        if (liveData) {
            totalCurrentValue += (liveData.price * row.adet);
        } else {
            // Fallback to purchase price if live data not loaded yet
            totalCurrentValue += (row.alis_fiyati * row.adet);
        }
    });

    const netProfitAmount = totalCurrentValue - totalInvestment;
    const netProfitPercentage = totalInvestment > 0 ? (netProfitAmount / totalInvestment) * 100 : 0;

    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t("pf.title")}</h1>
                    <p className="text-[var(--color-b-muted)]">{t("pf.subtitle")}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleRefreshPrices} 
                        disabled={refreshingPrices}
                        className="px-6 py-3 bg-[#1e2329] border border-[var(--color-b-border)] text-white font-bold rounded hover:bg-gray-700 transition-colors flex items-center gap-2"
                        title={t("pf.refreshPrices")}
                    >
                        {refreshingPrices ? t("pf.refreshing") : t("pf.refreshPrices")}
                    </button>
                    <button 
                        onClick={() => requireAuth(() => {
                            if(positions.length < 2) {
                                toast.success(t("pf.minTwoOpt2"));
                                return;
                            }
                            setOptimizeModalOpen(true);
                        })}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 transition-colors flex items-center gap-2"
                    >
                        {t("pf.optimizeAi")}
                    </button>
                    <button
                        onClick={() => requireAuth(() => setShowModal(true))}
                        className="px-6 py-3 bg-[var(--color-b-green)] text-black font-bold rounded hover:bg-green-500 transition-colors flex items-center gap-2"
                    >
                        {t("pf.newTrade")}
                    </button>
                </div>
            </div>
            
            {/* Financial Summary Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                <div className="glass-panel p-4 rounded-lg flex flex-col justify-center border-l-4 border-blue-500">
                    <span className="text-xs text-[var(--color-b-muted)]">{t("pf.totalInvest")}</span>
                    <span className="text-xl font-bold text-white">${totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="glass-panel p-4 rounded-lg flex flex-col justify-center border-l-4 border-purple-500">
                    <span className="text-xs text-[var(--color-b-muted)]">{t("pf.portfolioValue")}</span>
                    <span className="text-xl font-bold text-white">${totalCurrentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className={`glass-panel p-4 rounded-lg flex flex-col justify-center border-l-4 ${netProfitAmount >= 0 ? 'border-[var(--color-b-green)]' : 'border-[var(--color-b-red)]'}`}>
                    <span className="text-xs text-[var(--color-b-muted)]">{t("pf.netPnl")}</span>
                    <div className="flex items-center gap-3">
                        <span className={`text-xl font-bold ${netProfitAmount >= 0 ? 'text-[var(--color-b-green)]' : 'text-[var(--color-b-red)]'}`}>
                            {netProfitAmount > 0 ? "+" : ""}${netProfitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${netProfitAmount >= 0 ? 'bg-green-900/30 text-[var(--color-b-green)]' : 'bg-red-900/30 text-[var(--color-b-red)]'}`}>
                            {netProfitPercentage > 0 ? "+" : ""}{netProfitPercentage.toFixed(2)}%
                        </span>
                    </div>
                </div>
                
                {/* Fundamental Analysis Mini-Widgets (Shrunk) */}
                {analysis && positions.length > 0 ? (
                    <div className="glass-panel p-3 rounded-lg flex flex-col justify-between border-l-4 border-gray-600">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-[var(--color-b-muted)]">{t("pf.avgPe")}</span>
                            <span className="text-sm font-bold text-white">{analysis.weighted_pe > 0 ? analysis.weighted_pe.toFixed(2) : "-"}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-[var(--color-b-muted)]">{t("pf.avgPb")}</span>
                            <span className="text-sm font-bold text-white">{analysis.weighted_pb > 0 ? analysis.weighted_pb.toFixed(2) : "-"}</span>
                        </div>
                        <div className="flex gap-1 overflow-hidden h-1.5 rounded bg-[#181a20]">
                            {analysis.sectors.slice(0, 3).map((sec: any) => (
                                <div key={sec.name} className="h-full bg-indigo-500 border-r border-[#181a20]" style={{width: `${sec.percentage}%`}} title={`${sec.name} (%${sec.percentage.toFixed(1)})`}></div>
                            ))}
                        </div>
                        <span className="text-[8px] text-[var(--color-b-muted)] mt-1 truncate" title={t("pf.topSectors")}>{t("pf.sectorDist")}</span>
                    </div>
                ) : (
                    <div className="glass-panel p-3 rounded-lg flex items-center justify-center border-l-4 border-gray-600">
                        <span className="text-xs text-[var(--color-b-muted)]">{t("pf.fundWaiting")}</span>
                    </div>
                )}
            </div>
            
            <div className="glass-panel flex-1 overflow-auto rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1e2329] text-[var(--color-b-muted)] text-sm sticky top-0">
                        <tr>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colStock")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colQty")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colCost")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colBuyAmount")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colCurrent")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold">{t("pf.colPnl")}</th>
                            <th className="p-4 border-b border-[var(--color-b-border)] font-semibold text-right">{t("pf.colAction")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-[var(--color-b-muted)]">
                                    {t("pf.priceLoading")}
                                </td>
                            </tr>
                        ) : positions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-[var(--color-b-muted)]">
                                    <div className="text-5xl mb-4">💼</div>
                                    {t("pf.noPositions")}
                                </td>
                            </tr>
                        ) : (
                            positions.map((row: any, i: number) => {
                                const liveData = livePrices[row.ticker];
                                const plAmount = liveData ? (liveData.price - row.alis_fiyati) * row.adet : 0;
                                const plPct = liveData ? ((liveData.price - row.alis_fiyati) / row.alis_fiyati) * 100 : 0;
                                
                                return (
                                <tr key={i} className="hover:bg-[#1e2329] transition-colors border-b border-[var(--color-b-border)]">
                                    <td className="p-4">
                                        <div className="font-bold text-[var(--color-b-yellow)] text-lg">{row.ticker}</div>
                                        <div className="text-xs text-[var(--color-b-muted)]">{row.alis_tarihi}</div>
                                    </td>
                                    <td className="p-4 text-white font-medium">{row.adet} {t("pf.lot")}</td>
                                    <td className="p-4 text-white font-medium">${row.alis_fiyati}</td>
                                    <td className="p-4 text-[var(--color-b-muted)] font-medium">
                                        ${(row.adet * row.alis_fiyati).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-white font-medium">
                                        {liveData ? `$${liveData.price}` : t("pf.priceLoading")}
                                    </td>
                                    <td className="p-4 font-bold">
                                        {liveData ? (
                                            <div className={`flex flex-col ${plAmount > 0 ? "text-[var(--color-b-green)]" : plAmount < 0 ? "text-[var(--color-b-red)]" : "text-[var(--color-b-muted)]"}`}>
                                                <span>{plAmount > 0 ? "+" : ""}${plAmount.toFixed(2)}</span>
                                                <span className="text-xs">{plPct > 0 ? "+" : ""}{plPct.toFixed(2)}%</span>
                                            </div>
                                        ) : "-"}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2 items-center">
                                        <button 
                                            onClick={() => {
                                                setAiProps({ ticker: row.ticker, price: liveData ? liveData.price : row.alis_fiyati });
                                                setAiModalOpen(true);
                                            }}
                                            className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700 font-bold px-3 py-1 rounded hover:bg-purple-600 hover:text-white transition-colors"
                                        >
                                            ✨ AI
                                        </button>
                                        <button 
                                            onClick={() => handleAddToAlphaRank(row.ticker)}
                                            className="text-xs bg-[#1e2329] text-blue-400 font-bold border border-blue-500 px-3 py-1 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                        >
                                            AlphaRank
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingTrade(row);
                                                setEditQuantity(row.adet.toString());
                                                setEditPrice(row.alis_fiyati.toString());
                                                setEditDate(row.alis_tarihi.replace(" ", "T"));
                                                setEditModalOpen(true);
                                            }}
                                            className="text-xs bg-gray-700 text-white font-bold px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                                        >
                                            {t("pf.edit")}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setClosingTrade(row);
                                                setClosePrice(liveData ? liveData.price.toString() : row.alis_fiyati.toString());
                                                setCloseModalOpen(true);
                                            }}
                                            className="text-xs bg-[var(--color-b-red)] text-black font-bold px-3 py-1 rounded hover:bg-red-500 transition-colors"
                                        >
                                            {t("pf.close")}
                                        </button>
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
        </div>
            
            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-[#181a20] p-6 rounded-lg border border-[var(--color-b-border)] w-96 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{t("pf.addModalTitle")}</h2>
                        <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fTicker")}</label>
                                <SymbolAutocomplete
                                    value={newTicker}
                                    onChange={(val) => setNewTicker(val)}
                                    placeholder={t("pf.fTickerPh")}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fQty")}</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="0.1" 
                                    step="0.1"
                                    value={newQuantity}
                                    onChange={(e) => setNewQuantity(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fCost")}</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fBuyDate")}</label>
                                <input 
                                    type="datetime-local" 
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-muted)] focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-[var(--color-b-border)] rounded text-[var(--color-b-muted)] hover:text-white"
                                >
                                    {t("pf.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[var(--color-b-green)] text-black font-bold rounded hover:bg-green-500"
                                >
                                    {t("pf.save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModalOpen && editingTrade && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-[#181a20] p-6 rounded-lg border border-[var(--color-b-border)] w-96 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{t("pf.editTitle")}{editingTrade.ticker}</h2>
                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fQty")}</label>
                                <input 
                                    type="number" required min="0.1" step="0.1"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fCost")}</label>
                                <input
                                    type="number" required min="0.01" step="0.01"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.fBuyDateReq")}</label>
                                <input
                                    type="datetime-local"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-muted)] focus:outline-none focus:border-[var(--color-b-yellow)]" 
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 border border-[var(--color-b-border)] rounded text-[var(--color-b-muted)] hover:text-white">{t("pf.cancel")}</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--color-b-yellow)] text-black font-bold rounded hover:bg-yellow-500">{t("pf.update")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Modal */}
            {closeModalOpen && closingTrade && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-[#181a20] p-6 rounded-lg border border-[var(--color-b-border)] w-96 shadow-2xl">
                        <h2 className="text-xl font-bold text-[var(--color-b-red)] mb-4">{t("pf.closeTitle")}{closingTrade.ticker}</h2>
                        <form onSubmit={handleCloseSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.sellPrice")}</label>
                                <input 
                                    type="number" required min="0.01" step="0.01"
                                    value={closePrice}
                                    onChange={(e) => setClosePrice(e.target.value)}
                                    className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-[var(--color-b-red)]" 
                                />
                            </div>
                            <div className="text-xs text-[var(--color-b-muted)] mt-2">
                                {t("pf.closeNote")}
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setCloseModalOpen(false)} className="px-4 py-2 border border-[var(--color-b-border)] rounded text-[var(--color-b-muted)] hover:text-white">{t("pf.cancel")}</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--color-b-red)] text-black font-bold rounded hover:bg-red-500">{t("pf.confirmSell")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AIAnalyzeModal 
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                {...aiProps}
            />

            {/* Optimize Modal */}
            {optimizeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-[#181a20] p-6 rounded-lg border border-[var(--color-b-border)] w-[600px] shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-indigo-400">{t("pf.optTitle")}</h2>
                            <button onClick={() => setOptimizeModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        {!optimizeResult ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-[var(--color-b-muted)]">
                                    {t("pf.optIntro")}
                                </p>

                                <div>
                                    <label className="block text-sm text-[var(--color-b-muted)] mb-1">{t("pf.riskProfile")}</label>
                                    <select
                                        value={optimizeRisk}
                                        onChange={(e) => setOptimizeRisk(e.target.value)}
                                        className="w-full p-2 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="Low">{t("pf.riskLow")}</option>
                                        <option value="Medium">{t("pf.riskMedium")}</option>
                                        <option value="High">{t("pf.riskHigh")}</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleOptimize}
                                    disabled={optimizeLoading}
                                    className="mt-4 px-4 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {optimizeLoading ? t("pf.optCalculating") : t("pf.optStart")}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#1e2329] p-4 rounded text-center border border-[var(--color-b-border)]">
                                        <div className="text-xs text-[var(--color-b-muted)]">{t("pf.expReturn")}</div>
                                        <div className="text-xl font-bold text-[var(--color-b-green)]">% {optimizeResult.optimization.metrics.expected_annual_return_pct}</div>
                                    </div>
                                    <div className="bg-[#1e2329] p-4 rounded text-center border border-[var(--color-b-border)]">
                                        <div className="text-xs text-[var(--color-b-muted)]">{t("pf.annualVol")}</div>
                                        <div className="text-xl font-bold text-[var(--color-b-red)]">% {optimizeResult.optimization.metrics.expected_annual_volatility_pct}</div>
                                    </div>
                                    <div className="bg-[#1e2329] p-4 rounded text-center border border-[var(--color-b-border)]">
                                        <div className="text-xs text-[var(--color-b-muted)]">{t("pf.sharpe")}</div>
                                        <div className="text-xl font-bold text-white">{optimizeResult.optimization.metrics.sharpe_ratio}</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">{t("pf.optimalAlloc")}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(optimizeResult.optimization.weights).map(([ticker, weight]: any) => (
                                            <div key={ticker} className="flex justify-between items-center bg-[#1e2329] p-3 rounded border border-[var(--color-b-border)]">
                                                <span className="font-bold text-[var(--color-b-yellow)]">{ticker}</span>
                                                <span className="text-white">% {weight}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded text-indigo-100 text-sm leading-relaxed">
                                    <h3 className="text-lg font-bold text-indigo-400 mb-2">{t("pf.aiEval")}</h3>
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(optimizeResult.ai_commentary.replace(/\n/g, '<br/>')) }} />
                                </div>

                                <button
                                    onClick={() => setOptimizeModalOpen(false)}
                                    className="px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-500"
                                >
                                    {t("pf.close")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        <AuthModal />
        </>
    );
}
