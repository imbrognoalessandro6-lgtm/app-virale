(function () {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const RESULTS = window.RESULTS;
  const QUESTIONS = window.QUESTIONS;

  const $ = (id) => document.getElementById(id);
  const baseUrl = (cfg.siteUrl || location.origin + location.pathname).replace(/index\.html$/, "");

  let current = 0;
  let scores = {};
  let resultKey = null;

  // ---------- Navigazione ----------
  function show(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + screen).classList.add("active");
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  function track(event, data) {
    // Hook per analytics (es. Plausible, GA4). Non fa nulla se non configurato.
    if (typeof window.gtag === "function") window.gtag("event", event, data || {});
    if (typeof window.plausible === "function") window.plausible(event, { props: data || {} });
  }

  // ---------- Quiz ----------
  function start() {
    current = 0;
    scores = Object.fromEntries(Object.keys(RESULTS).map((k) => [k, 0]));
    track("quiz_start");
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const q = QUESTIONS[current];
    $("progress-bar").style.width = (current / QUESTIONS.length) * 100 + "%";
    $("q-count").textContent = `Domanda ${current + 1} di ${QUESTIONS.length}`;
    $("question").textContent = q.q;
    const box = $("answers");
    box.innerHTML = "";
    q.a.forEach((ans) => {
      const b = document.createElement("button");
      b.className = "answer";
      b.textContent = ans.t;
      b.addEventListener("click", () => answer(ans));
      box.appendChild(b);
    });
  }

  function answer(ans) {
    for (const [k, v] of Object.entries(ans.p)) scores[k] += v;
    current++;
    if (current < QUESTIONS.length) {
      renderQuestion();
    } else {
      $("progress-bar").style.width = "100%";
      show("loading");
      setTimeout(finish, 1400);
    }
  }

  function finish() {
    const max = Math.max(...Object.values(scores));
    const winners = Object.keys(scores).filter((k) => scores[k] === max);
    resultKey = winners[Math.floor(Math.random() * winners.length)];
    try { localStorage.setItem("lastResult", resultKey); } catch (e) { /* ignora */ }
    track("quiz_complete", { result: resultKey });
    renderResult(resultKey);
    show("result");
  }

  // ---------- Risultato ----------
  function renderResult(key) {
    const r = RESULTS[key];
    $("result-emoji").textContent = r.emoji;
    $("result-name").textContent = r.name;
    $("result-tagline").textContent = r.tagline;
    $("result-desc").textContent = r.description;
    $("result-card").style.background = `linear-gradient(135deg, ${r.colors[0]}, ${r.colors[1]})`;

    const text = shareText(key);
    const link = challengeLink(key);
    const enc = encodeURIComponent;
    $("share-wa").href = `https://wa.me/?text=${enc(text + " " + link)}`;
    $("share-tg").href = `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`;
    $("share-x").href = `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`;
    $("share-fb").href = `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`;

    const aff = $("affiliate");
    if (cfg.amazonTag) {
      aff.href = `https://www.amazon.it/s?k=${enc(r.amazonQuery)}&tag=${enc(cfg.amazonTag)}`;
      aff.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = `${r.emoji} Il must-have per chi è ${r.name}: ${r.product} →`;
      const small = document.createElement("small");
      small.textContent = "Link affiliato Amazon";
      aff.append(strong, small);
      aff.classList.remove("hidden");
    } else {
      aff.classList.add("hidden");
    }
  }

  function shareText(key) {
    const r = RESULTS[key];
    return `Ho fatto il quiz e sono ${r.name} ${r.emoji} "${r.tagline}" E tu che pasta sei?`;
  }

  function challengeLink(key) {
    return `${baseUrl}?amico=${encodeURIComponent(key)}`;
  }

  // ---------- Immagine per le storie (1080x1920) ----------
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = w;
        y += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
    return y;
  }

  function buildStoryImage(key) {
    const r = RESULTS[key];
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext("2d");

    const g = ctx.createLinearGradient(0, 0, 1080, 1920);
    g.addColorStop(0, r.colors[0]);
    g.addColorStop(1, r.colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,.25)";
    ctx.shadowBlur = 12;

    ctx.font = "600 64px system-ui, sans-serif";
    ctx.fillText("CHE PASTA SEI?", 540, 260);

    ctx.font = "320px serif";
    ctx.fillText(r.emoji, 540, 760);

    ctx.font = "500 56px system-ui, sans-serif";
    ctx.fillText("Io sono…", 540, 920);

    ctx.font = "800 110px system-ui, sans-serif";
    const nameEnd = wrapText(ctx, r.name.toUpperCase(), 540, 1060, 960, 120);

    ctx.font = "600 56px system-ui, sans-serif";
    const tagEnd = wrapText(ctx, r.tagline, 540, nameEnd + 110, 900, 70);

    ctx.font = "400 44px system-ui, sans-serif";
    wrapText(ctx, r.description, 540, tagEnd + 110, 900, 60);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    roundRect(ctx, 140, 1660, 800, 140, 70);
    ctx.fill();
    ctx.fillStyle = r.colors[1];
    ctx.font = "700 52px system-ui, sans-serif";
    ctx.fillText("E tu che pasta sei? 👉", 540, 1750);

    return new Promise((resolve) => c.toBlob(resolve, "image/png"));
  }

  function roundRect(ctx, x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  async function shareStory() {
    track("share_story", { result: resultKey });
    const blob = await buildStoryImage(resultKey);
    const file = new File([blob], `che-pasta-sei-${resultKey}.png`, { type: "image/png" });
    const data = { files: [file], text: shareText(resultKey) + " " + challengeLink(resultKey) };
    if (navigator.canShare && navigator.canShare(data)) {
      try { await navigator.share(data); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    // Fallback: scarica l'immagine
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Immagine salvata! Pubblicala nella tua storia 📲");
  }

  async function challenge() {
    track("share_challenge", { result: resultKey });
    const link = challengeLink(resultKey);
    const text = shareText(resultKey);
    if (navigator.share) {
      try { await navigator.share({ title: "Che Pasta Sei?", text, url: link }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(text + " " + link);
      toast("Link copiato! Mandalo ai tuoi amici 🔗");
    } catch (e) {
      prompt("Copia questo link:", link);
    }
  }

  // ---------- Monetizzazione ----------
  function setupAds() {
    if (!cfg.adsenseClient) return;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.adsenseClient)}`;
    document.head.appendChild(s);

    document.querySelectorAll(".ad-slot").forEach((el) => {
      const slotId = (cfg.adSlots || {})[el.dataset.slot];
      if (!slotId) return;
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.dataset.adClient = cfg.adsenseClient;
      ins.dataset.adSlot = slotId;
      ins.dataset.adFormat = "auto";
      ins.dataset.fullWidthResponsive = "true";
      el.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  function setupSupport() {
    if (!cfg.supportUrl) return;
    const s = $("support");
    s.href = cfg.supportUrl;
    s.classList.remove("hidden");
  }

  // ---------- Avvio ----------
  function init() {
    const params = new URLSearchParams(location.search);
    const friend = params.get("amico");
    if (friend && RESULTS[friend]) {
      const r = RESULTS[friend];
      const banner = $("friend-banner");
      banner.textContent = `Un tuo amico è ${r.name} ${r.emoji} — e tu? Scoprilo e confrontati!`;
      banner.classList.remove("hidden");
      track("challenge_open", { friend });
    }

    let last = null;
    try { last = localStorage.getItem("lastResult"); } catch (e) { /* ignora */ }
    if (last && RESULTS[last]) {
      $("play-counter").textContent = `L'ultima volta eri ${RESULTS[last].name} ${RESULTS[last].emoji}. Sarà ancora così?`;
    }

    $("btn-start").addEventListener("click", start);
    $("btn-retry").addEventListener("click", start);
    $("btn-share").addEventListener("click", shareStory);
    $("btn-challenge").addEventListener("click", challenge);

    setupAds();
    setupSupport();
  }

  init();
})();
