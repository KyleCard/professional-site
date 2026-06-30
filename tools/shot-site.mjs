// shot-site.mjs — screenshot the running Astro preview (localhost:4321) over CDP.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9344;
const BASE = "http://localhost:4321";
const OUT = "C:/Users/cardk/Nextcloud/Repos/professional-site/preview/shots";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shots = [
  { out: "crs-l1-desktop.png", path: "/", w: 1440, h: 1000, scrollTo: ".crs", settle: 1200 },
  { out: "crs-l1-mobile.png", path: "/", w: 390, h: 920, dsf: 2, mobile: true, scrollTo: ".crs", settle: 1200 },
  { out: "crs-l1-reduced.png", path: "/", w: 1440, h: 1000, scrollTo: ".crs", reduce: true, settle: 1000 },
  { out: "crs-l1-agreement.png", path: "/", w: 1440, h: 1000, scrollTo: ".crs", settle: 900,
    click: '[data-preset="agree"]', afterClick: 700 },
  { out: "crs-l1-split.png", path: "/", w: 1440, h: 1000, scrollTo: ".crs", settle: 900,
    click: '[data-preset="split"]', afterClick: 700 },
];

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiters = new Map(); this.handlers = new Map();
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
      if (m.id && this.waiters.has(m.id)) { this.waiters.get(m.id)(m); this.waiters.delete(m.id); }
      if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method)(m.params); }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res) => this.waiters.set(id, res)); }
  on(method, fn) { this.handlers.set(method, fn); }
}

async function main() {
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`,
    "--user-data-dir=C:/Users/cardk/AppData/Local/Temp/edge-shot2", "--no-first-run",
    "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 60; i++) { try { ver = await (await fetch(`http://localhost:${PORT}/json/version`)).json(); break; } catch { await sleep(250); } }
  if (!ver) throw new Error("Edge debugger did not start");

  for (const s of shots) {
    const tgt = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: "PUT" })).json()
      .catch(async () => (await fetch(`http://localhost:${PORT}/json/new?about:blank`)).json());
    const ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const cdp = new CDP(ws);
    let loaded = false; cdp.on("Page.loadEventFired", () => (loaded = true));
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.h, deviceScaleFactor: s.dsf || 1, mobile: !!s.mobile });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: s.reduce ? "reduce" : "no-preference" }] });
    await cdp.send("Page.navigate", { url: BASE + s.path });
    for (let i = 0; i < 100 && !loaded; i++) await sleep(50);
    await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>true)", awaitPromise: true });
    await sleep(400);
    if (s.scrollTo) {
      await cdp.send("Runtime.evaluate", { expression:
        `(()=>{const el=document.querySelector(${JSON.stringify(s.scrollTo)});if(!el)return'noel';` +
        `el.scrollIntoView({block:'center'});return scrollY})()` });
      await sleep(s.settle || 1200);
    } else { await sleep(s.settle || 600); }
    if (s.click) {
      await cdp.send("Runtime.evaluate", { expression:
        `(()=>{const el=document.querySelector(${JSON.stringify(s.click)});if(el)el.click();return!!el})()` });
      await sleep(s.afterClick || 600);
    }
    const { result } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(`${OUT}/${s.out}`, Buffer.from(result.data, "base64"));
    console.log("shot:", s.out);
    ws.close();
  }
  proc.kill(); console.log("done →", OUT); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
