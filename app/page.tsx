"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight,
  Compass, Copy, CreditCard, DoorOpen, ExternalLink, Heart,
  Home, Landmark, Map, MapPin, Moon, Music2, Route, Search, Settings2, Share2, ShieldCheck,
  Sparkles, Sun, SunMoon, Type, Wallet, X,
} from "lucide-react";
import { temples, templeById, type GuideIcon, type Temple } from "./temples";
import FortunePage, { EXTRA_DRAW_COST } from "./Fortune";
import { asset } from "./base";

type History = { id: string; amount: number; title: string; created_at: number };
type WalletState = { balance: number; history: History[] };
type Tab = "home" | "temple" | "fortune" | "wallet" | "profile";
type TempleSection = "overview" | "highlights" | "worship" | "visit";
type TextSize = "md" | "lg" | "xl";
type Theme = "auto" | "light" | "dark";

const templeSections: { id: TempleSection; label: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "highlights", label: "จุดสำคัญ" },
  { id: "worship", label: "ไหว้พระ · บทสวด" },
  { id: "visit", label: "การเดินทาง" },
];
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
function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "อรุณสวัสดิ์" : h < 16 ? "สวัสดียามบ่าย" : h < 19 ? "สวัสดียามเย็น" : "ราตรีสวัสดิ์";
}
function chantText(t: Temple) { return t.chants.map(c => `${c.title}\n${c.note ? c.note + "\n" : ""}${c.lines.join("\n")}`).join("\n\n"); }
function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try { const v = localStorage.getItem(key) as T | null; return v && allowed.includes(v) ? v : fallback; } catch { return fallback; }
}
function addEntry(w: WalletState, amount: number, title: string): WalletState {
  return { balance: w.balance + amount, history: [{ id: crypto.randomUUID(), amount, title, created_at: Date.now() }, ...w.history].slice(0, 30) };
}
function writePref(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [wallet, setWallet] = useState<WalletState>({ balance: 0, history: [] });
  const [modal, setModal] = useState<"topup" | "scene" | "story" | "guide" | "settings" | null>(null);
  const [templeId, setTempleId] = useState<Temple["id"] | null>(null);
  const [templeSection, setTempleSection] = useState<TempleSection>("overview");
  const [activeGuide, setActiveGuide] = useState("history");
  const [query, setQuery] = useState("");
  const [selectedPack, setSelectedPack] = useState(100);
  const [toast, setToast] = useState("");
  const [sceneUrl, setSceneUrl] = useState("");
  const [sceneTemple, setSceneTemple] = useState<Temple>(temples[0]);
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

  useEffect(() => {
    // Preferences and the demo wallet live in localStorage; read them after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setTextSize(readPref("nt-text", ["md", "lg", "xl"] as const, "md"));
    setTheme(readPref("nt-theme", ["auto", "light", "dark"] as const, "auto"));
    try { setFavorites(JSON.parse(localStorage.getItem("nt-fav") || "[]")); } catch { /* ignore */ }
    try { const w = JSON.parse(localStorage.getItem("nt-wallet") || "null") as WalletState | null; if (w && Number.isFinite(w.balance) && Array.isArray(w.history)) setWallet(w); } catch { /* ignore */ }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [modal]);

  function saveWallet(next: WalletState) { setWallet(next); writePref("nt-wallet", JSON.stringify(next)); }
  function topup() {
    saveWallet(addEntry(wallet, selectedPack, `เติมเครดิตจำลอง ${selectedPack} เครดิต`));
    setModal(null); setToast(`เติมเครดิตจำลอง ${selectedPack} เครดิตแล้ว`);
  }
  const walletRef = useRef(wallet);
  useEffect(() => { walletRef.current = wallet; }, [wallet]);
  const spend = useCallback((amount: number, title: string) => {
    const w = walletRef.current;
    if (w.balance < amount) return false;
    const next = addEntry(w, -amount, title);
    walletRef.current = next; setWallet(next); writePref("nt-wallet", JSON.stringify(next));
    return true;
  }, []);

  function openScene(t: Temple, mode: "map" | "front" = "map", focus?: string) {
    const p = new URLSearchParams({ site: t.id, mode });
    if (focus) p.set("focus", focus);
    if (textSize !== "md") p.set("text", textSize);
    if (document.documentElement.dataset.theme === "dark") p.set("theme", "dark");
    setSceneTemple(t); setSceneUrl(asset(`/viewer/index.html?${p}`)); setModal("scene");
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

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand-mark" onClick={()=>{setTab("home");setTempleId(null);}} aria-label="นครทริป หน้าหลัก"><img className="brand-svg" src={asset("/chedi-mark.svg")} alt=""/><span><strong>นครทริป</strong><small>NAKHON TRIP</small></span></button>
      <div className="top-actions">
        <button className="round-icon" aria-label="ตั้งค่าการแสดงผล ขนาดตัวอักษรและธีม" onClick={()=>setModal("settings")}><Type size={20}/></button>
        <button className="round-icon" aria-label="แชร์แอป" onClick={()=>copyText(location.origin,"คัดลอกลิงก์แอปแล้ว")}><Share2 size={19}/></button>
        <button className="avatar" aria-label="กระเป๋าเครดิต" onClick={()=>setTab("wallet")}><Wallet size={19}/></button>
      </div>
    </header>

    <div className="page-scroll" key={tab + (templeId ?? "")}>
      {<>
        {tab === "home" && <>
          <section className="welcome"><span className="kicker">{greeting()}</span><h1>นักเดินทาง<br/><span>วันนี้อยากไปไหว้พระที่ไหนดี</span></h1></section>
          <form className="searchbox" role="search" onSubmit={e=>{e.preventDefault();setTempleId(null);setTab("temple");}}><Search size={20} aria-hidden/><input aria-label="ค้นหาวัดหรือสถานที่" placeholder="ค้นหาวัด เช่น ทวารวดี, ยายหอม" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="ล้างคำค้นหา" onClick={()=>setQuery("")}><X size={18}/></button>}</form>
          <div className="section-head"><div><span className="kicker">สถานที่แนะนำ</span><h2>วัดในนครปฐม</h2></div><span className="section-count">{temples.length} แห่ง</span></div>
          <div className="hero-wrap"><div className="hero-rail" role="list" ref={railRef} onScroll={onRailScroll} onPointerDown={e=>{if(e.pointerType!=="mouse")return;drag.current={x:e.clientX,left:railRef.current!.scrollLeft,moved:false};}} onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x;if(Math.abs(dx)>5){d.moved=true;railRef.current!.classList.add("dragging");railRef.current!.scrollLeft=d.left-dx;}}} onPointerUp={()=>{const d=drag.current;drag.current=null;railRef.current?.classList.remove("dragging");if(d?.moved)goSlide(slide);}} onPointerLeave={()=>{if(drag.current){drag.current=null;railRef.current?.classList.remove("dragging");goSlide(slide);}}}>{filtered.map((t,i)=><article className="hero-card" key={t.id} role="listitem"><img src={t.photo} alt={t.photoAlt} style={{objectPosition:t.photoPos}}/><div className="hero-shade"/><div className="hero-topline"><span><Sparkles size={14}/> {t.tags[0]}</span><span>{String(i+1).padStart(2,"0")} / {String(temples.length).padStart(2,"0")}</span></div><div className="hero-copy"><span className="hero-location"><MapPin size={15}/> {t.district}</span><h2>{t.name}</h2><p>{t.tagline}</p><div className="hero-actions"><button className="btn btn-light" onClick={()=>openTemple(t.id)}>ดูรายละเอียด <ArrowRight size={18}/></button><button className="btn btn-glass" onClick={()=>openScene(t,"front")}><Compass size={18}/> 3D</button></div></div><button className={`heart-float ${favorites.includes(t.id)?"on":""}`} aria-pressed={favorites.includes(t.id)} aria-label={`บันทึก${t.name}เป็นรายการโปรด`} onClick={()=>toggleFav(t)}><Heart size={20}/></button></article>)}{!filtered.length&&<div className="empty-state">ไม่พบสถานที่ที่ตรงกับ “{query}”</div>}</div>{filtered.length>1&&<><button className="rail-arrow prev" aria-label="สถานที่ก่อนหน้า" disabled={slide===0} onClick={()=>goSlide(slide-1)}><ChevronLeft size={24}/></button><button className="rail-arrow next" aria-label="สถานที่ถัดไป" disabled={slide>=filtered.length-1} onClick={()=>goSlide(slide+1)}><ChevronRight size={24}/></button></>}</div>
          {filtered.length>1&&<div className="rail-dots" role="tablist" aria-label="เลือกสถานที่">{filtered.map((t,i)=><button key={t.id} role="tab" aria-selected={slide===i} aria-label={t.name} className={slide===i?"active":""} onClick={()=>goSlide(i)}><span/></button>)}</div>}
          <div className="section-head"><div><span className="kicker">ทางลัด</span><h2>เริ่มต้นทริป</h2></div></div>
          <div className="shortcut-grid">
            <button onClick={()=>{setTempleId(null);setTab("temple");}}><span className="shortcut-icon"><Landmark/></span><span>วัดทั้งหมด<small>{temples.length} สถานที่</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>openScene(temples[0],"map")}><span className="shortcut-icon moss"><Map/></span><span>แผนที่ 3D<small>หมุนชมรอบทิศ</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>setTab("fortune")}><span className="shortcut-icon rose"><Sparkles/></span><span>เซียมซีวันนี้<small>เขย่าเสี่ยงทายวันละครั้ง</small></span><ChevronRight size={18}/></button>
            <button onClick={()=>setTab("wallet")}><span className="shortcut-icon sand"><Wallet/></span><span>กระเป๋าเครดิต<small>{wallet.balance} เครดิตจำลอง</small></span><ChevronRight size={18}/></button>
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

        {tab === "fortune" && <FortunePage balance={wallet.balance} spend={spend} toast={setToast} openWallet={()=>setTab("wallet")} copy={copyText}/>}

        {tab === "wallet" && <>
          <div className="page-title"><span className="kicker">YOUR TRAVEL WALLET</span><h1>กระเป๋าเครดิต</h1><p>เครดิตจำลองสำหรับเสี่ยงเซียมซีเพิ่ม · บันทึกไว้ในเครื่องนี้</p></div>
          <section className="balance-card"><div className="balance-top"><span><Wallet size={19}/> เครดิตคงเหลือ</span><span className="demo-tag">จำลอง</span></div><div className="balance-amount">{wallet.balance.toLocaleString("th-TH")} <small>เครดิต</small></div><div className="balance-bottom"><span>เสี่ยงเซียมซีเพิ่มครั้งละ {EXTRA_DRAW_COST} เครดิต</span><button aria-label="เติมเครดิต" onClick={()=>setModal("topup")}><ArrowDownLeft size={19}/></button></div></section>
          <div className="section-head"><div><span className="kicker">CHOOSE A PACKAGE</span><h2>แพ็กเกจทดลอง</h2></div></div><div className="package-grid">{packages.map(p=><button key={p.credits} aria-pressed={selectedPack===p.credits} className={`package-card ${selectedPack===p.credits?"selected":""}`} onClick={()=>setSelectedPack(p.credits)}><span className="package-spark" aria-hidden>{p.icon}</span><strong>{p.credits}</strong><small>เครดิต</small><em>{p.label}</em>{selectedPack===p.credits&&<span className="pack-check"><Check size={14}/></span>}</button>)}</div><div className="wallet-terms"><ShieldCheck size={20}/><p><b>เครดิตนี้เป็นข้อมูลจำลอง</b><br/>ไม่มีการเรียกเก็บเงินหรือทำธุรกรรมทางการเงินจริง</p></div><button className="btn btn-gold full" onClick={()=>setModal("topup")}><CreditCard size={19}/> เติม {selectedPack} เครดิตจำลอง <ArrowRight size={18}/></button>
          <div className="section-head"><div><span className="kicker">RECENT ACTIVITY</span><h2>รายการล่าสุด</h2></div></div><div className="history-list">{wallet.history.length?wallet.history.map(item=><div className="history-row" key={item.id}><span className={`history-icon ${item.amount<0?"spent":""}`}>{item.amount<0?<Sparkles size={18}/>:<Wallet size={18}/>}</span><span className="history-title">{item.title}<small>{moneyDate(item.created_at)}</small></span><strong className={item.amount<0?"negative":"positive"}>{item.amount>0?"+":""}{item.amount}</strong></div>):<div className="empty-state">ยังไม่มีรายการ เริ่มเติมเครดิตจำลองได้เลย</div>}</div>
        </>}

        {tab === "profile" && <>
          <div className="page-title"><span className="kicker">YOUR JOURNEY, YOUR WAY</span><h1>ตั้งค่า</h1><p>ปรับการแสดงผลให้อ่านง่ายสำหรับทุกวัย</p></div>
          <div className="section-head"><div><span className="kicker">ACCESSIBILITY</span><h2>การแสดงผล</h2></div></div>
          <div className="card-pad">{settingsPanel}</div>
          <div className="section-head"><div><span className="kicker">MORE</span><h2>เพิ่มเติม</h2></div></div>
          <div className="profile-links"><button onClick={()=>setTab("wallet")}><span><Wallet size={20}/></span><b>กระเป๋าเครดิต<small>{wallet.balance} เครดิตจำลอง</small></b><ChevronRight/></button><button onClick={()=>setTab("fortune")}><span><Sparkles size={20}/></span><b>เซียมซีประจำวัน<small>เขย่าเสี่ยงทายวันละครั้ง</small></b><ChevronRight/></button><button onClick={()=>setModal("story")}><span><BookOpen size={20}/></span><b>เกี่ยวกับนครทริป<small>ที่มาและแหล่งข้อมูล</small></b><ChevronRight/></button></div>
          <p className="profile-footnote">ไม่ต้องสมัครสมาชิก · ข้อมูลบันทึกไว้ในเครื่องนี้เท่านั้น<br/>เครดิตเป็นระบบจำลอง · ไม่มีการรับชำระเงินจริง<br/>โมเดล 3D เป็นงานสร้างเชิงศิลป์จากภาพอ้างอิง</p>
        </>}
      </>}
    </div>

    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {([ ["home",Home,"หน้าหลัก"],["temple",Landmark,"วัด"],["fortune",Sparkles,"เซียมซี"],["wallet",Wallet,"กระเป๋า"],["profile",Settings2,"ตั้งค่า"] ] as const).map(([key,Icon,label])=><button key={key} className={tab===key?"current":""} onClick={()=>{setTab(key);if(key==="temple")setTempleId(null);}} aria-current={tab===key?"page":undefined}><span className="nav-icon"><Icon size={22}/></span><small>{label}</small></button>)}
    </nav>

    {modal&&modal!=="scene"&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="dialog-x" onClick={()=>setModal(null)} aria-label="ปิด"><X size={20}/></button>
      {modal==="settings"&&<><span className="dialog-icon"><Type size={24}/></span><h2 id="dialog-title">การแสดงผล</h2><p className="dialog-sub">ปรับให้อ่านง่ายและสบายตาสำหรับทุกวัย</p>{settingsPanel}<button className="btn btn-green full" onClick={()=>setModal(null)}>เรียบร้อย</button></>}

      {modal==="topup"&&<><span className="dialog-icon amber"><Wallet size={24}/></span><span className="kicker">DEMO CREDIT WALLET</span><h2 id="dialog-title">เติมเครดิตจำลอง</h2><p className="dialog-sub">เลือกแพ็กเกจสำหรับทดลองใช้งาน เครดิตไม่มีมูลค่าเงินจริง</p><div className="modal-packages">{packages.map(p=><button key={p.credits} aria-pressed={selectedPack===p.credits} className={selectedPack===p.credits?"selected":""} onClick={()=>setSelectedPack(p.credits)}><span aria-hidden>{p.icon}</span><b>{p.credits}</b><small>เครดิต</small>{selectedPack===p.credits&&<Check size={16}/>}</button>)}</div><div className="simulation-banner"><ShieldCheck size={20}/><span><b>การทำรายการนี้เป็นการจำลอง</b><small>ไม่มีการเชื่อมต่อธนาคาร บัตร หรือระบบชำระเงิน</small></span></div><button className="btn btn-gold full" onClick={topup}>ยืนยันเติม {selectedPack} เครดิต<ArrowRight size={18}/></button></>}

      {modal==="story"&&<><span className="dialog-icon"><BookOpen size={24}/></span><span className="kicker">ABOUT NAKHON TRIP</span><h2 id="dialog-title">เกี่ยวกับนครทริป</h2><p className="story-copy">นครทริปช่วยให้ทุกวัยเตรียมตัวไปไหว้พระในนครปฐมได้ง่ายขึ้น ด้วยเรื่องราว บทสวด และแบบจำลอง 3D ที่หมุนดูได้รอบทิศ</p><p className="story-copy">โมเดลและผัง 3D เป็นแบบจำลองเชิงศิลป์จากภาพอ้างอิง เพื่อการชมและสำรวจ รายละเอียดบางส่วนเป็นการประมาณ ไม่ใช่ข้อมูลสแกนหรือแบบสำรวจ</p>{temples.map(t=><div className="sources" key={t.id}><span className="kicker">{t.name}</span>{t.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={15}/></a>)}</div>)}<div className="sources"><a href={asset("/asset-credits.txt")} target="_blank">เครดิตภาพและโมเดลทั้งหมด <ExternalLink size={15}/></a></div></>}

      {modal==="guide"&&(()=>{const g=guideTemple.guides[activeGuide];const Icon=guideIcons[g.icon];return <><span className={`dialog-icon ${guideTone[g.icon]}`}><Icon size={24}/></span><span className="kicker">{guideTemple.name} · คู่มือเดินชม</span><h2 id="dialog-title">{g.title}</h2><p className="dialog-sub">{g.subtitle}</p>{g.body.map((p,i)=><p className="story-copy" key={i}>{p}</p>)}{activeGuide==="chants"&&<div className="chant-preview in-dialog">{guideTemple.chants.map(c=><div key={c.title}><span className="kicker">{c.title}</span>{c.note&&<small>{c.note}</small>}<p>{c.lines.map(l=><span key={l}>{l}<br/></span>)}</p></div>)}</div>}<div className="guide-tip"><Compass size={18}/><span>{g.tip}</span></div>{activeGuide==="chants"&&<button className="btn btn-outline full copy-chant" onClick={()=>copyText(chantText(guideTemple),"คัดลอกบทสวดแล้ว")}><Copy size={18}/> คัดลอกบทสวด</button>}<button className="btn btn-green full guide-3d" onClick={()=>{setModal(null);openScene(guideTemple,"map",g.focus);}}><Map size={18}/> ดูตำแหน่งนี้ใน 3D <ArrowRight size={18}/></button>{(activeGuide==="history"||activeGuide==="architecture")&&<div className="sources">{guideTemple.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={15}/></a>)}</div>}</>;})()}
    </section></div>}
    {modal==="scene"&&sceneUrl&&<div className="scene-modal" role="dialog" aria-modal="true" aria-label={`สำรวจ${sceneTemple.name}แบบ 3D`}><div className="scene-bar"><button onClick={()=>setModal(null)} aria-label="ปิดหน้าสำรวจ 3D"><X size={22}/></button><span><Map size={18}/> {sceneTemple.name}</span><div className="scene-switch" role="tablist" aria-label="เลือกวัด">{temples.map(t=><button key={t.id} role="tab" aria-selected={sceneTemple.id===t.id} className={sceneTemple.id===t.id?"active":""} onClick={()=>openScene(t,"front")}>{t.short}</button>)}</div></div><iframe key={sceneUrl} title={`แผนที่สามมิติ${sceneTemple.name}`} src={sceneUrl}/></div>}
    {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast("")} aria-label="ปิดข้อความ"><X size={16}/></button></div>}
  </main>;
}
