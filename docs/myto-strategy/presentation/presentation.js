// Navigation, scaling, overview and presentation mode. No dependencies.
(() => {
  const cells = [...document.querySelectorAll(".cell")];
  const total = cells.length, count = document.getElementById("count");
  const q = new URLSearchParams(location.search);
  let cur = 0, typed = "", idleT;
  const clamp = (n) => Math.max(0, Math.min(total - 1, n));

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    const ox = (innerWidth - 1920 * s) / 2, oy = (innerHeight - 1080 * s) / 2;
    document.documentElement.style.setProperty("--s", s);
    document.documentElement.style.setProperty("--ox", ox + "px");
    document.documentElement.style.setProperty("--oy", oy + "px");
  }
  function show(i, push = true) {
    cur = clamp(i);
    cells.forEach((c, k) => { c.classList.toggle("on", k === cur); c.classList.toggle("cur", k === cur); c.toggleAttribute("inert", k !== cur && !document.body.classList.contains("overview")); });
    count.textContent = `${cur + 1} / ${total}`;
    if (push) history.replaceState(null, "", "#" + (cur + 1));
  }
  const go = (d) => show(cur + d);
  function overview(on) {
    document.body.classList.toggle("overview", on);
    cells.forEach((c) => c.removeAttribute("inert"));
    if (!on) show(cur, true); else cells[cur].scrollIntoView({ block: "center" });
  }
  function present(on) {
    document.body.classList.toggle("presenting", on);
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen();
  }
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) document.body.classList.remove("presenting"); fit(); });

  document.getElementById("prev").onclick = () => go(-1);
  document.getElementById("next").onclick = () => go(1);
  document.getElementById("ov").onclick = () => overview(!document.body.classList.contains("overview"));
  document.getElementById("pm").onclick = () => present(!document.body.classList.contains("presenting"));
  cells.forEach((c, k) => c.addEventListener("click", () => { if (document.body.classList.contains("overview")) { cur = k; overview(false); } }));

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { typed += k; return; }
    if (k === "Enter" && typed) { show(Number(typed) - 1); typed = ""; return; }
    typed = "";
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(k)) { e.preventDefault(); if (!document.body.classList.contains("overview")) go(1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(k)) { e.preventDefault(); if (!document.body.classList.contains("overview")) go(-1); }
    else if (k === "Home") show(0); else if (k === "End") show(total - 1);
    else if (k === "g" || k === "o") overview(!document.body.classList.contains("overview"));
    else if (k === "f" || k === "p") present(!document.body.classList.contains("presenting"));
    else if (k === "Escape") { if (document.body.classList.contains("overview")) overview(false); else present(false); }
  });
  addEventListener("mousemove", () => { document.body.classList.add("ui-awake"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.remove("ui-awake"), 1800); });
  addEventListener("resize", fit);
  addEventListener("hashchange", () => show(Number(location.hash.slice(1)) - 1 || 0, false));

  fit();
  document.body.classList.add("ui-awake"); idleT = setTimeout(() => document.body.classList.remove("ui-awake"), 3000);
  if (q.has("print")) { document.body.classList.add("print"); cells.forEach((c) => c.classList.add("on")); document.fonts.ready.then(() => { document.body.dataset.ready = "1"; }); }
  else { show((Number(location.hash.slice(1)) || 1) - 1, false); document.fonts.ready.then(() => { document.body.dataset.ready = "1"; }); if (q.has("overview")) overview(true); }
})();
