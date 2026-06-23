"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

const DASHBOARD_MODULES = [
    {
        categoryKey: "nav.group.market",
        items: [
            { href: "/markets", labelKey: "dash.markets.label", icon: "📊", descKey: "dash.markets.desc", color: "from-blue-500 to-cyan-500" },
            { href: "/heatmap", labelKey: "dash.heatmap.label", icon: "🗺️", descKey: "dash.heatmap.desc", color: "from-emerald-500 to-teal-400" },
            { href: "/kap", labelKey: "dash.kap.label", icon: "📰", descKey: "dash.kap.desc", color: "from-gray-500 to-gray-300" },
        ]
    },
    {
        categoryKey: "nav.group.scan",
        items: [
            { href: "/screener", labelKey: "dash.screener.label", icon: "⚡", descKey: "dash.screener.desc", color: "from-yellow-500 to-orange-500" },
            { href: "/top-picks-15d", labelKey: "dash.topPicks15d.label", icon: "🚀", descKey: "dash.topPicks15d.desc", color: "from-green-500 to-emerald-400" },
            { href: "/top-picks", labelKey: "dash.topPicks.label", icon: "🎯", descKey: "dash.topPicks.desc", color: "from-red-500 to-pink-500" },
            { href: "/alpharank", labelKey: "dash.alpharank.label", icon: "📈", descKey: "dash.alpharank.desc", color: "from-purple-600 to-indigo-500" },
        ]
    },
    {
        categoryKey: "nav.group.deep",
        items: [
            { href: "/analysis", labelKey: "dash.analysis.label", icon: "🔬", descKey: "dash.analysis.desc", color: "from-indigo-500 to-blue-500" },
            { href: "/backtest", labelKey: "dash.backtest.label", icon: "⚙️", descKey: "dash.backtest.desc", color: "from-orange-500 to-red-500" },
            { href: "/strategy-compare", labelKey: "dash.strategyCompare.label", icon: "🧪", descKey: "dash.strategyCompare.desc", color: "from-pink-500 to-rose-400" },
            { href: "/risk", labelKey: "dash.risk.label", icon: "⚠️", descKey: "dash.risk.desc", color: "from-red-600 to-orange-600" },
        ]
    },
    {
        categoryKey: "nav.group.account",
        items: [
            { href: "/portfolio", labelKey: "dash.portfolio.label", icon: "💼", descKey: "dash.portfolio.desc", color: "from-green-500 to-emerald-500" },
            { href: "/alarms", labelKey: "dash.alarms.label", icon: "🔔", descKey: "dash.alarms.desc", color: "from-amber-400 to-yellow-500" },
        ]
    }
];

export default function Dashboard() {
    const t = useT();
    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)]">
            {/* Header Section */}
            <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-b-yellow)] to-yellow-200 mb-4 tracking-tight">
                        {t("dash.welcome")}
                    </h1>
                    <p className="text-[var(--color-b-muted)] text-lg max-w-2xl leading-relaxed">
                        {t("dash.intro")}
                    </p>
                </div>
                <Link
                    href="/markets"
                    className="px-6 py-3 bg-[var(--color-b-yellow)] text-[#181a20] font-bold rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(240,201,41,0.2)]"
                >
                    <span>📊</span>
                    {t("dash.goMarkets")}
                </Link>
            </div>

            {/* Modules Grid */}
            <div className="flex flex-col gap-10 pb-12">
                {DASHBOARD_MODULES.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-5">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-white tracking-wide whitespace-nowrap">{t(group.categoryKey)}</h2>
                            <div className="flex-1 h-px bg-gradient-to-r from-[#2b3139] to-transparent"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {group.items.map((item, iIdx) => (
                                <Link 
                                    href={item.href} 
                                    key={iIdx}
                                    className="group relative overflow-hidden rounded-2xl bg-[#1e2329] border border-[#2b3139] hover:border-[var(--color-b-yellow)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:-translate-y-1 flex flex-col h-full min-h-[160px]"
                                >
                                    {/* Gradient Accent Top Bar */}
                                    <div className={`h-1.5 w-full bg-gradient-to-r ${item.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                    
                                    <div className="p-6 flex flex-col flex-1 z-10 bg-gradient-to-b from-transparent to-[#181a20]/30">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-12 h-12 rounded-xl bg-[#181a20] border border-[#2b3139] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                                {item.icon}
                                            </div>
                                            <h3 className="font-bold text-lg text-white group-hover:text-[var(--color-b-yellow)] transition-colors leading-tight">
                                                {t(item.labelKey)}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-[var(--color-b-muted)] leading-relaxed flex-1 mt-1">
                                            {t(item.descKey)}
                                        </p>
                                    </div>
                                    
                                    {/* Subtly animated background glow on hover */}
                                    <div className={`absolute -bottom-12 -right-12 w-40 h-40 bg-gradient-to-br ${item.color} rounded-full blur-[60px] opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none`}></div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
