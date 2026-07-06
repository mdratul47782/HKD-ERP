"use client";

import {
    Database,
    Layers3,
    PlusCircle,
    RefreshCw,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const samplePayload = [
    { sku: "TSH-001", item: "T-Shirt", color: "Olive", qty: 24 },
    { sku: "TRS-014", item: "Trouser", color: "Black", qty: 18 },
    { sku: "JKT-208", item: "Jacket", color: "Sand", qty: 6 },
];

const sampleText = JSON.stringify(samplePayload, null, 2);

export default function JsonDemoPage() {
    const [title, setTitle] = useState("MySQL array test");
    const [payloadText, setPayloadText] = useState(sampleText);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    const parsedPayload = useMemo(() => {
        try {
            const parsed = JSON.parse(payloadText);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }, [payloadText]);

    const fetchRecords = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_URL}/demo/payloads`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to load records.");
            setRecords(data.records || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleSeed = () => {
        setTitle("Sample row from frontend");
        setPayloadText(sampleText);
        setStatus("Loaded sample payload.");
        setError("");
    };

    const handleSave = async () => {
        setStatus("");
        setError("");

        if (!title.trim()) {
            setError("Title is required.");
            return;
        }

        if (!parsedPayload || !parsedPayload.length) {
            setError("Payload must be a valid JSON array with objects.");
            return;
        }

        if (!parsedPayload.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
            setError("Each array item must be an object.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/demo/payloads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, payload: parsedPayload }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Save failed.");

            setStatus("Saved to MySQL.");
            setTitle("");
            setPayloadText(sampleText);
            await fetchRecords();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f4efe7] text-[#21170f] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(184,122,74,0.18),_transparent_36%),radial-gradient(circle_at_85%_10%,_rgba(33,23,15,0.08),_transparent_28%),linear-gradient(180deg,_#f7f1e8_0%,_#efe6da_100%)]" />
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(33,23,15,0.09) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

            <div className="relative max-w-7xl mx-auto px-5 py-8 lg:py-10">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
                    <section className="rounded-[28px] border border-black/5 bg-white/75 backdrop-blur-xl shadow-[0_20px_80px_rgba(43,29,17,0.10)] p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-11 w-11 rounded-2xl bg-[#2a1d12] text-[#f4efe7] flex items-center justify-center shadow-lg shadow-black/10">
                                <Database size={18} />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-[#9f7b5a] font-semibold">MySQL JSON test</p>
                                <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Array of objects saved in one row</h1>
                            </div>
                        </div>

                        <p className="text-sm leading-7 text-[#6c5643] max-w-2xl mb-6">
                            This page posts a JSON array into MySQL, so you can test the full round trip from frontend form data to backend API to stored JSON.
                        </p>

                        <div className="grid gap-4">
                            <label className="grid gap-2">
                                <span className="text-[11px] uppercase tracking-[0.2em] text-[#8d6d50] font-semibold">Title</span>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#b87a4a]"
                                    placeholder="Enter a title for the test row"
                                />
                            </label>

                            <label className="grid gap-2">
                                <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#8d6d50] font-semibold">
                                    <span>Payload JSON array</span>
                                    <button
                                        type="button"
                                        onClick={handleSeed}
                                        className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#b87a4a] hover:text-[#8d5a31]"
                                    >
                                        <Sparkles size={13} /> Load sample
                                    </button>
                                </span>
                                <textarea
                                    value={payloadText}
                                    onChange={(e) => setPayloadText(e.target.value)}
                                    className="min-h-[260px] rounded-[22px] border border-black/10 bg-[#19130f] text-[#f6f0e8] font-mono text-[12px] leading-6 p-4 outline-none focus:border-[#b87a4a]"
                                    spellCheck={false}
                                />
                            </label>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#2a1d12] px-5 py-3 text-sm font-semibold text-[#f4efe7] shadow-lg shadow-black/10 transition hover:bg-[#b87a4a] disabled:opacity-60"
                                >
                                    <PlusCircle size={16} />
                                    {saving ? "Saving..." : "Save to MySQL"}
                                </button>
                                <button
                                    onClick={fetchRecords}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-[#4e3d2e] transition hover:bg-white disabled:opacity-60"
                                >
                                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                    Reload records
                                </button>
                                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                    <ShieldCheck size={14} />
                                    {parsedPayload ? `${parsedPayload.length} object(s) ready` : "Invalid JSON"}
                                </div>
                            </div>

                            {(status || error) && (
                                <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                    {error || status}
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="grid gap-4">
                        <div className="rounded-[28px] border border-black/5 bg-[#22170f] text-[#f4efe7] p-6 shadow-[0_18px_60px_rgba(33,23,15,0.22)]">
                            <div className="flex items-center gap-3 mb-4 text-[#dfb98f]">
                                <Layers3 size={18} />
                                <p className="text-xs uppercase tracking-[0.24em] font-semibold">Stored shape</p>
                            </div>
                            <p className="text-sm leading-7 text-[#d9cab9] mb-4">
                                MySQL stores the full array in one JSON column, and the page reads it back as the same object structure.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-white/8 border border-white/10 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#bfa082]">Endpoint</p>
                                    <p className="mt-1 text-sm font-semibold">/demo/payloads</p>
                                </div>
                                <div className="rounded-2xl bg-white/8 border border-white/10 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#bfa082]">Storage</p>
                                    <p className="mt-1 text-sm font-semibold">JSON column</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-black/5 bg-white/80 backdrop-blur-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-[#2a1d12]">Saved rows</h2>
                                <span className="text-xs text-[#8a6e56]">{records.length} record(s)</span>
                            </div>

                            <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                                {loading && <p className="text-sm text-[#7c6652]">Loading records...</p>}
                                {!loading && records.length === 0 && (
                                    <p className="text-sm text-[#7c6652]">No records yet. Save the sample payload first.</p>
                                )}

                                {records.map((record) => (
                                    <article key={record.id} className="rounded-2xl border border-black/8 bg-[#faf7f2] p-4">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p className="font-semibold text-[#271a11]">{record.title}</p>
                                                <p className="text-xs text-[#8a6e56]">{record.item_count} object(s)</p>
                                            </div>
                                            <p className="text-[11px] text-[#9a816a] whitespace-nowrap">
                                                {record.createdAt ? new Date(record.createdAt).toLocaleString() : ""}
                                            </p>
                                        </div>
                                        <pre className="overflow-auto rounded-xl bg-[#1a140f] text-[#efe7dc] text-[11px] leading-5 p-3 font-mono">
                                            {JSON.stringify(record.payload, null, 2)}
                                        </pre>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}