const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Code HTML/CSS/JS complet intégré dans une seule page
const htmlContent = `
<!DOCTYPE html>
<html lang="fr" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScanRescue - Analyse de Composants par IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #050505; color: #f3f4f6; }
    .font-orbitron { font-family: 'Orbitron', sans-serif; }
    .tokyo-bg {
      background: linear-gradient(rgba(5, 5, 5, 0.75), rgba(5, 5, 5, 0.85)), 
                  url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1920&auto=format&fit=crop');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
    }
    .neon-glow {
      box-shadow: 0 0 25px rgba(6, 182, 212, 0.4);
    }
    .neon-text {
      text-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
    }
  </style>
</head>
<body class="bg-[#050505] text-white selection:bg-cyan-500 selection:text-black">

  <!-- HEADER -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500 flex items-center justify-center neon-glow">
          <span class="text-cyan-400 font-orbitron font-bold text-xl">SR</span>
        </div>
        <span class="font-orbitron font-bold text-xl tracking-wider text-white">SCAN<span class="text-cyan-400">RESCUE</span></span>
      </div>
      <nav class="hidden md:flex space-x-8 text-sm font-medium text-zinc-300">
        <a href="#scanner" class="hover:text-cyan-400 transition">Scanner IA</a>
        <a href="#chat" class="hover:text-cyan-400 transition">Chat Intelligent</a>
      </nav>
      <a href="#scanner" class="bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold px-5 py-2.5 rounded-lg transition neon-glow text-sm">
        Lancer un scan
      </a>
    </div>
  </header>

  <!-- HERO SECTION TOKYO -->
  <section class="relative min-h-screen tokyo-bg flex items-center justify-center pt-20 px-6">
    <div class="max-w-4xl mx-auto text-center space-y-8 z-10">
      <div class="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-full text-cyan-400 text-xs font-orbitron tracking-widest uppercase">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        IA V10.4 Active - Cyberpunk Edition
      </div>
      <h1 class="font-orbitron text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
        IDENTIFIEZ N'IMPORTE QUEL <span class="text-cyan-400 neon-text">COMPOSANT</span>
      </h1>
      <p class="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto font-light">
        Glissez une photo ou un fichier de votre matériel informatique ou électronique. Notre intelligence artificielle détecte instantanément le modèle, ses spécifications et sa valeur.
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <a href="#scanner" class="bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold px-8 py-4 rounded-xl transition text-center shadow-lg shadow-cyan-500/30">
          Scanner un composant
        </a>
        <a href="#chat" class="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-white font-orbitron font-bold px-8 py-4 rounded-xl transition text-center">
          Parler avec l'IA
        </a>
      </div>
    </div>
  </section>

  <!-- SECTION SCANNER IA -->
  <section id="scanner" class="py-24 px-6 bg-gradient-to-b from-[#050505] to-zinc-950 border-t border-zinc-900">
    <div class="max-w-4xl mx-auto space-y-12">
      <div class="text-center space-y-3">
        <h2 class="font-orbitron text-3xl md:text-4xl font-bold">Scanner de Composants par IA</h2>
        <p class="text-zinc-400">Importez une image ou un fichier technique pour obtenir un rapport complet.</p>
      </div>

      <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-10 backdrop-blur-xl shadow-2xl">
        <form id="scanForm" class="space-y-6">
          <div class="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-8 text-center transition cursor-pointer relative group">
            <input type="file" id="componentFile" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf,.txt">
            <div class="space-y-4">
              <div class="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              </div>
              <div>
                <p class="text-white font-medium">Glissez votre photo / fichier ici ou <span class="text-cyan-400 underline">parcourez vos fichiers</span></p>
                <p class="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP ou PDF acceptés</p>
              </div>
              <div id="fileName" class="text-xs text-cyan-300 font-mono hidden"></div>
            </div>
          </div>

          <button type="submit" id="scanBtn" class="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold py-4 rounded-xl transition neon-glow flex items-center justify-center space-x-2">
            <span>Lancer l'analyse 100% IA</span>
          </button>
        </form>

        <div id="scanResult" class="mt-8 hidden border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-cyan-500/20 pb-4">
            <span class="text-xs font-orbitron uppercase text-cyan-400 tracking-wider">Rapport d'identification officiel</span>
            <span class="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-full font-mono">Confiance : <span id="resConfidence">100%</span></span>
          </div>
          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <h3 class="text-xs text-zinc-400 uppercase tracking-wider">Nom du composant</h3>
                <p id="resName" class="text-xl font-bold font-orbitron text-white mt-1">-</p>
              </div>
              <div>
                <h3 class="text-xs text-zinc-400 uppercase tracking-wider">Description technique</h3>
                <p id="resDesc" class="text-sm text-zinc-300 mt-1 leading-relaxed">-</p>
              </div>
            </div>
            <div class="space-y-4 bg-zinc-900/80 p-4 rounded-lg border border-zinc-800 flex flex-col justify-between">
              <div>
                <h3 class="text-xs text-zinc-400 uppercase tracking-wider">Spécifications clés</h3>
                <ul id="resSpecs" class="text-sm text-zinc-300 mt-2 space-y-1 font-mono"></ul>
              </div>
              <div class="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span class="text-xs text-zinc-400">Prix estimé marché :</span>
                <span id="resPrice" class="text-xl font-bold font-orbitron text-cyan-400">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SECTION CHAT IA -->
  <section id="chat" class="py-24 px-6 bg-[#030303] border-t border-zinc-900">
    <div class="max-w-3xl mx-auto space-y-8">
      <div class="text-center space-y-3">
        <h2 class="font-orbitron text-3xl md:text-4xl font-bold">Assistant IA en direct</h2>
        <p class="text-zinc-400">Posez toutes vos questions sur l'électronique ou le matériel.</p>
      </div>

      <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl flex flex-col h-[500px]">
        <div id="chatMessages" class="flex-1 p-6 overflow-y-auto space-y-4">
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500 flex items-center justify-center shrink-0 text-cyan-400 font-bold text-xs">AI</div>
            <div class="bg-zinc-800 text-zinc-200 p-4 rounded-2xl rounded-tl-none text-sm max-w-[80%]">
              Bonjour ! Je suis l'intelligence artificielle de ScanRescue. Comment puis-je vous aider ?
            </div>
          </div>
        </div>

        <form id="chatForm" class="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-3">
          <input type="text" id="chatInput" placeholder="Posez votre question..." class="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition" required>
          <button type="submit" class="bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold px-6 py-3 rounded-xl transition neon-glow text-sm">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="py-12 border-t border-zinc-900 bg-[#020202] text-center text-zinc-500 text-sm">
    <div class="max-w-7xl mx-auto px-6 space-y-4">
      <div class="flex justify-center items-center space-x-2">
        <span class="font-orbitron font-bold text-white tracking-wider">SCAN<span class="text-cyan-400">RESCUE</span></span>
      </div>
      <p>Plateforme propulsée par IA pour l'analyse matérielle.</p>
      <p class="text-cyan-400 font-orbitron text-xs tracking-widest pt-4">Fait par Théo pour projet bac 2026/2027</p>
    </div>
  </footer>

  <script>
    const fileInput = document.getElementById('componentFile');
    const fileNameDisplay = document.getElementById('fileName');
    fileInput.addEventListener('change', (e) => {
      if(e.target.files.length > 0) {
        fileNameDisplay.textContent = "Fichier sélectionné : " + e.target.files[0].name;
        fileNameDisplay.classList.remove('hidden');
      }
    });

    document.getElementById('scanForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('scanBtn');
      const resultBox = document.getElementById('scanResult');
      
      btn.disabled = true;
      btn.textContent = "Analyse IA en cours...";
      resultBox.classList.add('hidden');

      const formData = new FormData();
      if(fileInput.files[0]) formData.append('file', fileInput.files[0]);

      try {
        const response = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await response.json();

        document.getElementById('resName').textContent = data.name;
        document.getElementById('resDesc').textContent = data.description;
        document.getElementById('resPrice').textContent = data.estimatedPrice;
        document.getElementById('resConfidence').textContent = data.confidence;
        
        const specsList = document.getElementById('resSpecs');
        specsList.innerHTML = '';
        data.specs.forEach(spec => {
          const li = document.createElement('li');
          li.textContent = "• " + spec;
          specsList.appendChild(li);
        });

        resultBox.classList.remove('hidden');
      } catch (err) {
        alert("Erreur lors de l'analyse.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Lancer l'analyse 100% IA";
      }
    });

    document.getElementById('chatForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const container = document.getElementById('chatMessages');
      const text = input.value.trim();
      if(!text) return;

      container.innerHTML += \`
        <div class="flex items-start justify-end space-x-3">
          <div class="bg-cyan-600 text-white p-4 rounded-2xl rounded-tr-none text-sm max-w-[80%]">\${text}</div>
        </div>
      \`;
      input.value = '';
      container.scrollTop = container.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        container.innerHTML += \`
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500 flex items-center justify-center shrink-0 text-cyan-400 font-bold text-xs">AI</div>
            <div class="bg-zinc-800 text-zinc-200 p-4 rounded-2xl rounded-tl-none text-sm max-w-[80%]">\${data.reply}</div>
          </div>
        \`;
        container.scrollTop = container.scrollHeight;
      } catch (err) {
        console.error(err);
      }
    });
  </script>
</body>
</html>
`;

// Route principale pour afficher le site
app.get('/', (req, res) => {
  res.send(htmlContent);
});

// API Chat IA
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  setTimeout(() => {
    res.json({
      reply: `[ScanRescue AI] J'ai analysé votre message : "${message}". En tant qu'expert technique, je suis à votre disposition pour votre projet.`
    });
  }, 500);
});

// API Analyse de Composant
app.post('/api/analyze', upload.single('file'), (req, res) => {
  setTimeout(() => {
    res.json({
      name: "Carte Graphique NVIDIA RTX 4070 Ti (Simulé)",
      description: "Processeur graphique haut de gamme basé sur l'architecture Ada Lovelace, taillé pour le ray tracing et l'accélération IA.",
      specs: ["12 Go GDDR6X", "Bus mémoire : 192-bit", "Interface : PCIe 4.0", " TDP : 285W"],
      estimatedPrice: "~799,00 €",
      confidence: "100%"
    });
  }, 1000);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ScanRescue démarré sur le port ${PORT}`);
});
