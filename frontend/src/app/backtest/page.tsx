"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import SymbolAutocomplete from "@/components/SymbolAutocomplete";
import { useT } from "@/lib/i18n";

export default function BacktestPage() {
    const t = useT();
    const { requireAuth, AuthModal } = useRequireAuth();
    const [ticker, setTicker] = useState("");
    const [capital, setCapital] = useState(100000);
    const [days, setDays] = useState(180);
    const [buyThreshold, setBuyThreshold] = useState(65);
    const [sellThreshold, setSellThreshold] = useState(45);
    const [stopLoss, setStopLoss] = useState(5);
    const [takeProfit, setTakeProfit] = useState(15);
    const [slippage, setSlippage] = useState(0.2);
    const [commissionRate, setCommissionRate] = useState(0.002);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runBacktest = async () => {
        if (!ticker) return;
        setLoading(true);
        try {
            const res = await api.post('/backtest/', {
                ticker: ticker.toUpperCase(),
                initial_capital: capital,
                lookback_days: days,
                buy_threshold: buyThreshold,
                sell_threshold: sellThreshold,
                stop_loss_pct: stopLoss,
                take_profit_pct: takeProfit,
                slippage_pct: slippage,
                commission_rate: commissionRate
            });
            if (res.data) {
                setResult(res.data);
            }
        } catch (error) {
            console.error("Backtest hatası", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="flex w-full h-full p-6 flex-col bg-[var(--color-b-bg)] text-[var(--color-b-text)] overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">{t("bt.title")}</h1>
                <p className="text-[var(--color-b-muted)]">{t("bt.subtitle")}</p>
            </div>

            <div className="glass-panel p-6 rounded-lg mb-6 flex gap-6 flex-wrap items-end border border-[var(--color-b-border)]">
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.ticker")}</label>
                    <SymbolAutocomplete
                        value={ticker}
                        onChange={(val) => setTicker(val)}
                        placeholder={t("bt.ticker")}
                        className="w-48"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.capital")}</label>
                    <input 
                        type="number" 
                        value={capital}
                        onChange={(e) => setCapital(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white font-bold w-48 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.duration")}</label>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white font-bold w-48 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    >
                        <option value={90}>{t("bt.dur90")}</option>
                        <option value={180}>{t("bt.dur180")}</option>
                        <option value={365}>{t("bt.dur365")}</option>
                    </select>
                </div>
                
                {/* Yeni Parametreler */}
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.buyScore")}</label>
                    <input 
                        type="number" 
                        value={buyThreshold}
                        onChange={(e) => setBuyThreshold(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-green)] font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.sellScore")}</label>
                    <input 
                        type="number" 
                        value={sellThreshold}
                        onChange={(e) => setSellThreshold(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-red)] font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.stopLoss")}</label>
                    <input 
                        type="number" 
                        value={stopLoss}
                        onChange={(e) => setStopLoss(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-red)] font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.takeProfit")}</label>
                    <input 
                        type="number" 
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-[var(--color-b-green)] font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.slippage")}</label>
                    <input 
                        type="number" 
                        step="0.1"
                        value={slippage}
                        onChange={(e) => setSlippage(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--color-b-muted)] mb-2">{t("bt.commission")}</label>
                    <input 
                        type="number" 
                        step="0.001"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(Number(e.target.value))}
                        className="p-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded text-white font-bold w-32 focus:outline-none focus:border-[var(--color-b-yellow)]"
                    />
                </div>

                <button 
                    onClick={() => requireAuth(runBacktest)}
                    disabled={loading}
                    className="px-8 py-3 bg-[var(--color-b-yellow)] text-black font-bold rounded hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                    {loading ? t("bt.simulating") : t("bt.start")}
                </button>
            </div>

            {result && !result.error && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-[var(--color-b-green)]">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.netReturn")}</p>
                        <h2 className={`text-3xl font-bold ${result.total_return_pct > 0 ? "text-[var(--color-b-green)]" : "text-[var(--color-b-red)]"}`}>
                            %{result.total_return_pct?.toFixed(2)}
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-white">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.riskFree")}</p>
                        <h2 className="text-3xl font-bold text-white">
                            %{result.risk_free_return_pct?.toFixed(2)}
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-[var(--color-b-yellow)]">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.winRate")}</p>
                        <h2 className={`text-3xl font-bold ${result.win_rate > 50 ? "text-[var(--color-b-green)]" : "text-[var(--color-b-red)]"}`}>
                            %{result.win_rate?.toFixed(1)}
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-[var(--color-b-red)]">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.maxDD")}</p>
                        <h2 className="text-3xl font-bold text-[var(--color-b-red)]">
                            %{result.max_drawdown_pct?.toFixed(2)}
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-blue-500">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.tradeCount")}</p>
                        <h2 className="text-3xl font-bold text-white">
                            {result.number_of_trades} {t("bt.trades")}
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-purple-500">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.profitFactor")}</p>
                        <h2 className={`text-3xl font-bold ${result.profit_factor > 1 ? "text-[var(--color-b-green)]" : "text-[var(--color-b-red)]"}`}>
                            {result.profit_factor?.toFixed(2)}
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-lg text-center border-l-4 border-orange-500">
                        <p className="text-[var(--color-b-muted)] mb-2">{t("bt.sharpe")}</p>
                        <h2 className="text-3xl font-bold text-white">
                            {result.sharpe_ratio?.toFixed(2)}
                        </h2>
                    </div>
                </div>
                </>
            )}
            
            {result && result.error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded border border-red-500/30">
                    {result.error}
                </div>
            )}
        </div>
        <AuthModal />
        </>
    );
}
