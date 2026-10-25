(function () {
  "use strict";

  var GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
  var GIORNI_LABEL = {
    lunedi: "Lunedì",
    martedi: "Martedì",
    mercoledi: "Mercoledì",
    giovedi: "Giovedì",
    venerdi: "Venerdì",
    sabato: "Sabato",
    domenica: "Domenica"
  };
  var PASTI = ["colazione", "pranzo", "cena"];
  var PASTI_LABEL = { colazione: "Colazione", pranzo: "Pranzo", cena: "Cena" };

  var menuData = null;
  var recipesData = null;
  var foodsData = null;
  var shoppingData = null;
  var oggiKey = GIORNI[new Date().getDay()];

  var API_SPESA = "api/shopping";
  var kwVersion = 0;
  var kwSyncing = false;

  var timerInterval = null;
  var timerSeconds = 0;
  var timerRunning = false;

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  function caricaDati() {
    var p1 = fetch("data/menu.json").then(function (r) { return r.json(); });
    var p2 = fetch("data/recipes.json").then(function (r) { return r.json(); });
    var p3 = fetch("data/foods.json").then(function (r) { return r.json(); });
    var p4 = fetch("data/shopping.json").then(function (r) { return r.json(); }).catch(function () { return []; });
    Promise.all([p1, p2, p3, p4]).then(function (results) {
      menuData = results[0];
      recipesData = results[1];
      foodsData = results[2];
      shoppingData = results[3];
      renderOggi();
      renderSettimana();
      renderCatalogoSpesa();
      renderSuggeritiPiano();
      renderSpesa();
    }).catch(function (err) {
      console.error("Errore caricamento dati:", err);
    });
  }

  function pastoDiOggi(pastoKey) {
    var giornoMenu = menuData ? menuData[oggiKey] : null;
    return giornoMenu ? giornoMenu[pastoKey] : null;
  }

  function renderOggi() {
    if (!menuData) return;
    var titolo = qs("#oggi-titolo");
    titolo.textContent = "Oggi è " + GIORNI_LABEL[oggiKey];

    for (var p = 0; p < PASTI.length; p++) {
      var pastoKey = PASTI[p];
      var voce = pastoDiOggi(pastoKey) || {};
      var elMain = qs("#oggi-" + pastoKey + "-main");
      var elAlt = qs("#oggi-" + pastoKey + "-alt");
      elMain.textContent = voce.main || "-";
      if (voce.alt) {
        elAlt.textContent = "oppure: " + voce.alt;
        elAlt.style.display = "";
      } else {
        elAlt.style.display = "none";
      }
    }
  }

  function renderSettimana() {
    if (!menuData) return;
    var grid = qs("#settimana-grid");
    grid.innerHTML = "";

    var corner = document.createElement("div");
    grid.appendChild(corner);
    for (var p = 0; p < PASTI.length; p++) {
      var h = document.createElement("div");
      h.className = "pasto-header";
      h.textContent = PASTI_LABEL[PASTI[p]];
      grid.appendChild(h);
    }

    var ordineGiorni = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];
    for (var g = 0; g < ordineGiorni.length; g++) {
      var giorno = ordineGiorni[g];
      var cellaGiorno = document.createElement("div");
      cellaGiorno.className = "cella-giorno" + (giorno === oggiKey ? " oggi" : "");
      cellaGiorno.textContent = GIORNI_LABEL[giorno];
      grid.appendChild(cellaGiorno);

      for (var pp = 0; pp < PASTI.length; pp++) {
        var pastoKey = PASTI[pp];
        var voce = (menuData[giorno] && menuData[giorno][pastoKey]) || {};
        var cellaPiatto = document.createElement("div");
        cellaPiatto.className = "cella-piatto" + (giorno === oggiKey ? " oggi-col" : "");

        var main = document.createElement("div");
        main.className = "cella-piatto-main";
        main.textContent = voce.main || "-";
        main.setAttribute("data-piatto", voce.main || "");
        main.addEventListener("click", function () {
          var piatto = this.getAttribute("data-piatto");
          if (piatto) apriRicetta(piatto);
        });
        cellaPiatto.appendChild(main);

        if (voce.alt) {
          var alt = document.createElement("div");
          alt.className = "cella-piatto-alt";
          alt.textContent = "oppure: " + voce.alt;
          alt.setAttribute("data-piatto", voce.alt);
          alt.addEventListener("click", function () {
            var piatto = this.getAttribute("data-piatto");
            if (piatto) apriRicetta(piatto);
          });
          cellaPiatto.appendChild(alt);
        }

        grid.appendChild(cellaPiatto);
      }
    }
  }

  function apriRicetta(nomePiatto) {
    var ricetta = recipesData ? recipesData[nomePiatto] : null;
    if (!ricetta) {
      alert("Ricetta non trovata per: " + nomePiatto);
      return;
    }
    qs("#ricetta-titolo").textContent = nomePiatto;
    qs("#ricetta-tempo").textContent = "⏱️ " + (ricetta.tempo || "-");
    qs("#ricetta-porzioni").textContent = "🍽️ " + (ricetta.porzioni || "-") + " porzioni";

    var listaIngredienti = qs("#lista-ingredienti");
    listaIngredienti.innerHTML = "";
    var ingredienti = ricetta.ingredienti || [];
    for (var i = 0; i < ingredienti.length; i++) {
      var ing = ingredienti[i];
      var li = document.createElement("li");
      var spanNome = document.createElement("span");
      spanNome.textContent = ing.nome;
      var spanQta = document.createElement("span");
      spanQta.textContent = ing.quantita;
      li.appendChild(spanNome);
      li.appendChild(spanQta);
      listaIngredienti.appendChild(li);
    }

    var listaPassi = qs("#lista-passi");
    listaPassi.innerHTML = "";
    var passi = ricetta.passi || [];
    for (var j = 0; j < passi.length; j++) {
      var passo = passi[j];
      var item = document.createElement("li");
      item.className = "passo-item";

      var numero = document.createElement("div");
      numero.className = "passo-numero";
      numero.textContent = String(j + 1);
      item.appendChild(numero);

      var testo = document.createElement("div");
      testo.className = "passo-testo";
      testo.textContent = passo.testo;
      item.appendChild(testo);

      if (passo.minuti) {
        var btnTimer = document.createElement("button");
        btnTimer.className = "btn-timer-passo";
        btnTimer.textContent = "⏱️ " + passo.minuti + " min";
        btnTimer.setAttribute("data-minuti", String(passo.minuti));
        btnTimer.setAttribute("data-label", "Passo " + (j + 1));
        btnTimer.addEventListener("click", function () {
          var min = parseInt(this.getAttribute("data-minuti"), 10);
          var lbl = this.getAttribute("data-label");
          avviaTimer(min, lbl);
        });
        item.appendChild(btnTimer);
      }

      listaPassi.appendChild(item);
    }

    qs("#btn-aggiungi-spesa").setAttribute("data-piatto", nomePiatto);

    cambiaVista("ricetta");
  }

  function cambiaVista(nomeVista) {
    var views = qsa(".view");
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove("active");
    }
    var target = qs("#view-" + nomeVista);
    if (target) target.classList.add("active");

    var tabs = qsa(".tab-btn");
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].classList.remove("active");
      if (tabs[t].getAttribute("data-view") === nomeVista) {
        tabs[t].classList.add("active");
      }
    }
  }

  /* ---------- LISTA DELLA SPESA (sincronizzata via API) ----------
     "listaSpesa" in localStorage è la copia cache dell'elenco server:
     un array di { id, nome, emoji, origine, aggiunto_il, comprato }.
     Le voci con comprato=false sono "da comprare". Le modifiche sono
     applicate subito in locale (optimistic) e accodate in "kwPendingOps"
     se offline; vengono rigiocate quando torna la rete. */

  function getHouseCode() {
    try {
      return localStorage.getItem("kwHouseCode") || "";
    } catch (e) {
      return "";
    }
  }

  function setHouseCode(code) {
    try {
      localStorage.setItem("kwHouseCode", code);
    } catch (e) { /* ignora */ }
  }

  function authHeaders() {
    return { "Authorization": "Bearer " + getHouseCode(), "Content-Type": "application/json" };
  }

  function caricaSpesa() {
    try {
      var raw = localStorage.getItem("listaSpesa");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function salvaSpesaCache(lista, version) {
    try {
      localStorage.setItem("listaSpesa", JSON.stringify(lista));
      if (typeof version === "number") {
        kwVersion = version;
        localStorage.setItem("kwVersion", String(version));
      }
    } catch (e) {
      console.error("Impossibile salvare la cache della lista spesa:", e);
    }
  }

  function caricaCoda() {
    try {
      var raw = localStorage.getItem("kwPendingOps");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function salvaCoda(coda) {
    try {
      localStorage.setItem("kwPendingOps", JSON.stringify(coda));
    } catch (e) { /* ignora */ }
  }

  function accodaOperazione(op) {
    var coda = caricaCoda();
    coda.push(op);
    salvaCoda(coda);
  }

  function trovaIndiceSpesa(lista, nome) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].nome === nome && !lista[i].comprato) return i;
    }
    return -1;
  }

  function trovaIndicePerId(lista, id) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return i;
    }
    return -1;
  }

  function generaIdLocale() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function mostraOverlayCodice(messaggioErrore) {
    var overlay = qs("#codice-overlay");
    if (!overlay) return;
    overlay.classList.add("visible");
    var errore = qs("#codice-errore");
    if (messaggioErrore) {
      errore.textContent = messaggioErrore;
      errore.style.display = "block";
    } else {
      errore.style.display = "none";
    }
  }

  function nascondiOverlayCodice() {
    var overlay = qs("#codice-overlay");
    if (overlay) overlay.classList.remove("visible");
  }

  function verificaCodiceCasa() {
    var input = qs("#input-codice-casa");
    var codice = (input.value || "").trim();
    if (!codice) return;
    fetch(API_SPESA, { headers: { "Authorization": "Bearer " + codice } })
      .then(function (r) {
        if (r.status === 401) {
          mostraOverlayCodice("Codice non valido, riprova.");
          return null;
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        setHouseCode(codice);
        nascondiOverlayCodice();
        salvaSpesaCache(data.items || [], data.version || 0);
        renderSpesa();
      })
      .catch(function () {
        mostraOverlayCodice("Impossibile contattare il server, controlla la connessione.");
      });
  }

  function sincronizzaSpesa() {
    if (!getHouseCode()) {
      mostraOverlayCodice();
      return;
    }
    if (kwSyncing) return;
    kwSyncing = true;
    rigiocaCoda().then(function () {
      return fetch(API_SPESA, { headers: authHeaders() });
    }).then(function (r) {
      if (r.status === 401) {
        mostraOverlayCodice("Codice non valido, riprova.");
        kwSyncing = false;
        return null;
      }
      return r.json();
    }).then(function (data) {
      kwSyncing = false;
      if (!data) return;
      salvaSpesaCache(data.items || [], data.version || 0);
      renderSpesa();
    }).catch(function () {
      kwSyncing = false;
      /* offline: la cache locale resta valida */
    });
  }

  function rigiocaCoda() {
    var coda = caricaCoda();
    if (!coda.length) return Promise.resolve();

    function eseguiProssima() {
      var coda2 = caricaCoda();
      if (!coda2.length) return Promise.resolve();
      var op = coda2[0];
      var req;
      if (op.type === "add") {
        req = fetch(API_SPESA, { method: "POST", headers: authHeaders(), body: JSON.stringify(op.payload) });
      } else if (op.type === "patch") {
        req = fetch(API_SPESA, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(op.payload) });
      } else {
        return Promise.resolve();
      }
      return req.then(function (r) {
        if (r.status === 401) {
          throw new Error("unauthorized");
        }
        var rimanenti = caricaCoda();
        rimanenti.shift();
        salvaCoda(rimanenti);
        return eseguiProssima();
      });
    }

    return eseguiProssima().catch(function (err) {
      if (err && err.message === "unauthorized") {
        mostraOverlayCodice("Codice non valido, riprova.");
      }
      /* altri errori di rete: riprova al prossimo sync */
    });
  }

  function renderSpesa() {
    var listaCompleta = caricaSpesa();
    var lista = [];
    for (var k = 0; k < listaCompleta.length; k++) {
      if (!listaCompleta[k].comprato) lista.push(listaCompleta[k]);
    }

    var ul = qs("#lista-spesa");
    ul.innerHTML = "";

    qs("#da-comprare-titolo").textContent = "Da comprare (" + lista.length + ")";
    qs("#spesa-vuoto-msg").style.display = lista.length === 0 ? "block" : "none";
    ul.style.display = lista.length === 0 ? "none" : "block";

    for (var i = 0; i < lista.length; i++) {
      var voce = lista[i];
      var li = document.createElement("li");
      li.setAttribute("data-id", voce.id);

      var emoji = document.createElement("span");
      emoji.className = "articolo-emoji";
      emoji.textContent = voce.emoji || "🛒";
      li.appendChild(emoji);

      var testo = document.createElement("span");
      testo.className = "articolo-testo";
      testo.textContent = voce.nome;
      li.appendChild(testo);

      var comprato = document.createElement("span");
      comprato.className = "articolo-comprato";
      comprato.textContent = "✓ comprato";
      li.appendChild(comprato);

      li.addEventListener("click", function () {
        var id = this.getAttribute("data-id");
        rimuoviDaSpesa(id);
      });

      ul.appendChild(li);
    }

    renderCatalogoSpesa();
  }

  function rimuoviDaSpesa(id) {
    var lista = caricaSpesa();
    var idx = trovaIndicePerId(lista, id);
    if (idx !== -1) {
      lista[idx].comprato = true;
      salvaSpesaCache(lista);
    }
    renderSpesa();
    accodaOperazione({ type: "patch", payload: { id: id, action: "toggle", comprato: true } });
    sincronizzaSpesa();
  }

  function aggiungiVoceSpesa(nome, emoji, origine) {
    nome = (nome || "").trim();
    if (!nome) return;
    var lista = caricaSpesa();
    if (trovaIndiceSpesa(lista, nome) !== -1) return;
    var id = generaIdLocale();
    lista.push({
      id: id,
      nome: nome,
      emoji: emoji || "📝",
      origine: origine || "manuale",
      aggiunto_il: new Date().toISOString(),
      comprato: false
    });
    salvaSpesaCache(lista);
    renderSpesa();
    accodaOperazione({ type: "add", payload: { id: id, nome: nome, emoji: emoji || "📝", origine: origine || "manuale" } });
    sincronizzaSpesa();
  }

  function aggiungiArticolo(nome) {
    aggiungiVoceSpesa(nome, "📝", "manuale");
  }

  function toggleAlimentoCatalogo(nome, emoji) {
    var lista = caricaSpesa();
    var idx = trovaIndiceSpesa(lista, nome);
    if (idx === -1) {
      aggiungiVoceSpesa(nome, emoji, "catalogo");
    } else {
      var id = lista[idx].id;
      rimuoviDaSpesa(id);
    }
    renderSuggeritiPiano();
  }

  function svuotaSpesa() {
    if (!confirm("Vuoi svuotare tutta la lista della spesa?")) return;
    var lista = caricaSpesa();
    for (var i = 0; i < lista.length; i++) {
      if (!lista[i].comprato) {
        lista[i].comprato = true;
        accodaOperazione({ type: "patch", payload: { id: lista[i].id, action: "toggle", comprato: true } });
      }
    }
    salvaSpesaCache(lista);
    renderSpesa();
    sincronizzaSpesa();
  }

  function aggiungiIngredientiAllaSpesa(nomePiatto) {
    var ricetta = recipesData ? recipesData[nomePiatto] : null;
    if (!ricetta) return;
    var ingredienti = ricetta.ingredienti || [];
    for (var i = 0; i < ingredienti.length; i++) {
      var ing = ingredienti[i];
      var nomeCompleto = ing.nome + " (" + ing.quantita + ")";
      aggiungiVoceSpesa(nomeCompleto, "🍳", "ricetta");
    }
    alert("Ingredienti aggiunti alla lista della spesa! 🛒");
  }

  function renderCatalogoSpesa() {
    if (!foodsData) return;
    var contenitore = qs("#catalogo-spesa");
    contenitore.innerHTML = "";
    var listaAttuale = caricaSpesa();

    for (var categoria in foodsData) {
      if (!Object.prototype.hasOwnProperty.call(foodsData, categoria)) continue;

      var titolo = document.createElement("div");
      titolo.className = "catalogo-categoria-titolo";
      titolo.textContent = categoria;
      contenitore.appendChild(titolo);

      var righe = document.createElement("div");
      righe.className = "catalogo-categoria-righe";

      var voci = foodsData[categoria];
      for (var i = 0; i < voci.length; i++) {
        var voce = voci[i];
        var attivo = trovaIndiceSpesa(listaAttuale, voce.nome) !== -1;

        var chip = document.createElement("button");
        chip.className = "chip-alimento" + (attivo ? " attivo" : "");
        chip.setAttribute("data-nome", voce.nome);
        chip.setAttribute("data-emoji", voce.emoji);
        chip.textContent = voce.emoji + " " + voce.nome;
        chip.addEventListener("click", function () {
          toggleAlimentoCatalogo(this.getAttribute("data-nome"), this.getAttribute("data-emoji"));
        });

        righe.appendChild(chip);
      }

      contenitore.appendChild(righe);
    }
  }

  function renderSuggeritiPiano() {
    var contenitore = qs("#suggeriti-piano");
    if (!contenitore) return;
    contenitore.innerHTML = "";
    var voci = (shoppingData && shoppingData.items) || shoppingData || [];
    if (!voci || !voci.length) {
      var vuoto = document.createElement("p");
      vuoto.className = "spesa-vuoto";
      vuoto.textContent = "Nessun suggerimento dal piano al momento.";
      contenitore.appendChild(vuoto);
      return;
    }
    var listaAttuale = caricaSpesa();
    for (var i = 0; i < voci.length; i++) {
      var voce = voci[i];
      var attivo = trovaIndiceSpesa(listaAttuale, voce.nome) !== -1;
      var chip = document.createElement("button");
      chip.className = "chip-alimento" + (attivo ? " attivo" : "");
      chip.setAttribute("data-nome", voce.nome);
      chip.setAttribute("data-emoji", voce.emoji || "🛒");
      chip.textContent = (voce.emoji || "🛒") + " " + voce.nome + (voce.quantita ? " (" + voce.quantita + ")" : "");
      chip.addEventListener("click", function () {
        toggleAlimentoCatalogo(this.getAttribute("data-nome"), this.getAttribute("data-emoji"));
        renderSuggeritiPiano();
      });
      contenitore.appendChild(chip);
    }
  }

  /* ---------- TIMER ---------- */

  function avviaTimer(minuti, label) {
    timerSeconds = minuti * 60;
    timerRunning = false;
    qs("#timer-label").textContent = label || "Timer";
    aggiornaDisplayTimer();
    qs("#timer-overlay").classList.add("visible");
  }

  function aggiornaDisplayTimer() {
    var min = Math.floor(timerSeconds / 60);
    var sec = timerSeconds % 60;
    var minStr = min < 10 ? "0" + min : String(min);
    var secStr = sec < 10 ? "0" + sec : String(sec);
    qs("#timer-display").textContent = minStr + ":" + secStr;
  }

  function timerTick() {
    if (timerSeconds > 0) {
      timerSeconds--;
      aggiornaDisplayTimer();
      if (timerSeconds === 0) {
        timerFinito();
      }
    }
  }

  function suonaBeep() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var volte = 3;
      for (var i = 0; i < volte; i++) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        var inizio = ctx.currentTime + i * 0.5;
        gain.gain.setValueAtTime(0.3, inizio);
        gain.gain.exponentialRampToValueAtTime(0.001, inizio + 0.3);
        osc.start(inizio);
        osc.stop(inizio + 0.35);
      }
    } catch (e) { /* audio non disponibile, ignora */ }
  }

  function timerFinito() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    suonaBeep();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }
    } catch (e) { /* ignora */ }
    alert("⏰ Tempo scaduto!");
  }

  function timerAvviaConta() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(timerTick, 1000);
  }

  function timerPausa() {
    timerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function timerChiudi() {
    timerPausa();
    qs("#timer-overlay").classList.remove("visible");
  }

  /* ---------- EVENTI ---------- */

  function initEventi() {
    var tabs = qsa(".tab-btn");
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener("click", function () {
        cambiaVista(this.getAttribute("data-view"));
      });
    }

    qs("#btn-indietro").addEventListener("click", function () {
      cambiaVista("settimana");
    });

    qs("#btn-aggiungi-spesa").addEventListener("click", function () {
      var piatto = this.getAttribute("data-piatto");
      if (piatto) aggiungiIngredientiAllaSpesa(piatto);
    });

    qs("#btn-aggiungi-articolo").addEventListener("click", function () {
      var input = qs("#input-nuovo-articolo");
      aggiungiArticolo(input.value);
      input.value = "";
      input.focus();
    });

    qs("#input-nuovo-articolo").addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.keyCode === 13) {
        aggiungiArticolo(this.value);
        this.value = "";
      }
    });

    qs("#btn-svuota-spesa").addEventListener("click", svuotaSpesa);

    qs("#btn-conferma-codice").addEventListener("click", verificaCodiceCasa);
    qs("#input-codice-casa").addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.keyCode === 13) verificaCodiceCasa();
    });

    qs("#timer-avvia").addEventListener("click", timerAvviaConta);
    qs("#timer-pausa").addEventListener("click", timerPausa);
    qs("#timer-chiudi").addEventListener("click", timerChiudi);

    var elementiOggi = qsa(".pasto-nome, .chip-alt");
    for (var c = 0; c < elementiOggi.length; c++) {
      elementiOggi[c].addEventListener("click", function () {
        var pastoKey = this.getAttribute("data-pasto");
        var ruolo = this.getAttribute("data-ruolo");
        var voce = pastoDiOggi(pastoKey);
        var nomePiatto = voce ? voce[ruolo] : null;
        if (nomePiatto) apriRicetta(nomePiatto);
      });
    }
  }

  function initServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function (err) {
        console.warn("Service worker non registrato:", err);
      });
    }
  }

  function initSyncSpesa() {
    if (!getHouseCode()) {
      mostraOverlayCodice();
    } else {
      sincronizzaSpesa();
    }

    window.addEventListener("online", function () {
      sincronizzaSpesa();
    });

    setInterval(function () {
      if (document.visibilityState === "visible" || typeof document.visibilityState === "undefined") {
        sincronizzaSpesa();
      }
    }, 30000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initEventi();
    caricaDati();
    initServiceWorker();
    initSyncSpesa();
    setTimeout(function () {
      document.body.className += " app-pronto";
    }, 50);
  });

})();
