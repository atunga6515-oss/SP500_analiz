"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useT, useLang, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useT();
    const { lang, setLang } = useLang();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    
    // İletişim Formu State'leri
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactMessage, setContactMessage] = useState("");
    const [contactLoading, setContactLoading] = useState(false);
    const [contactResult, setContactResult] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        if (searchParams.get("registered") === "1") {
            setInfo(t("auth.registered"));
        }
        if (searchParams.get("msg") === "test_features") {
            setInfo(t("auth.testFeatures"));
        }
    }, [searchParams, t]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError(t("auth.emptyFields"));
            return;
        }
        setLoading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("username", username);
            formData.append("password", password);

            const res = await api.post("/auth/token", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            // Auth sadece HttpOnly cookie (backend set ediyor).
            // localStorage: yalnızca görüntüleme amaçlı kullanıcı adı ve rol cache'i.
            localStorage.setItem("username", res.data.username || username);
            localStorage.setItem("role", res.data.role || "user");

            const redirectUrl = searchParams.get("redirect") || "/";
            // Next.js Router Cache'i temizlemek ve tam sayfa yüklemesi (hard navigation) 
            // yapmak için window.location.href kullanıyoruz. Bu sayede middleware redirect cache'i silinir.
            window.location.href = redirectUrl;
        } catch (err: any) {
            setError(
                err?.response?.data?.detail || t("auth.loginError")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName || !contactEmail || !contactMessage) {
            setContactResult({ type: 'error', text: t("contact.fillFields") });
            return;
        }
        setContactLoading(true);
        setContactResult(null);
        try {
            await api.post("/auth/contact-admin", {
                name: contactName,
                email: contactEmail,
                message: contactMessage
            });
            setContactResult({ type: 'success', text: t("contact.success") });
            setContactName("");
            setContactEmail("");
            setContactMessage("");
        } catch (err: any) {
            setContactResult({ type: 'error', text: t("contact.error") });
        } finally {
            setContactLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-b-bg)] relative overflow-hidden">
            <div className="absolute top-4 right-4 z-20 flex items-center rounded-full border border-[var(--color-b-border)] overflow-hidden text-xs font-bold">
                {SUPPORTED_LANGS.map((lng: Lang) => (
                    <button
                        key={lng}
                        onClick={() => setLang(lng)}
                        className={`px-2.5 py-1 transition-colors ${lang === lng ? "bg-[var(--color-b-yellow)] text-[#181a20]" : "text-[var(--color-b-muted)] hover:text-white"}`}
                    >
                        {lng.toUpperCase()}
                    </button>
                ))}
            </div>
            {/* Decorative background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-b-yellow)] opacity-5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-b-yellow)] flex items-center justify-center font-black text-[#181a20] text-3xl shadow-lg shadow-[rgba(252,213,53,0.3)]">
                            α
                        </div>
                        <span className="text-3xl font-black text-white tracking-tight">{t("auth.brandShort")}</span>
                    </div>
                    <p className="text-[var(--color-b-muted)] text-sm">
                        {t("auth.subtitleStock")}
                    </p>
                </div>

                {/* Card */}
                <div className="glass-panel p-8 rounded-2xl border border-[var(--color-b-border)] shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-1">{t("auth.loginTitle")}</h2>
                    <p className="text-[var(--color-b-muted)] text-sm mb-6">
                        {t("auth.loginSubtitle")}
                    </p>

                    {info && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm flex items-center gap-2 mb-4">
                            {info}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-2">
                                {t("auth.username")}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="kullanici_adi"
                                className="w-full px-4 py-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-2">
                                {t("auth.password")}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-[#1e2329] border border-[var(--color-b-border)] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-b-yellow)] transition-colors"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[var(--color-b-yellow)] text-[#181a20] font-bold rounded-lg hover:bg-[#f0c929] transition-colors disabled:opacity-60 text-base shadow-lg shadow-[rgba(252,213,53,0.2)]"
                        >
                            {loading ? t("auth.loggingIn") : t("auth.loginArrow")}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-[var(--color-b-border)] text-center">
                        <button 
                            onClick={() => setShowContactModal(true)}
                            className="text-[var(--color-b-muted)] hover:text-white text-sm underline underline-offset-4 transition-colors"
                        >
                            {t("auth.contactAdminLink")}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-700 mt-6">
                    {t("auth.copyrightShort")}
                </p>
            </div>

            {/* İletişim Modal'ı */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1e2329] border border-[var(--color-b-border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button 
                            onClick={() => setShowContactModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none"
                        >
                            &times;
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-2">{t("contact.title")}</h2>
                        <p className="text-sm text-[var(--color-b-muted)] mb-6">
                            {t("contact.desc")}
                        </p>

                        {contactResult && (
                            <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${contactResult.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                                <span>{contactResult.type === 'success' ? '✅' : '⚠️'}</span>
                                {contactResult.text}
                            </div>
                        )}

                        {!contactResult || contactResult.type === 'error' ? (
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">{t("contact.name")}</label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={e => setContactName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#181a20] border border-[var(--color-b-border)] rounded-lg text-white focus:outline-none focus:border-[var(--color-b-yellow)]"
                                        placeholder={t("contact.namePh")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">{t("contact.email")}</label>
                                    <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#181a20] border border-[var(--color-b-border)] rounded-lg text-white focus:outline-none focus:border-[var(--color-b-yellow)]"
                                        placeholder={t("contact.emailPh")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-b-muted)] mb-1">{t("contact.message")}</label>
                                    <textarea
                                        value={contactMessage}
                                        onChange={e => setContactMessage(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#181a20] border border-[var(--color-b-border)] rounded-lg text-white focus:outline-none focus:border-[var(--color-b-yellow)] min-h-[100px]"
                                        placeholder={t("contact.messagePh")}
                                    />
                                </div>
                                <div className="pt-2">
                                    <button 
                                        type="submit"
                                        disabled={contactLoading}
                                        className="w-full py-3 bg-[var(--color-b-yellow)] text-[#181a20] font-bold rounded-lg hover:bg-[#f0c929] transition-colors disabled:opacity-60"
                                    >
                                        {contactLoading ? t("contact.sending") : t("contact.send")}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="pt-2">
                                <button 
                                    onClick={() => setShowContactModal(false)}
                                    className="w-full py-3 bg-[#2b3139] text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    {t("contact.close")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0b0e14] text-white">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
