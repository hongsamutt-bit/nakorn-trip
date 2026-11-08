"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, RotateCcw, Smartphone, Sparkles, Wallet } from "lucide-react";
import { fortunes, levelTone, type Fortune } from "./fortunes";

type Phase = "idle" | "shaking" | "drop" | "reveal" | "done";
type Saved = { date: string; no: number; extra: number };

export const EXTRA_DRAW_COST = 10;
const KEY = "nt-siamsi";
const STICKS = 16;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function untilMidnight(now: number) {
  const end = new Date(now); end.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.floor((end.getTime() - now) / 60000));
  return `${Math.floor(m / 60)} ชม. ${m % 60} นาที`;
}
function load(): Saved | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null") as Saved | null; return v && v.date === today() ? v : null; } catch { return null; }
}
function pick(exclude?: number) {
  const r = new Uint32Array(1);
  let n: number;
  do { crypto.getRandomValues(r); n = (r[0] % fortunes.length) + 1; } while (n === exclude && fortunes.length > 1);
  return n;
}

type Props = {
  balance: number;
  spend: (amount: number, title: string) => boolean;
  toast: (msg: string) => void;
  openWallet: () => void;
  copy: (text: string, ok: string) => void;
};

export default function FortunePage({ balance, spend, toast, openWallet, copy }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [current, setCurrent] = useState<Fortune | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [motionAsk, setMotionAsk] = useState(false);
  const [motionOn, setMotionOn] = useState(false);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is read after hydration */
    const s = load();
    if (s) { setSaved(s); setCurrent(fortunes[s.no - 1]); setPhase("done"); }
    const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === "function") setMotionAsk(true);
    else if (DM) setMotionOn(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(t); timers.current.forEach(clearTimeout); };
  }, []);

  const shake = useCallback((paid = false) => {
    if (phaseRef.current === "shaking" || phaseRef.current === "drop" || phaseRef.current === "reveal") return;
    const prev = load();
    if (prev && !paid) return;
    if (paid && !spend(EXTRA_DRAW_COST, "เสี่ยงเซียมซีเพิ่ม")) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const no = pick(prev?.no);
    const next: Saved = { date: today(), no, extra: (prev?.extra ?? 0) + (paid ? 1 : 0) };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setSaved(next); setCurrent(fortunes[no - 1]); setPhase("shaking");
    try { navigator.vibrate?.([60, 40, 60, 40, 60, 40, 90, 60, 120]); } catch { /* not supported */ }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, reduce ? ms / 4 : ms));
    at(2300, () => setPhase("drop"));
    at(3500, () => { setPhase("reveal"); try { navigator.vibrate?.(30); } catch { /* not supported */ } });
    at(4600, () => setPhase("done"));
  }, [spend]);

  // Shake the phone to draw (Android works directly; iOS needs a tap to allow motion).
  useEffect(() => {
    if (!motionOn) return;
    let lastHit = 0, hits = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const g = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (g < 20) return;
      const t = Date.now();
      hits = t - lastHit < 600 ? hits + 1 : 1; lastHit = t;
      if (hits >= 3 && phaseRef.current === "idle") { hits = 0; shake(); }
    };
    addEventListener("devicemotion", onMotion);
    return () => removeEventListener("devicemotion", onMotion);
  }, [motionOn, shake]);

  async function enableMotion() {
    const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    try { const r = await DM?.requestPermission?.(); if (r === "granted") { setMotionOn(true); setMotionAsk(false); toast("เขย่ามือถือเพื่อเสี่ยงเซียมซีได้เลย"); } }
    catch { toast("เปิดการตรวจจับการเขย่าไม่ได้ ใช้ปุ่มแทนได้เลย"); }
  }

  function again() {
    if (balance < EXTRA_DRAW_COST) { toast(`เครดิตไม่พอ ต้องใช้ ${EXTRA_DRAW_COST} เครดิต`); openWallet(); return; }
    setPhase("idle");
    timers.current.push(window.setTimeout(() => shake(true), 350));
  }

  const f = current;
  const busy = phase === "shaking" || phase === "drop" || phase === "reveal";
  const showStick = phase === "drop" || phase === "reveal" || phase === "done";

  return <>
    <div className="page-title"><span className="kicker">DAILY FORTUNE STICKS</span><h1>เซียมซีประจำวัน</h1><p>ตั้งจิตอธิษฐาน แล้วเขย่ากระบอกเซียมซีวันละครั้ง</p></div>

    <section className={`siamsi-stage phase-${phase}`} aria-live="polite">
      <div className="siamsi-glow" aria-hidden/>
      <div className="siamsi-cup" aria-hidden>
        <div className="siamsi-sticks">{Array.from({ length: STICKS }, (_, i) => <i key={i} style={{ ["--i" as string]: i, ["--x" as string]: `${(i - (STICKS - 1) / 2) * 5.2}px`, ["--r" as string]: `${(i - (STICKS - 1) / 2) * 1.6}deg`, ["--h" as string]: `${118 + ((i * 37) % 23)}px` }}/>)}</div>
        <div className="siamsi-body"><span className="band top"/><span className="siamsi-label">เซียมซี</span><span className="band bottom"/></div>
      </div>
      {showStick && f && <div className="fall-stick" aria-hidden><span>{f.no}</span></div>}
      {phase === "reveal" && f && <div className="siamsi-number" role="status"><small>ได้ใบที่</small><b>{f.no}</b></div>}
      {phase === "reveal" && <div className="sparkles" aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 36}deg` }}/>)}</div>}
    </section>

    {phase === "idle" && <div className="siamsi-actions">
      <ol className="siamsi-steps"><li><b>1</b> ตั้งจิตนึกถึงสิ่งที่อยากรู้</li><li><b>2</b> กดปุ่มหรือเขย่ามือถือ</li><li><b>3</b> รับใบเซียมซีของวันนี้</li></ol>
      <button className="btn btn-gold full siamsi-btn" onClick={() => shake()}><Sparkles size={20}/> เขย่าเซียมซี</button>
      {motionAsk && <button className="btn btn-outline full" onClick={enableMotion}><Smartphone size={19}/> เปิดใช้การเขย่ามือถือ</button>}
      {motionOn && <p className="small-center"><Smartphone size={15}/> เขย่ามือถือแรง ๆ ก็เสี่ยงได้เช่นกัน</p>}
    </div>}
    {busy && <p className="small-center siamsi-wait">{phase === "shaking" ? "กำลังเขย่า… ตั้งจิตให้มั่น" : "ไม้เซียมซีหล่นออกมาแล้ว"}</p>}

    {phase === "done" && f && <>
      <article className={`fortune-slip ${levelTone[f.level]}`}>
        <header><span className="slip-no">ใบที่ {f.no}</span><span className="slip-level">{f.level}</span></header>
        <p className="slip-verse">{f.verse[0]}<br/>{f.verse[1]}</p>
        <p className="slip-meaning">{f.meaning}</p>
        <dl className="slip-areas">
          <div><dt>การงาน · การเรียน</dt><dd>{f.work}</dd></div>
          <div><dt>การเงิน</dt><dd>{f.money}</dd></div>
          <div><dt>ความรัก</dt><dd>{f.love}</dd></div>
          <div><dt>สุขภาพ</dt><dd>{f.health}</dd></div>
        </dl>
        <p className="slip-tip"><Sparkles size={17}/><span><b>เสริมดวง</b> {f.tip}</span></p>
      </article>
      <button className="btn btn-outline full" onClick={() => copy(`เซียมซีนครทริป ใบที่ ${f.no} (${f.level})\n${f.verse.join("\n")}\n${f.meaning}`, "คัดลอกคำทำนายแล้ว")}><Copy size={18}/> คัดลอกคำทำนาย</button>
      <div className="siamsi-next">
        <p>เสี่ยงฟรีได้อีกครั้งในอีก <b>{untilMidnight(now)}</b>{saved && saved.extra > 0 ? ` · วันนี้เสี่ยงเพิ่มแล้ว ${saved.extra} ครั้ง` : ""}</p>
        <button className="btn btn-green full" onClick={again}><RotateCcw size={18}/> เสี่ยงอีกครั้ง · {EXTRA_DRAW_COST} เครดิต</button>
        <button className="link-btn" onClick={openWallet}><Wallet size={16}/> เครดิตคงเหลือ {balance} · เติมเครดิตจำลอง</button>
      </div>
    </>}
    <p className="profile-footnote">คำทำนายเขียนขึ้นเพื่อความบันเทิงและเป็นกำลังใจ ไม่ใช่เซียมซีของวัดใดวัดหนึ่ง</p>
  </>;
}
