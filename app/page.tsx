"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, ChevronLeft, ChevronRight,
  Clock3, Compass, Copy, CreditCard, DoorOpen, ExternalLink, Eye, EyeOff, Heart,
  Home, Landmark, LogOut, Map, MapPin, Moon, Music2, Route, Search, Settings2, Share2, ShieldCheck,
  Sparkles, Sun, SunMoon, Ticket, Type, Wallet, X,
} from "lucide-react";
import { temples, templeById, type GuideIcon, type Temple } from "./temples";

type User = { id: string; name: string; email: string; balance: number };
type Pass = { id: string; expires_at: number } | null;
type History = { id: string; amount: number; title: string; created_at: number };
type ShareLink = { id: string; expires_at: number; revoked: number; created_at: number };
type State = { user: User | null; pass: Pass; history: History[]; shares: ShareLink[]; serverTime: number };
type Tab = "home" | "temple" | "wallet" | "pass" | "profile";
type TempleSection = "overview" | "highlights" | "worship" | "visit";
type TextSize = "md" | "lg" | "xl";
type Theme = "auto" | "light" | "dark";
type ApiResult = { error?: string; code?: string; url?: string; order?: { id: string } };

const templeSections: { id: TempleSection; label: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "highlights", label: "จุดสำคัญ" },
  { id: "worship", label: "ไหว้พระ · บทสวด" },
  { id: "visit", label: "การเดินทาง" },
];
const emptyState: State = { user: null, pass: null, history: [], shares: [], serverTime: Date.now() };
const packages = [
  { credits: 50, label: "เริ่มต้น", icon: "✦" },
  { credits: 100, label: "กำลังดี", icon: "✧" },
  { credits: 300, label: "คุ้มค่า", icon: "❋" },
  { credits: 500, label: "พิเศษ", icon: "✺" },
];
const guideIcons: Record<GuideIcon, typeof BookOpen> = { book: BookOpen, pin: MapPin, landmark: Landmark, chant: Music2, heart: Heart, duck: Sparkles, door: DoorOpen };
const guideTone: Record<GuideIcon, string> = { book: "", pin: "moss", landmark: "sand", chant: "rose", heart: "rose", duck: "sand", door: "moss" };

function moneyDate(ms: number) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}
function remaining(ms: number, now: number) {
  const total = Math.max(0, Math.ceil((ms - now) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "อรุณสวัสดิ์" : h < 16 ? "สวัสดียามบ่าย" : h < 19 ? "สวัสดียามเย็น" : "ราตรีสวัสดิ์";
}
function chantText(t: Temple) { return t.chants.map(c => `${c.title}\n${c.note ? c.note + "\n" : ""}${c.lines.join("\n")}`).join("\n\n"); }
function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try { const v = localStorage.getItem(key) as T | null; return v && allowed.includes(v) ? v : fallback; } catch { return fallback; }
}
function writePref(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<State>(emptyState);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"auth" | "topup" | "pass" | "share" | "scene" | "story" | "guide" | "settings" | null>(null);
  const [templeId, setTempleId] = useState<Temple["id"] | null>(null);
  const [templeSection, setTempleSection] = useState<TempleSection>("overview");
  const [activeGuide, setActiveGuide] = useState("history");
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [selectedPack, setSelectedPack] = useState(100);
  const [shareMinutes, setShareMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sceneUrl, setSceneUrl] = useState("");
  const [sceneTemple, setSceneTemple] = useState<Temple>(temples[0]);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestOk, setGuestOk] = useState(false);
  const [guestExpiry, setGuestExpiry] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [theme, setTheme] = useState<Theme>("auto");
  const [favorites, setFavorites] = useState<string[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  function goSlide(i: number) {
    const rail = railRef.current; if (!rail) return;
    const cards = rail.querySelectorAll<HTMLElement>(".hero-card");
    const n = Math.max(0, Math.min(cards.length - 1, i));
    cards[n]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  function onRailScroll() {
    const rail = railRef.current; if (!rail) return;
    const cards = [...rail.querySelectorAll<HTMLElement>(".hero-card")];
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
    setSlide(best);
  }

  const temple = templeId ? templeById(templeId) : null;
  const guideTemple = temple ?? sceneTemple;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.ok) setData(await response.json());
    } catch { setToast("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Preferences and URL-derived guest mode are read after hydration to keep server/client markup identical.
    /* eslint-disable react-hooks/set-state-in-effect */
    setTextSize(readPref("nt-text", ["md", "lg", "xl"] as const, "md"));
    setTheme(readPref("nt-theme", ["auto", "light", "dark"] as const, "auto"));
    try { setFavorites(JSON.parse(localStorage.getItem("nt-fav") || "[]")); } catch { /* ignore */ }
    const guest = new URLSearchParams(location.search).get("guest");
    if (guest && /^[a-f0-9]{64}$/.test(guest)) {
      setGuestToken(guest);
      setSceneUrl(`/api/scene?guest=${encodeURIComponent(guest)}`);
      setTab("pass");
      setModal("scene");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = textSize;
    const dark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "dark" : "light";
  }, [textSize, theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!guestToken) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/access?guest=${encodeURIComponent(guestToken)}`, { cache: "no-store" });
        if (!res.ok) { if (alive) { setGuestOk(false); setSceneUrl(""); setModal(null); setToast("ลิงก์เข้าชมหมดอายุหรือถูกยกเลิกแล้ว"); } return; }
        const v = await res.json() as { expiresAt: number };
        if (alive) { setGuestOk(true); setGuestExpiry(v.expiresAt); }
      } catch { if (alive) setGuestOk(false); }
    };
    void check(); const timer = setInterval(check, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [guestToken]);

  useEffect(() => {
    const timer = setInterval(() => setData(v => ({ ...v, serverTime: Date.now() })), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setModal(null); setError(""); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [modal]);

  async function api(path: string, body?: unknown): Promise<ApiResult> {
    const response = await fetch(`/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store",
    });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw Object.assign(new Error(result.error || "ทำรายการไม่สำเร็จ"), { code: result.code });
    return result;
  }

  async function submitAuth(form: FormData) {
    setBusy(true); setError("");
    try {
      await api(authMode === "register" ? "register" : "login", { name: form.get("name"), email: form.get("email"), password: form.get("password") });
      await refresh(); setModal(null); setToast(authMode === "register" ? "สร้างบัญชีแล้ว ยินดีต้อนรับ" : "เข้าสู่ระบบสำเร็จ");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function topup() {
    setBusy(true); setError("");
    try {
      const result = await api("topup", { amount: selectedPack });
      await api("topup/confirm", { orderId: result.order?.id });
      await refresh(); setModal(null); setToast(`เติมเครดิตจำลอง ${selectedPack} เครดิตแล้ว`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function buyPass() {
    setBusy(true); setError("");
    try {
      await api("passes", { requestId: crypto.randomUUID() });
      await refresh(); setModal(null); setTab("pass"); setToast("เปิดบัตรเข้าชมแล้ว 30 นาที");
    } catch (e) { const err = e as Error & { code?: string }; if (err.code === "INSUFFICIENT_CREDITS") { setModal("topup"); setSelectedPack(50); } setError(err.message); }
    finally { setBusy(false); }
  }
  async function createShare() {
    setBusy(true); setError("");
    try {
      const result = await api("shares", { minutes: shareMinutes });
      await refresh();
      await navigator.clipboard.writeText(result.url ?? "").catch(() => undefined);
      setModal(null); setToast("สร้างลิงก์แล้ว · คัดลอกลิงก์ให้แล้ว");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    try { await api("shares/revoke", { id }); await refresh(); setToast("ยกเลิกลิงก์เข้าชมแล้ว"); }
    catch (e) { setToast((e as Error).message); }
  }
  async function logout() {
    try { await api("logout", {}); setData(emptyState); setTab("home"); setToast("ออกจากระบบแล้ว"); }
    catch (e) { setToast((e as Error).message); }
  }

  function openScene(t: Temple, mode: "map" | "front" = "map", focus?: string) {
    const p = new URLSearchParams({ site: t.id, mode });
    if (focus) p.set("focus", focus);
    if (textSize !== "md") p.set("text", textSize);
    if (document.documentElement.dataset.theme === "dark") p.set("theme", "dark");
    if (guestToken) { if (!guestOk) return; p.set("guest", guestToken); }
    setSceneTemple(t); setSceneUrl(`/api/scene?${p}`); setModal("scene");
  }
  function openTemple(id: Temple["id"]) { setTempleId(id); setTempleSection("overview"); setTab("temple"); }
  function openGuide(t: Temple, key: string) { setSceneTemple(t); setActiveGuide(key); setModal("guide"); }
  function toggleFav(t: Temple) {
    const next = favorites.includes(t.id) ? favorites.filter(x => x !== t.id) : [...favorites, t.id];
    setFavorites(next); writePref("nt-fav", JSON.stringify(next));
    setToast(next.includes(t.id) ? `บันทึก${t.name}ในรายการโปรดแล้ว` : `นำ${t.name}ออกจากรายการโปรดแล้ว`);
  }
  function changeText(v: TextSize) { setTextSize(v); writePref("nt-text", v); }
  function changeTheme(v: Theme) { setTheme(v); writePref("nt-theme", v); }
  async function copyText(value: string, ok = "คัดลอกแล้ว") {
    try { await navigator.clipboard.writeText(value); setToast(ok); }
    catch { setToast("คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความเพื่อคัดลอก"); }
  }

  const activePass = !!data.pass && data.pass.expires_at > data.serverTime;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return temples;
    return temples.filter(t => [t.name, t.fullName, t.en, t.district, t.tagline, ...t.tags].join(" ").toLowerCase().includes(q));
  }, [query]);

  const settingsPanel = <div className="settings">
    <div className="setting-group"><span className="setting-label"><Type size={18}/> ขนาดตัวอักษร</span><div className="seg" role="radiogroup" aria-label="ขนาดตัวอักษร">{([["md","ปกติ","ก"],["lg","ใหญ่","ก"],["xl","ใหญ่มาก","ก"]] as const).map(([v,label,glyph],i)=><button key={v} role="radio" aria-checked={textSize===v} className={textSize===v?"active":""} onClick={()=>changeText(v)}><span style={{fontSize:`${1+i*.22}em`}}>{glyph}</span>{label}</button>)}</div></div>
    <div className="setting-group"><span className="setting-label"><SunMoon size={18}/> ธีมสี</span><div className="seg" role="radiogroup" aria-label="ธีมสี">{([["auto","ตามเครื่อง",SunMoon],["light","สว่าง",Sun],["dark","มืด",Moon]] as const).map(([v,label,Icon])=><button key={v} role="radio" aria-checked={theme===v} className={theme===v?"active":""} onClick={()=>changeTheme(v)}><Icon size={18}/>{label}</button>)}</div></div>
    <p className="setting-note">การตั้งค่าบันทึกไว้ในเครื่องนี้ และใช้กับหน้าสำรวจ 3D ด้วย</p>
  </div>;

  if (guestToken) return <main className="guest-page">
    <div className="guest-top"><img className="brand-svg" src="/chedi-mark.svg" alt=""/><span>นครทริป</span><span className="guest-pill">บัตรเข้าชมชั่วคราว</span></div>
    <p className="guest-status" role="status">{guestOk && guestExpiry ? <><Clock3 size={18}/> สิทธิ์คงเหลือ <b>{remaining(guestExpiry, data.serverTime)}</b></> : "กำลังตรวจสอบสิทธิ์เข้าชม…"}</p>
    {temples.map(t=><section className="guest-card" key={t.id}><img src={t.photo} alt={t.photoAlt} style={{objectPosition:t.photoPos}}/><div className="guest-overlay"/><div className="guest-content"><span className="kicker">{t.en} · 3D</span><h1>{t.name}</h1><button className="btn btn-gold full" disabled={!guestOk} onClick={()=>openScene(t,"map")}><Map size={20}/> เปิดแผนที่ 3D <ArrowRight size={18}/></button></div></section>)}
    <p className="guest-note"><ShieldCheck size={18}/> ลิงก์นี้ให้สิทธิ์ดูแผนที่ 3D ชั่วคราว หมดอายุหรือถูกยกเลิกแล้วจะเปิดไม่ได้</p>
    {modal==="scene"&&sceneUrl&&<div className="scene-modal"><div className="scene-bar"><button onClick={()=>setModal(null)} aria-label="ปิดหน้าสำรวจ 3D"><X size={22}/></button><span><Map size={18}/> {sceneTemple.name}</span></div><iframe title={`แผนที่สามมิติ${sceneTemple.name}`} src={sceneUrl}/></div>}
    {toast&&<div role="status" className="toast">{toast}</div>}
  </main>;

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand-mark" onClick={()=>{setTab("home");setTempleId(null);}} aria-label="นครทริป หน้าหลัก"><img className="brand-svg" src="/chedi-mark.svg" alt=""/><span><strong>นครทริป</strong><small>NAKHON TRIP</small></span></button>
      <div className="top-actions">
        <button className="round-icon" aria-label="ตั้งค่าการแสดงผล ขนาดตัวอักษรและธีม" onClick={()=>setModal("settings")}><Type size={20}/></button>
        <button className="round-icon" aria-label="แชร์แอป" onClick={()=>copyText(location.origin,"คัดลอกลิงก์แอปแล้ว")}><Share2 size={19}/></button>
        <button className="avatar" aria-label="โปรไฟล์" onClick={()=>setTab("profile")}>{data.user?.name?.slice(0,1)||<Settings2 size={19}/>}</button>
      </div>
    </header>

    <div className="page-scroll" key={tab + (templeId ?? "")}>
      {loading ? <div className="loading-card" role="status"><span className="loader"/>กำลังเตรียมทริปของคุณ</div> : <>
        {tab === "home" && <>
          <section className="welcome"><span className="kicker">{greeting()}</span><h1>{data.user ? `คุณ${data.user.name}` : "นักเดินทาง"}<br/><span>วันนี้อยากไปไหว้พระที่ไหนดี</span></h1></section>
          <form className="searchbox" role="search" onSubmit={e=>{e.preventDefault();setTempleId(null);setTab("temple");}}><Search size={20} aria-hidden/><input aria-label="ค้นหาวัดหรือสถานที่" placeholder="ค้นหาวัด เช่น ทวารวดี, ยายหอม" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="ล้างคำค้นหา" onClick={()=>setQuery("")}><X size={18}/></button>}</form>
          <div className="section-head"><div><span className="kicker">สถานที่แนะนำ</span><h2>วัดในนครปฐม</h2></div><span className="section-count">{temples.length} แห่ง</span></div>
          <div className="hero-wrap"><div className="hero-rail" role="list" ref={railRef} onScroll={onRailScroll} onPointerDown={e=>{if(e.pointerType!=="mouse")return;drag.current={x:e.clientX,left:railRef.current!.scrollLeft,moved:false};}} onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x;if(Math.abs(dx)>5){d.moved=true;railRef.current!.classList.add("dragging");railRef.current!.scrollLeft=d.left-dx;}}} onPointerUp={()=>{const d=drag.current;drag.current=null;railRef.current?.classList.remove("dragging");if(d?.moved)goSlide(slide);}} onPointerLeave={()=>{if(drag.current){drag.current=null;railRef.current?.classList.remove("dragging");goSlide(slide);}}}>{filtered.map((t,i)=><article className="hero-card" key={t.id} role="listitem"><img src={t.photo} alt={t.photoAlt} style={{objectPosition:t.photoPos}}/><div className="hero-shade"/><div className="hero-topline"><span><Sparkles size={14}/> {t.tags[0]}</span><span>{String(i+1).padStart(2,"0")} / {String(temples.length).padStart(2,"0")}</span></div><div className="hero-copy"><span className="hero-location"><MapPin size={15}/> {t.district}</span><h2>{t.name}</h2><p>{t.tagline}</p><div className="hero-actions"><button className="btn btn-light" onClick={()=>openTemple(t.id)}>ดูรายละเอียด <ArrowRight size={18}/></button><button className="btn btn-glass" onClick={()=>openScene(t,"front")}><Compass size={18}/> 3D</button></div></div><button className={`heart-float ${favorites.includes(t.id)?"on":""}`} aria-pressed={favorites.includes(t.id)} aria-label={`บันทึก${t.name}เป็นรายการโปรด`} onClick={()=>toggleFav(t)}><Heart size={20}/></button></article>)}{!filtered.length&&<div className="empty-state">ไม่พบสถานที่ที่ตรงกับ “{query}”</div>}</div>{filtered.length>1&&<><button className="rail-arrow prev" aria-label="สถานที่ก่อนหน้า" disabled={slide===0} onClick={()=>goSlide(slide-1)}><ChevronLeft size={24}/></button><button className="rail-arrow next" aria-label="สถานที่ถัดไป" disabled={slide>=filtered.length-1} onClick={()=>goSlide(slide+1)}><ChevronRight size={24}/></button></>}</div>
          {filtered.length>1&&<div className="rail-dots" role="tablist" aria-label="เลือกสถานที่">{filtered.map((t,i)=><button key={t.id} role="tab" aria-selected={slide===i} aria-label={t.name} className={slide===i?"active":""} onClick={()=>goSlide(i)}><span/></button>)}</div>}
          <div className="section-head"><div><span className="kicker">ทางลัด</span><h2>เริ่มต้นทริป</h2></div></div>
          <div className="shortcut-grid">
            <button onClick={()=>{setTempleId(null);setTab("temple");}}><span className="shortcut-icon"><Landmark/></span><span>วัดทั้งหมด<small>{temples.length} สถานที่</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>openScene(temples[0],"map")}><span className="shortcut-icon moss"><Map/></span><span>แผนที่ 3D<small>หมุนชมรอบทิศ</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>setTab("wallet")}><span className="shortcut-icon sand"><Wallet/></span><span>กระเป๋าเครดิต<small>{data.user?`${data.user.balance} เครดิต`:"เครดิตจำลอง"}</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>setTab("pass")}><span className="shortcut-icon rose"><Ticket/></span><span>บัตรเข้าชม<small>{activePass?`เหลือ ${remaining(data.pass!.expires_at, data.serverTime)}`:"ชวนเพื่อนดู 3D"}</small></span><ChevronRight size={18}/></button>
          </div>
          <div className="section-head"><div><span className="kicker">ทริปครึ่งวัน</span><h2>เส้นทางแนะนำ</h2></div><Route size={22} className="muted-icon" aria-hidden/></div>
          <ol className="route-card">{temples.map((t,i)=><li key={t.id}><button onClick={()=>openTemple(t.id)}><span className="route-dot">{i+1}</span><img src={t.photo} alt="" style={{objectPosition:t.photoPos}}/><span><b>{t.name}</b><small>{i===0?"เริ่มต้นที่ใจกลางเมือง":t.distance}</small></span><ChevronRight size={18}/></button></li>)}</ol>
          <section className="quote-card"><span aria-hidden>“</span><p>บางครั้งการเดินทาง<br/>ก็เริ่มจากการหยุดพักใจ</p></section>
        </>}

        {tab === "temple" && !temple && <>
          <button className="back-crumb" onClick={()=>setTab("home")}><ArrowLeft size={18}/> กลับหน้าแรก</button>
          <div className="page-title"><span className="kicker">ONE CITY · MANY STORIES</span><h1>วัดแนะนำ</h1><p>เลือกสถานที่เพื่ออ่านเรื่องราว บทสวด และสำรวจแบบ 3 มิติ</p></div>
          <label className="searchbox"><Search size={20} aria-hidden/><input aria-label="ค้นหาวัด" placeholder="ค้นหาชื่อวัดหรือคำสำคัญ" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="ล้างคำค้นหา" onClick={()=>setQuery("")}><X size={18}/></button>}</label>
          <div className="temple-list">{filtered.map(t=><button key={t.id} className="temple-row" onClick={()=>openTemple(t.id)}><img src={t.photo} alt="" style={{objectPosition:t.photoPos}}/><span className="temple-row-body"><span className="chip-row">{t.tags.slice(0,2).map(x=><span className="chip" key={x}>{x}</span>)}</span><b>{t.name}</b><small>{t.tagline}</small><span className="row-meta"><MapPin size={15}/> {t.distance}</span></span><ChevronRight size={20}/></button>)}{!filtered.length&&<div className="empty-state">ไม่พบสถานที่ที่ตรงกับ “{query}”</div>}</div>
          <section className="visit-note"><Sparkles size={20}/><p>กำลังเพิ่มวัดอื่น ๆ ในนครปฐมเร็ว ๆ นี้ พร้อมแบบจำลอง 3D และบทสวดของแต่ละแห่ง</p></section>
        </>}

        {tab === "temple" && temple && <>
          <button className="back-crumb" onClick={()=>setTempleId(null)}><ArrowLeft size={18}/> วัดทั้งหมด</button>
          <article className="temple-card">
            <button className="temple-photo" onClick={()=>openScene(temple,"front")} aria-label={`เปิดชม${temple.name}ในมุม 3D`}><img src={temple.photo} alt={temple.photoAlt} style={{objectPosition:temple.photoPos}}/><span className="photo-label"><Compass size={15}/> แตะเพื่อชม 3D</span><span className="photo-bottom"><span>{temple.en}</span><b>{temple.name}</b></span></button>
            <div className="temple-body">
              <div className="chip-row"><span className="chip"><MapPin size={14}/> {temple.district}</span>{temple.tags.map(x=><span className="chip" key={x}>{x}</span>)}</div>
              <h2>{temple.fullName}</h2>
              <p>{temple.intro}</p>
              <dl className="temple-facts">{temple.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
              <div className="temple-actions"><button className="btn btn-outline" onClick={()=>openGuide(temple,"history")}><BookOpen size={18}/> อ่านประวัติ</button><button className="btn btn-green" onClick={()=>openScene(temple,"map")}><Map size={18}/> เปิดแผนที่ 3D</button></div>
              <div className="temple-links"><a href={temple.mapUrl} target="_blank" rel="noreferrer"><MapPin size={17}/> นำทางด้วย Google Maps <ExternalLink size={16}/></a><button onClick={()=>toggleFav(temple)} aria-pressed={favorites.includes(temple.id)}><Heart size={17} className={favorites.includes(temple.id)?"fill":""}/> {favorites.includes(temple.id)?"อยู่ในรายการโปรด":"บันทึกเป็นรายการโปรด"}</button></div>
            </div>
          </article>
          <div className="temple-tabs" role="tablist" aria-label={`ข้อมูล${temple.name}`}>{templeSections.map(s=><button key={s.id} role="tab" aria-selected={templeSection===s.id} className={templeSection===s.id?"active":""} onClick={()=>setTempleSection(s.id)}>{s.label}</button>)}</div>
          {templeSection!=="visit"&&<div className="guide-grid" role="tabpanel">{temple.sections[templeSection].map(key=>{const g=temple.guides[key];const Icon=guideIcons[g.icon];return <button key={key} onClick={()=>openGuide(temple,key)}><span className={`guide-icon ${guideTone[g.icon]}`}><Icon size={20}/></span><span><b>{g.title}</b><small>{g.subtitle}</small></span><ChevronRight size={18}/></button>;})}</div>}
          {templeSection==="worship"&&<div className="chant-preview">{temple.chants.map(c=><div key={c.title}><span className="kicker">{c.title}</span>{c.note&&<small>{c.note}</small>}<p>{c.lines.map(l=><span key={l}>{l}<br/></span>)}</p></div>)}<button className="btn btn-outline full" onClick={()=>copyText(chantText(temple),"คัดลอกบทสวดแล้ว")}><Copy size={18}/> คัดลอกบทสวด</button></div>}
          {templeSection==="visit"&&<><ol className="visit-list" role="tabpanel">{temple.visit.map((v,i)=><li key={v.title}><span>{String(i+1).padStart(2,"0")}</span><p><b>{v.title}</b><small>{v.text}</small></p></li>)}</ol><a className="btn btn-outline full" href={temple.mapUrl} target="_blank" rel="noreferrer"><MapPin size={18}/> ดูตำแหน่งวัดในแผนที่</a></>}
          {templeSection!=="visit"&&templeSection!=="worship"&&<button className="btn btn-green full temple-map-cta" onClick={()=>openScene(temple,"map",templeSection==="highlights"?"pray":undefined)}><Map size={18}/> {templeSection==="highlights"?"ดูหมุดจุดสำคัญใน 3D":"สำรวจสถานที่แบบ 3D"} <ArrowRight size={18}/></button>}
          <section className="visit-note"><ShieldCheck size={20}/><p>โมเดล 3D และตำแหน่งหมุดเป็นแบบจำลองเชิงศิลป์โดยประมาณ ไม่ใช่แผนที่สำรวจหรือแผนผังทางหนีไฟ</p></section>
          <div className="sources"><span className="kicker">แหล่งข้อมูลอ้างอิง</span>{temple.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={15}/></a>)}</div>
        </>}

        {tab === "wallet" && <>
          <div className="page-title"><span className="kicker">YOUR TRAVEL WALLET</span><h1>กระเป๋าเครดิต</h1><p>เครดิตทดลองสำหรับเปิดบัตรเข้าชมและแชร์ลิงก์ 3D</p></div>
          {data.user ? <><section className="balance-card"><div className="balance-top"><span><Wallet size={19}/> เครดิตคงเหลือ</span><span className="demo-tag">จำลอง</span></div><div className="balance-amount">{data.user.balance.toLocaleString("th-TH")} <small>เครดิต</small></div><div className="balance-bottom"><span>เติมเพื่อเปิดบัตรเข้าชม 3D</span><button aria-label="เติมเครดิต" onClick={()=>setModal("topup")}><ArrowDownLeft size={19}/></button></div></section>
          <div className="section-head"><div><span className="kicker">CHOOSE A PACKAGE</span><h2>แพ็กเกจทดลอง</h2></div></div><div className="package-grid">{packages.map(p=><button key={p.credits} aria-pressed={selectedPack===p.credits} className={`package-card ${selectedPack===p.credits?"selected":""}`} onClick={()=>setSelectedPack(p.credits)}><span className="package-spark" aria-hidden>{p.icon}</span><strong>{p.credits}</strong><small>เครดิต</small><em>{p.label}</em>{selectedPack===p.credits&&<span className="pack-check"><Check size={14}/></span>}</button>)}</div><div className="wallet-terms"><ShieldCheck size={20}/><p><b>เครดิตนี้เป็นข้อมูลจำลอง</b><br/>ไม่มีการเรียกเก็บเงินหรือทำธุรกรรมทางการเงินจริง</p></div><button className="btn btn-gold full" onClick={()=>setModal("topup")}><CreditCard size={19}/> เติม {selectedPack} เครดิตจำลอง <ArrowRight size={18}/></button>
          <div className="section-head"><div><span className="kicker">RECENT ACTIVITY</span><h2>รายการล่าสุด</h2></div></div><div className="history-list">{data.history.length?data.history.map(item=><div className="history-row" key={item.id}><span className={`history-icon ${item.amount<0?"spent":""}`}>{item.amount<0?<Ticket size={18}/>:<Wallet size={18}/>}</span><span className="history-title">{item.title}<small>{moneyDate(item.created_at)}</small></span><strong className={item.amount<0?"negative":"positive"}>{item.amount>0?"+":""}{item.amount}</strong></div>):<div className="empty-state">ยังไม่มีรายการ เริ่มเติมเครดิตจำลองได้เลย</div>}</div></> : <div className="signed-out-card"><Wallet size={36}/><h2>กระเป๋าทริปของคุณ</h2><p>เข้าสู่ระบบเพื่อบันทึกเครดิตและสิทธิ์เข้าชมระหว่างอุปกรณ์</p><button className="btn btn-green" onClick={()=>setModal("auth")}>เข้าสู่ระบบ / สมัครสมาชิก</button></div>}
        </>}

        {tab === "pass" && <>
          <div className="page-title"><span className="kicker">YOUR TEMPLE PASS</span><h1>บัตรเข้าชม</h1><p>สำรวจวัดแบบ 3 มิติ และชวนเพื่อนมาดูด้วยกัน</p></div>
          {data.user ? <><section className={`pass-card ${activePass?"pass-active":""}`}><div className="pass-watermark"><Landmark size={130}/></div><div className="pass-top"><span className="pass-logo"><Landmark size={18}/> NAKHON TRIP</span><span className="pass-chip"><Ticket size={14}/> 3D ACCESS</span></div><div className="pass-mid"><span>{temples.length} TEMPLES · NAKHON PATHOM</span><h2>บัตรสำรวจ 3D</h2><p>{temples.map(t=>t.name).join(" · ")}</p></div><div className="pass-bottom"><span>{activePass?<><i className="online-dot"/> ใช้งานได้อีก <b>{remaining(data.pass!.expires_at, data.serverTime)}</b></>:"ยังไม่มีบัตรเข้าชม"}</span></div></section>
          {activePass?<><button className="btn btn-green full" onClick={()=>openScene(temples[0],"map")}><Map size={19}/> เปิดแผนที่ 3D <ArrowRight size={18}/></button><button className="btn btn-outline full share-open" onClick={()=>{setError("");setModal("share");}}><Share2 size={19}/> สร้างลิงก์ให้เพื่อนเข้าชมชั่วคราว</button><p className="small-center">ผู้รับไม่ต้องมีบัญชี · แชร์ได้ 5, 10 หรือ 15 นาที</p></>:<div className="unlock-card"><div className="unlock-icon"><Ticket size={24}/></div><h2>ชวนเพื่อนมาสำรวจด้วยกัน</h2><p>ดู 3D ได้ฟรีเสมอ · เปิดบัตร 30 นาทีด้วย 20 เครดิตทดลอง เพื่อสร้างลิงก์ให้เพื่อนเข้าชมโดยไม่ต้องสมัครบัญชี</p><button className="btn btn-gold full" onClick={()=>{setError("");setModal("pass");}}><Ticket size={18}/> เปิดบัตร · 20 เครดิต</button><button className="btn btn-outline full share-open" onClick={()=>openScene(temples[0],"map")}><Map size={18}/> เปิดแผนที่ 3D ฟรี</button></div>}
          {!!data.shares.length&&<><div className="section-head"><div><span className="kicker">SHARED ACCESS</span><h2>ลิงก์ที่สร้าง</h2></div></div><div className="share-list">{data.shares.map(s=><div className="share-row" key={s.id}><span className="share-icon"><Share2 size={18}/></span><span className="share-info"><b>{s.revoked?"ยกเลิกแล้ว":s.expires_at<=data.serverTime?"หมดอายุ":"ลิงก์เข้าชม 3D"}</b><small>{moneyDate(s.created_at)}{s.revoked?"":` · ${remaining(s.expires_at, data.serverTime)}`}</small></span>{!s.revoked&&s.expires_at>data.serverTime&&<button className="revoke-btn" onClick={()=>revoke(s.id)}>ยกเลิก</button>}</div>)}</div></>}</>:<div className="signed-out-card"><Ticket size={36}/><h2>บัตรเข้าชม 3D</h2><p>เข้าชมแบบจำลอง 3D ได้ทันทีโดยไม่ต้องสมัคร เข้าสู่ระบบเมื่ออยากสร้างลิงก์ชวนเพื่อน</p><button className="btn btn-green full" onClick={()=>openScene(temples[0],"map")}><Map size={19}/> เปิดแผนที่ 3D</button><button className="btn btn-outline full share-open" onClick={()=>setModal("auth")}>เข้าสู่ระบบ / สมัครสมาชิก</button></div>}
        </>}

        {tab === "profile" && <>
          <div className="page-title"><span className="kicker">YOUR JOURNEY, YOUR WAY</span><h1>โปรไฟล์</h1><p>จัดการบัญชี การแสดงผล และการเข้าชม</p></div>
          <section className="profile-card"><div className="profile-avatar">{data.user?.name.slice(0,1)||<Landmark size={26}/>}</div><div><strong>{data.user?.name||"นักเดินทาง"}</strong><small>{data.user?.email||"ยังไม่ได้เข้าสู่ระบบ"}</small></div>{data.user&&<BadgeCheck className="verified" size={22}/>}</section>
          <div className="section-head"><div><span className="kicker">ACCESSIBILITY</span><h2>การแสดงผล</h2></div></div>
          <div className="card-pad">{settingsPanel}</div>
          <div className="section-head"><div><span className="kicker">ACCOUNT</span><h2>บัญชีและข้อมูล</h2></div></div>
          <div className="profile-links">{data.user?<><button onClick={()=>setTab("wallet")}><span><Wallet size={20}/></span><b>กระเป๋าเครดิต<small>{data.user.balance} เครดิตจำลอง</small></b><ChevronRight/></button><button onClick={()=>setTab("pass")}><span><Ticket size={20}/></span><b>บัตรเข้าชม<small>{activePass?"มีบัตรที่ยังใช้งาน":"เปิดบัตรเข้าชม 3D"}</small></b><ChevronRight/></button></>:<button onClick={()=>setModal("auth")}><span><ShieldCheck size={20}/></span><b>เข้าสู่ระบบหรือสมัครสมาชิก<small>บันทึกข้อมูลระหว่างอุปกรณ์</small></b><ChevronRight/></button>}<button onClick={()=>setModal("story")}><span><BookOpen size={20}/></span><b>เกี่ยวกับนครทริป<small>ที่มาและแหล่งข้อมูล</small></b><ChevronRight/></button>{data.user&&<button onClick={logout}><span><LogOut size={20}/></span><b>ออกจากระบบ<small>ออกจากบัญชีนี้บนอุปกรณ์นี้</small></b><ChevronRight/></button>}</div>
          <p className="profile-footnote">เครดิตเป็นระบบจำลอง · ไม่มีการรับชำระเงินจริง<br/>โมเดล 3D เป็นงานสร้างเชิงศิลป์จากภาพอ้างอิง</p>
        </>}
      </>}
    </div>

    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {([ ["home",Home,"หน้าหลัก"],["temple",Landmark,"วัด"],["wallet",Wallet,"กระเป๋า"],["pass",Ticket,"บัตร 3D"],["profile",Settings2,"ตั้งค่า"] ] as const).map(([key,Icon,label])=><button key={key} className={tab===key?"current":""} onClick={()=>{setTab(key);if(key==="temple")setTempleId(null);}} aria-current={tab===key?"page":undefined}><span className="nav-icon"><Icon size={22}/>{key==="wallet"&&data.user&&<i/>}</span><small>{label}</small></button>)}
    </nav>

    {modal&&modal!=="scene"&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setModal(null);setError("");}}}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="dialog-x" onClick={()=>{setModal(null);setError("");}} aria-label="ปิด"><X size={20}/></button>
      {modal==="settings"&&<><span className="dialog-icon"><Type size={24}/></span><h2 id="dialog-title">การแสดงผล</h2><p className="dialog-sub">ปรับให้อ่านง่ายและสบายตาสำหรับทุกวัย</p>{settingsPanel}<button className="btn btn-green full" onClick={()=>setModal(null)}>เรียบร้อย</button></>}

      {modal==="auth"&&<><span className="dialog-icon"><Landmark size={24}/></span><span className="kicker">WELCOME TO NAKHON TRIP</span><h2 id="dialog-title">{authMode==="register"?"เริ่มต้นออกเดินทาง":"ยินดีต้อนรับกลับ"}</h2><p className="dialog-sub">บันทึกบัตรเข้าชมและเครดิตไว้กับบัญชีของคุณ</p><div className="auth-switch" role="tablist"><button role="tab" aria-selected={authMode==="register"} className={authMode==="register"?"active":""} onClick={()=>{setAuthMode("register");setError("");}}>สมัครสมาชิก</button><button role="tab" aria-selected={authMode==="login"} className={authMode==="login"?"active":""} onClick={()=>{setAuthMode("login");setError("");}}>เข้าสู่ระบบ</button></div><form action={submitAuth} className="form-stack">{authMode==="register"&&<label>ชื่อที่ใช้แสดง<input name="name" placeholder="ชื่อของคุณ" required minLength={2} maxLength={60}/></label>}<label>อีเมล<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label><label>รหัสผ่าน<span className="password-wrap"><input name="password" type={showPassword?"text":"password"} autoComplete={authMode==="register"?"new-password":"current-password"} placeholder="อย่างน้อย 8 ตัวอักษร" required minLength={8} maxLength={128}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน"}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-green full" disabled={busy}>{busy?"กำลังดำเนินการ…":authMode==="register"?"สร้างบัญชี":"เข้าสู่ระบบ"}<ArrowRight size={18}/></button></form><small className="dialog-foot">ระบบจัดเก็บรหัสผ่านแบบเข้ารหัสเพื่อเปิดบัญชีตัวอย่าง</small></>}

      {modal==="topup"&&<><span className="dialog-icon amber"><Wallet size={24}/></span><span className="kicker">DEMO CREDIT WALLET</span><h2 id="dialog-title">เติมเครดิตจำลอง</h2><p className="dialog-sub">เลือกแพ็กเกจสำหรับทดลองใช้งาน เครดิตไม่มีมูลค่าเงินจริง</p><div className="modal-packages">{packages.map(p=><button key={p.credits} aria-pressed={selectedPack===p.credits} className={selectedPack===p.credits?"selected":""} onClick={()=>setSelectedPack(p.credits)}><span aria-hidden>{p.icon}</span><b>{p.credits}</b><small>เครดิต</small>{selectedPack===p.credits&&<Check size={16}/>}</button>)}</div><div className="simulation-banner"><ShieldCheck size={20}/><span><b>การทำรายการนี้เป็นการจำลอง</b><small>ไม่มีการเชื่อมต่อธนาคาร บัตร หรือระบบชำระเงิน</small></span></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-gold full" disabled={busy} onClick={topup}>{busy?"กำลังเติมเครดิต…":`ยืนยันเติม ${selectedPack} เครดิต`}<ArrowRight size={18}/></button></>}

      {modal==="pass"&&<><span className="dialog-icon"><Ticket size={24}/></span><span className="kicker">A TEMPORARY 3D VISIT</span><h2 id="dialog-title">เปิดบัตรเข้าชม</h2><p className="dialog-sub">ใช้ <b>20 เครดิตทดลอง</b> เปิดบัตร 30 นาที เพื่อสร้างลิงก์ให้เพื่อนเข้าชมแผนที่ 3D</p><div className="pass-confirm"><span>ยอดเครดิตปัจจุบัน</span><b><Wallet size={18}/>{data.user?.balance??0} เครดิต</b></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-green full" disabled={busy} onClick={buyPass}>{busy?"กำลังเปิดบัตร…":"ยืนยัน · 20 เครดิต"}<ArrowRight size={18}/></button></>}

      {modal==="share"&&<><span className="dialog-icon"><Share2 size={24}/></span><span className="kicker">INVITE SOMEONE TO EXPLORE</span><h2 id="dialog-title">ชวนเพื่อนเข้าชม</h2><p className="dialog-sub">สร้างลิงก์ชั่วคราวให้เพื่อนเปิดดูแผนที่ 3D โดยไม่ต้องสมัครบัญชี</p><div className="duration-choice" role="radiogroup" aria-label="ระยะเวลา">{[5,10,15].map(m=><button key={m} role="radio" aria-checked={shareMinutes===m} className={shareMinutes===m?"active":""} onClick={()=>setShareMinutes(m)}><b>{m}</b><small>นาที</small></button>)}</div><div className="simulation-banner"><Clock3 size={20}/><span><b>ลิงก์หมดอายุอัตโนมัติ</b><small>ระยะเวลาจำกัดไม่เกินบัตรเจ้าของ และยกเลิกได้ทุกเมื่อ</small></span></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-green full" disabled={busy||!activePass} onClick={createShare}>{busy?"กำลังสร้างลิงก์…":"สร้างและคัดลอกลิงก์"}<Copy size={18}/></button></>}

      {modal==="story"&&<><span className="dialog-icon"><BookOpen size={24}/></span><span className="kicker">ABOUT NAKHON TRIP</span><h2 id="dialog-title">เกี่ยวกับนครทริป</h2><p className="story-copy">นครทริปช่วยให้ทุกวัยเตรียมตัวไปไหว้พระในนครปฐมได้ง่ายขึ้น ด้วยเรื่องราว บทสวด และแบบจำลอง 3D ที่หมุนดูได้รอบทิศ</p><p className="story-copy">โมเดลและผัง 3D เป็นแบบจำลองเชิงศิลป์จากภาพอ้างอิง เพื่อการชมและสำรวจ รายละเอียดบางส่วนเป็นการประมาณ ไม่ใช่ข้อมูลสแกนหรือแบบสำรวจ</p>{temples.map(t=><div className="sources" key={t.id}><span className="kicker">{t.name}</span>{t.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={15}/></a>)}</div>)}<div className="sources"><a href="/asset-credits.txt" target="_blank">เครดิตภาพและโมเดลทั้งหมด <ExternalLink size={15}/></a></div></>}

      {modal==="guide"&&(()=>{const g=guideTemple.guides[activeGuide];const Icon=guideIcons[g.icon];return <><span className={`dialog-icon ${guideTone[g.icon]}`}><Icon size={24}/></span><span className="kicker">{guideTemple.name} · คู่มือเดินชม</span><h2 id="dialog-title">{g.title}</h2><p className="dialog-sub">{g.subtitle}</p>{g.body.map((p,i)=><p className="story-copy" key={i}>{p}</p>)}{activeGuide==="chants"&&<div className="chant-preview in-dialog">{guideTemple.chants.map(c=><div key={c.title}><span className="kicker">{c.title}</span>{c.note&&<small>{c.note}</small>}<p>{c.lines.map(l=><span key={l}>{l}<br/></span>)}</p></div>)}</div>}<div className="guide-tip"><Compass size={18}/><span>{g.tip}</span></div>{activeGuide==="chants"&&<button className="btn btn-outline full copy-chant" onClick={()=>copyText(chantText(guideTemple),"คัดลอกบทสวดแล้ว")}><Copy size={18}/> คัดลอกบทสวด</button>}<button className="btn btn-green full guide-3d" onClick={()=>{setModal(null);openScene(guideTemple,"map",g.focus);}}><Map size={18}/> ดูตำแหน่งนี้ใน 3D <ArrowRight size={18}/></button>{(activeGuide==="history"||activeGuide==="architecture")&&<div className="sources">{guideTemple.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={15}/></a>)}</div>}</>;})()}
    </section></div>}
    {modal==="scene"&&sceneUrl&&<div className="scene-modal" role="dialog" aria-modal="true" aria-label={`สำรวจ${sceneTemple.name}แบบ 3D`}><div className="scene-bar"><button onClick={()=>setModal(null)} aria-label="ปิดหน้าสำรวจ 3D"><X size={22}/></button><span><Map size={18}/> {sceneTemple.name}</span><div className="scene-switch" role="tablist" aria-label="เลือกวัด">{temples.map(t=><button key={t.id} role="tab" aria-selected={sceneTemple.id===t.id} className={sceneTemple.id===t.id?"active":""} onClick={()=>openScene(t,"front")}>{t.short}</button>)}</div>{activePass&&<span className="scene-timer"><Clock3 size={15}/>{remaining(data.pass!.expires_at, data.serverTime)}</span>}</div><iframe key={sceneUrl} title={`แผนที่สามมิติ${sceneTemple.name}`} src={sceneUrl}/></div>}
    {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast("")} aria-label="ปิดข้อความ"><X size={16}/></button></div>}
  </main>;
}
