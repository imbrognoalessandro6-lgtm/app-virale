// Risultati possibili del quiz.
// "amazonQuery" è la ricerca Amazon usata per il link affiliato del risultato.
window.RESULTS = {
  carbonara: {
    name: "Carbonara",
    emoji: "🥓",
    colors: ["#f6c445", "#e0712c"],
    tagline: "Leader nato, zero compromessi.",
    description:
      "Sei deciso, carismatico e hai opinioni molto forti (soprattutto sulla panna). La gente ti segue perché sai sempre cosa vuoi.",
    amazonQuery: "guanciale pecorino romano",
    product: "Kit Carbonara originale",
  },
  pesto: {
    name: "Pesto alla Genovese",
    emoji: "🌿",
    colors: ["#7bc96f", "#2f7d4f"],
    tagline: "Fresco, creativo, imprevedibile.",
    description:
      "Porti energia ovunque vai. Ami la natura, le idee nuove e i viaggi improvvisati. Gli amici ti chiamano quando serve una ventata di aria fresca.",
    amazonQuery: "mortaio marmo pesto",
    product: "Mortaio in marmo per pesto",
  },
  amatriciana: {
    name: "Amatriciana",
    emoji: "🍅",
    colors: ["#ff6b5b", "#b8232f"],
    tagline: "Passionale e un po' piccante.",
    description:
      "Hai un cuore grande e un carattere esplosivo. Difendi i tuoi amici a spada tratta e non passi mai inosservato.",
    amazonQuery: "pomodori san marzano dop",
    product: "Pomodori San Marzano DOP",
  },
  caciopepe: {
    name: "Cacio e Pepe",
    emoji: "🧀",
    colors: ["#f3e7c9", "#a68a5b"],
    tagline: "Semplice, ma geniale.",
    description:
      "Con pochissimo crei qualcosa di straordinario. Sei minimalista, intelligente e sottovalutato… finché non ti conoscono davvero.",
    amazonQuery: "macinapepe professionale",
    product: "Macinapepe professionale",
  },
  lasagna: {
    name: "Lasagna",
    emoji: "🫕",
    colors: ["#ffa94d", "#c2410c"],
    tagline: "Il cuore della famiglia.",
    description:
      "Sei accogliente, generoso e pieno di strati. Ci metti tempo ad aprirti, ma chi ti conosce non ti lascia più.",
    amazonQuery: "teglia lasagna ceramica",
    product: "Teglia per lasagne in ceramica",
  },
  vongole: {
    name: "Spaghetti alle Vongole",
    emoji: "🐚",
    colors: ["#74c0fc", "#1c5d99"],
    tagline: "Elegante, rilassato, da vacanza.",
    description:
      "Hai classe senza sforzarti. Ami il mare, le cene lunghe e le conversazioni profonde al tramonto.",
    amazonQuery: "set piatti pasta",
    product: "Set di piatti da pasta",
  },
};

// Ogni risposta assegna punti a uno o più risultati.
window.QUESTIONS = [
  {
    q: "È sabato sera. Cosa fai?",
    a: [
      { t: "Organizzo io la serata per tutti", p: { carbonara: 2, amatriciana: 1 } },
      { t: "Cena in famiglia, divano e film", p: { lasagna: 2, caciopepe: 1 } },
      { t: "Aperitivo vista mare", p: { vongole: 2, pesto: 1 } },
      { t: "Parto per un posto a caso", p: { pesto: 2, amatriciana: 1 } },
    ],
  },
  {
    q: "Il tuo superpotere segreto?",
    a: [
      { t: "Convinco chiunque di qualsiasi cosa", p: { carbonara: 2 } },
      { t: "Risolvo problemi con niente", p: { caciopepe: 2 } },
      { t: "Faccio sentire tutti a casa", p: { lasagna: 2 } },
      { t: "Resto calmo in ogni situazione", p: { vongole: 2 } },
    ],
  },
  {
    q: "Scegli un emoji:",
    a: [
      { t: "🔥", p: { amatriciana: 2 } },
      { t: "✨", p: { pesto: 2 } },
      { t: "😎", p: { vongole: 1, carbonara: 1 } },
      { t: "🤗", p: { lasagna: 2 } },
    ],
  },
  {
    q: "Come reagisci a un litigio?",
    a: [
      { t: "Alzo la voce, poi passa tutto", p: { amatriciana: 2 } },
      { t: "Ho ragione io e lo dimostro", p: { carbonara: 2 } },
      { t: "Cerco di mettere pace", p: { lasagna: 1, vongole: 1 } },
      { t: "Una frase secca e chiudo", p: { caciopepe: 2 } },
    ],
  },
  {
    q: "La vacanza perfetta?",
    a: [
      { t: "Isola greca, barca, sole", p: { vongole: 2 } },
      { t: "Trekking in montagna", p: { pesto: 2 } },
      { t: "Città d'arte e trattorie", p: { caciopepe: 1, carbonara: 1 } },
      { t: "Casa dei nonni in campagna", p: { lasagna: 2 } },
    ],
  },
  {
    q: "Cosa dicono di te gli amici?",
    a: [
      { t: "\"Sei troppo intenso\"", p: { amatriciana: 2 } },
      { t: "\"Sei sempre originale\"", p: { pesto: 2 } },
      { t: "\"Sei di poche parole\"", p: { caciopepe: 2 } },
      { t: "\"Sei il capo del gruppo\"", p: { carbonara: 2 } },
    ],
  },
  {
    q: "Ultima domanda: panna nella carbonara?",
    a: [
      { t: "MAI. È un crimine.", p: { carbonara: 2, amatriciana: 1 } },
      { t: "Ognuno fa come vuole", p: { pesto: 1, vongole: 1 } },
      { t: "Basta che sia buona", p: { lasagna: 2 } },
      { t: "Non rispondo, troppo rischioso", p: { caciopepe: 2 } },
    ],
  },
];
