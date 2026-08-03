import { useState, useRef, useEffect } from "react";
import { ScanLine, Loader2, Send, Upload, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TOKYO_IMG = "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?crop=entropy&cs=srgb&fm=jpg&w=1400&q=85";

export default function ScanRescueApp() {
  // États pour le chat
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Bonjour ! Je suis l'IA de ScanRescue. Discute avec moi de tout et de rien ou pose tes questions !" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  // États pour le scan
  const [scanFile, setScanFile] = useState(null);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Gestion du Chat
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput;
    const newMessages = [...chatMessages, { sender: "user", text: userMsg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { sender: "ai", text: data.reply || "Réponse vide de l'IA." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "ai", text: "Erreur de connexion avec le serveur IA." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Gestion de la sélection d'image
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScanFile(file);
      setScanPreview(URL.createObjectURL(file));
    }
  };

  // Gestion du Scan de composant
  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanFile) return;
    setScanLoading(true);
    setScanResult(null);

    const formData = new FormData();
    formData.append('file', scanFile);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setScanResult(data);
    } catch (err) {
      alert("Erreur lors de l'analyse du fichier.");
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* HEADER HERO */}
      <div className="py-12 px-6 text-center space-y-4 border-b border-zinc-900 bg-zinc-950/50">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 mx-auto">
          <ScanLine className="w-7 h-7" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">SCAN<span className="text-cyan-400">RESCUE</span></h1>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">Analyse intelligente de composants par IA et assistant conversationnel.</p>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-12 flex-1">
        
        {/* SECTION SCANNER DE COMPOSANT */}
        <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="text-cyan-400" /> Scanner de Composant
          </h2>
          
          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-6 text-center relative cursor-pointer flex flex-col items-center justify-center transition">
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept="image/*"
                required
              />
              {scanPreview ? (
                <div className="space-y-2">
                  <img src={scanPreview} alt="Aperçu" className="w-32 h-32 object-cover rounded-lg mx-auto border border-cyan-500/50" />
                  <p className="text-xs text-cyan-400">{scanFile?.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-8 h-8 text-cyan-400" />
                  <p className="text-sm text-zinc-300">Glissez une image ou cliquez pour parcourir</p>
                </div>
              )}
            </div>

            <Button type="submit" disabled={scanLoading || !scanFile} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3">
              {scanLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanLine className="w-4 h-4 mr-2" />}
              Lancer l'analyse IA
            </Button>
          </form>

          {scanResult && (
            <div className="border border-cyan-500/30 bg-cyan-950/20 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Analyse Réussie
                </span>
                <span className="text-cyan-400 font-bold text-lg">{scanResult.price}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{scanResult.name}</h3>
                <p className="text-sm text-zinc-300 mt-1">{scanResult.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {scanResult.specs?.map((spec, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-mono border border-zinc-700">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION CHAT IA */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 font-bold text-sm text-cyan-400">
            💬 Chat IA Conversationnel
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === "user" ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 text-zinc-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> L'IA réfléchit...
                </div>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
            <Input
              type="text"
              placeholder="Discute avec l'IA de tout et de rien..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white flex-1"
              required
            />
            <Button type="submit" disabled={chatLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </section>

      </div>

      <footer className="py-6 border-t border-zinc-900 text-center text-xs text-zinc-500">
        ScanRescue - Projet Bac 2026/2027
      </footer>

    </div>
  );
}
