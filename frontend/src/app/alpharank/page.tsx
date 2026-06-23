"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import { useT } from "@/lib/i18n";

export default function AlphaRankPage() {
    const t = useT();
    const [pool, setPool] = useState<any[]>([]);
    const [tickerInput, setTickerInput] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // History states
    const [historyDates, setHistoryDates] = useState<any[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState("");

    useEffect(() => {
        fetchPool();
        fetchHistoryDates();
    }, []);

    const fetchHistoryDates = async () => {
        try {
            const res = await api.get('/alpharank/history-dates');
            if (res.data && res.data.dates) {
                setHistoryDates(res.data.dates);
            }
        } catch (error) {
            console.error("Geçmiş tarihler çekilemedi", error);
        }
    };

    const fetchHistoryById = async (id: string) => {
        if (!id) return;
        setAnalyzing(true);
        setError('');
        try {
            const res = await api.get(`/alpharank/history/${id}`);
            if (res.data && res.data.data) {
                setResults(res.data.data);
                setSuccessMsg(t("ar.historyLoaded"));
            }
        } catch (error: any) {
            setError(error.response?.data?.detail || t("ar.historyError"));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleHistoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedHistoryId(id);
        if (id) {
            fetchHistoryById(id);
        } else {
            setResults([]);
        }
    };

    const fetchPool = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alpharank/pool');
            setPool(res.data);
        } catch (err: any) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleAdd = async (tickerToAdd: string) => {
        setError('');
        setSuccessMsg('');
        if (!tickerToAdd.trim()) return;
        
        try {
            const res = await api.post('/alpharank/pool/add', { ticker: tickerToAdd.trim().toUpperCase() });
            setSuccessMsg(res.data.message);
            setTickerInput('');
            fetchPool();
        } catch (err: any) {
            setError(err.response?.data?.detail || t("ar.addError"));
        }
    };

    const handleRemove = async (ticker: string) => {
        setError('');
        setSuccessMsg('');
        try {
            const res = await api.delete(`/alpharank/pool/remove/${ticker}`);
            setSuccessMsg(res.data.message);
            fetchPool();
        } catch (err: any) {
            setError(err.response?.data?.detail || t("ar.removeError"));
        }
    };

    const handleClear = async () => {
        try {
            await api.delete('/alpharank/pool/clear');
            setSuccessMsg(t("ar.cleared"));
            fetchPool();
            setResults([]);
        } catch (err: any) {
            setError(t("ar.clearError"));
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setError('');
        setSuccessMsg('');
        try {
            const res = await api.get('/alpharank/analyze');
            setResults(res.data.data);
            setSuccessMsg(t("ar.analyzeDone"));
            fetchHistoryDates(); // Yeni analizden sonra geçmiş listesini yenile
            setSelectedHistoryId(""); // Dropdown'ı sıfırla
        } catch (err: any) {
            setError(err.response?.data?.detail || t("ar.analyzeFail"));
        }
        setAnalyzing(false);
    };

    const handleTelegram = async () => {
        setError('');
        setSuccessMsg('');
        try {
            const res = await api.post('/alpharank/telegram');
            setSuccessMsg(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.detail || t("ar.tgFail"));
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">{t("ar.title")}</h1>
                <p className="text-gray-400">{t("ar.subtitle")}</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4">
                    {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol Panel: Havuz Yönetimi */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-blue-400">{t("ar.poolTitle")}</h2>
                        <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-700/50">
                            {pool.length} / 10
                        </span>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <SymbolAutocomplete
                            placeholder={t("ar.tickerPh")}
                            value={tickerInput}
                            onChange={(val) => setTickerInput(val)}
                            onSelect={(val) => handleAdd(val)}
                            className="flex-1"
                        />
                    </div>

                    <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-2">
                        {pool.length === 0 ? (
                            <p className="text-gray-400 text-center text-sm py-4">{t("ar.poolEmpty")}</p>
                        ) : (
                            pool.map((item) => (
                                <div key={item.ticker} className="flex justify-between items-center bg-gray-700/50 p-3 rounded border border-gray-600">
                                    <span className="font-bold text-white">{item.ticker.replace('.IS', '')}</span>
                                    <button 
                                        onClick={() => handleRemove(item.ticker)}
                                        className="text-red-400 hover:text-red-300 text-sm hover:underline"
                                    >
                                        {t("ar.remove")}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="mb-4">
                            <label className="block text-xs text-gray-400 mb-1">{t("ar.pastAnalyses")}</label>
                            <select
                                value={selectedHistoryId}
                                onChange={handleHistoryChange}
                                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="">{t("ar.newAnalysisOpt")}</option>
                                {historyDates.map(d => (
                                    <option key={d.id} value={d.id}>{d.run_date}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button
                            onClick={handleAnalyze}
                            disabled={pool.length === 0 || analyzing}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded shadow-lg disabled:opacity-50 transition-colors"
                        >
                            {analyzing ? t("common.loading") : t("ar.startAnalysis")}
                        </button>
                        {pool.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="w-full bg-red-900/40 hover:bg-red-800/60 text-red-400 font-medium py-2 rounded border border-red-800 transition-colors"
                            >
                                {t("ar.clearPool")}
                            </button>
                        )}
                    </div>
                </div>

                {/* Sağ Panel: Analiz Sonuçları */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-semibold text-emerald-400">{t("ar.resultsTitle")}</h2>
                        {results.length > 0 && (
                            <button
                                onClick={handleTelegram}
                                className="bg-[#0088cc] hover:bg-[#0077b3] text-white px-4 py-2 rounded font-medium flex items-center gap-2 shadow-lg"
                            >
                                <span>✈️</span> {t("ar.sendTelegram")}
                            </button>
                        )}
                    </div>

                    {analyzing ? (
                        <div className="bg-gray-800 p-10 rounded-lg border border-gray-700 flex flex-col items-center justify-center text-center h-[500px]">
                            <div className="animate-spin text-5xl mb-4">⏳</div>
                            <h3 className="text-xl font-medium text-gray-300 mb-2">{t("ar.analyzingTitle")}</h3>
                            <p className="text-gray-500 max-w-md">
                                {t("ar.analyzingDesc")}
                            </p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="bg-gray-800 p-10 rounded-lg border border-gray-700 flex flex-col items-center justify-center text-center h-[500px]">
                            <span className="text-5xl mb-4">🕵️‍♂️</span>
                            <h3 className="text-xl font-medium text-gray-300 mb-2">{t("ar.noAnalysisTitle")}</h3>
                            <p className="text-gray-500 max-w-md">
                                {t("ar.noAnalysisDesc")}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((res) => (
                                <div key={res.ticker} className="bg-gray-800 rounded-lg p-5 border border-gray-700 shadow-md relative overflow-hidden">
                                    {/* Derece Rozeti */}
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white font-bold text-sm px-4 py-1 rounded-bl-lg">
                                        #{res.rank}
                                    </div>
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{res.ticker}</h3>
                                            <p className="text-gray-400 font-mono">{t("ar.price")}: ${res.price}</p>
                                        </div>
                                        <div className="flex flex-col items-end mr-6">
                                            <span className="text-xs text-gray-400 mb-1">{t("ar.upsideProb")}</span>
                                            <span className={`text-2xl font-bold ${res.score >= 70 ? 'text-green-400' : res.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                %{res.score}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-900/50 rounded p-4 border border-gray-700/50">
                                        <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{t("ar.evidence")}</h4>
                                        <ul className="space-y-2">
                                            {res.evidences.map((ev: string, idx: number) => {
                                                // Dinamik ikon belirleme
                                                let icon = "📌";
                                                if (ev.includes("Pozitif Uyumsuzluk") || ev.includes("Golden Cross")) icon = "🔥";
                                                else if (ev.includes("Momentum") || ev.includes("Trend")) icon = "📈";
                                                else if (ev.includes("Bant Daralması") || ev.includes("Squeeze")) icon = "🎯";
                                                else if (ev.includes("Aşırı Satım")) icon = "💡";
                                                else if (ev.includes("Aşırı Alım")) icon = "⚠️";
                                                
                                                return (
                                                    <li key={idx} className="flex gap-3 text-sm text-gray-300 items-start">
                                                        <span className="mt-0.5">{icon}</span>
                                                        <span>{ev}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
