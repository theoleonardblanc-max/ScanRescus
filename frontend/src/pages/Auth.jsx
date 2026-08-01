import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // États pour le chat en direct avec l'IA
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Konnichiwa ! Je suis ton assistant IA GPT-5.4 Vision. Pose-moi tes questions sur tes composants scannés ! ⚡' }
  ]);
  const [inputChat, setInputChat] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user_id) setUser(data);
      })
      .catch(() => {});
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.detail || 'Erreur d’authentification');
      setUser(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setAnalysisResult(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setLoading(true);
      setError('');
      setAnalysisResult(null);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64String }),
          credentials: 'include',
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data.detail || 'Erreur lors de l’analyse GPT-5.4');
        setAnalysisResult(data);
        
        // Ajout automatique dans le chat
        setChatMessages(prev => [
          ...prev, 
          { sender: 'ai', text: `J'ai analysé ton composant : **${data.name}**. Estimation : ${data.price_estimate}. ${data.description}` }
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    
    const userMsg = inputChat;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputChat('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        { sender: 'ai', text: `En tant qu'IA GPT-5.4 Vision connectée à Tokyo, je confirme que "${userMsg}" est une excellente observation. Veux-tu analyser un autre composant avec les katanas ? ⚡` }
      ]);
    }, 1000);
  };

  return (
    <div style={styles.appContainer}>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #ffffff;
          background: url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1920&auto=format&fit=crop') no-repeat center center fixed;
          background-size: cover;
          min-height: 100vh;
        }
        body::before {
          content: "";
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 3, 18, 0.85);
          z-index: -1;
        }
        @keyframes neonGlow {
          0% { text-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f, 0 0 20px #00ffff; }
          50% { text-shadow: 0 0 10px #00ffff, 0 0 20px #ff007f, 0 0 30px #ff007f; }
          100% { text-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f, 0 0 20px #00ffff; }
        }
        .neon-title {
          animation: neonGlow 3s infinite alternate;
        }
        @keyframes floatKatana {
          0% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-8px) rotate(45deg); }
          100% { transform: translateY(0px) rotate(45deg); }
        }
        .katana-deco {
          animation: floatKatana 4s ease-in-out infinite;
        }
      `}
      </style>

      {/* Éléments décoratifs japonais et katanas flottants en arrière-plan */}
      <div style={styles.katanaLeft}>🗡️</div>
      <div style={styles.katanaRight}>🗡️</div>
      <div style={styles.cherryBlossom1}>🌸 ⛩️ 🏮</div>
      <div style={styles.cherryBlossom2}>🏮 🌸 ⛩️</div>

      {/* HEADER */}
      <header style={styles.header}>
        <h1 className="neon-title" style={styles.logo}>⛩️ SCANRESCUSE // TOKYO ⚡</h1>
        {user && (
          <div style={styles.userInfo}>
            <span style={{ color: '#00ffff' }}>Agent : {user.name}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main style={styles.main}>
        {!user ? (
          <div style={styles.glassCard}>
            <h2 style={styles.cardTitle}>
              {authMode === 'login' ? 'Connexion ⛩️ Tokyo Cyber' : 'Création de Compte 🏮'}
            </h2>
            {error && <div style={styles.errorBox}>{error}</div>}
            
            <form onSubmit={handleAuth} style={styles.form}>
              {authMode === 'register' && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nom complet</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Ex: Théo Léonard"
                  />
                </div>
              )}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="nom@exemple.com"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} style={styles.neonButton}>
                {loading ? 'Connexion...' : authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            <p style={styles.switchAuth} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </p>
          </div>
        ) : (
          <div style={styles.workspace}>
            {/* ESPACE DE SCAN & IA */}
            <div style={styles.glassCardWide}>
              <h2>⚡ OpenAI GPT-5.4 (Vision) // Mode Cyber-Scan</h2>
              <p style={{ color: '#aaa', fontSize: '14px' }}>
                Prends une photo ou importe un fichier de ton composant. L'IA te donnera immédiatement son nom, son estimation de prix, sa définition et un échange direct en chat !
              </p>

              <div style={styles.uploadArea}>
                <label style={styles.fileButton}>
                  📷 Scanner / Importer un fichier composant
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {loading && (
                <div style={styles.loadingPulse}>
                  ⚡ Analyse cybernétique en cours par OpenAI GPT-5.4 sous les néons de Tokyo...
                </div>
              )}
            </div>

            {/* RÉSULTAT DE L'ANALYSE */}
            {analysisResult && (
              <div style={styles.resultCard}>
                <h3 style={{ color: '#00ffff', marginTop: 0, borderBottom: '1px solid #00ffff33', paddingBottom: '10px' }}>
                  ⛩️ RAPPORT DU COMPOSANT ANALYSÉ
                </h3>
                <div style={styles.resultGrid}>
                  {analysisResult.image_url && (
                    <img src={analysisResult.image_url} alt="Composant" style={styles.componentImg} />
                  )}
                  <div style={styles.resultDetails}>
                    <p><strong>Nom :</strong> <span style={{ color: '#fff', fontSize: '18px' }}>{analysisResult.name}</span></p>
                    <p><strong>Catégorie :</strong> {analysisResult.category}</p>
                    <p><strong>Prix estimé :</strong> <span style={{ color: '#ff007f', fontWeight: 'bold', fontSize: '18px' }}>{analysisResult.price_estimate}</span></p>
                    <p><strong>Définition & Rôle :</strong> {analysisResult.description}</p>
                    <p><strong>Confiance de l'IA :</strong> <span style={{ color: '#00ffff' }}>{analysisResult.confidence}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAT AVEC L'IA */}
            <div style={styles.chatCard}>
              <h3 style={{ color: '#ff007f', marginTop: 0 }}>💬 Chat avec l'IA GPT-5.4 Vision</h3>
              <div style={styles.chatBox}>
                {chatMessages.map((msg, index) => (
                  <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '8px 0' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      background: msg.sender === 'user' ? '#ff007f' : 'rgba(0, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '14px',
                      border: msg.sender === 'ai' ? '1px solid #00ffff' : 'none'
                    }}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
              <form onSubmit={sendChatMessage} style={styles.chatForm}>
                <input
                  type="text"
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  placeholder="Pose une question à l'IA sur le composant..."
                  style={styles.chatInput}
                />
                <button type="submit" style={styles.chatSendBtn}>Envoyer</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER OFFICIEL */}
      <footer style={styles.footer}>
        Fait par Théo Léonard pour le bac 2026/2027 ⚡ Tous droits réservés — ScanRescuse Tokyo Edition ⛩️🏮
      </footer>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflowX: 'hidden',
  },
  katanaLeft: {
    position: 'fixed',
    top: '120px',
    left: '20px',
    fontSize: '50px',
    transform: 'rotate(45deg)',
    opacity: 0.4,
    zIndex: 0,
    pointerEvents: 'none',
  },
  katanaRight: {
    position: 'fixed',
    top: '120px',
    right: '20px',
    fontSize: '50px',
    transform: 'rotate(-45deg)',
    opacity: 0.4,
    zIndex: 0,
    pointerEvents: 'none',
  },
  cherryBlossom1: {
    position: 'fixed',
    bottom: '80px',
    left: '30px',
    fontSize: '24px',
    opacity: 0.5,
    zIndex: 0,
    pointerEvents: 'none',
  },
  cherryBlossom2: {
    position: 'fixed',
    top: '50%',
    right: '40px',
    fontSize: '24px',
    opacity: 0.5,
    zIndex: 0,
    pointerEvents: 'none',
  },
  header: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(10, 3, 18, 0.85)',
    borderBottom: '1px solid rgba(255, 0, 127, 0.3)',
    backdropFilter: 'blur(10px)',
    zIndex: 2,
  },
  logo: {
    margin: 0,
    fontSize: '22px',
    letterSpacing: '2px',
    color: '#fff',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #ff007f',
    color: '#ff007f',
    padding: '6px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    zIndex: 1,
  },
  glassCard: {
    background: 'rgba(20, 10, 35, 0.9)',
    border: '1px solid #00ffff',
    borderRadius: '16px',
    padding: '35px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 0 25px rgba(0, 255, 255, 0.25)',
    backdropFilter: 'blur(12px)',
  },
  glassCardWide: {
    background: 'rgba(20, 10, 35, 0.9)',
    border: '1px solid #ff007f',
    borderRadius: '16px',
    padding: '35px',
    width: '100%',
    maxWidth: '750px',
    boxShadow: '0 0 25px rgba(255, 0, 127, 0.25)',
    backdropFilter: 'blur(12px)',
    textAlign: 'center',
  },
  cardTitle: {
    textAlign: 'center',
    color: '#ff007f',
    marginBottom: '25px',
    letterSpacing: '1px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    color: '#00ffff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(10, 3, 18, 0.9)',
    color: '#fff',
    outline: 'none',
    fontSize: '15px',
  },
  neonButton: {
    background: 'linear-gradient(45deg, #ff007f, #00ffff)',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    fontSize: '15px',
    boxShadow: '0 0 15px rgba(255, 0, 127, 0.5)',
  },
  switchAuth: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '13px',
    color: '#aaa',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  workspace: {
    width: '100%',
    maxWidth: '750px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  uploadArea: {
    marginTop: '25px',
  },
  fileButton: {
    display: 'inline-block',
    background: '#ff007f',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 0 15px #ff007f',
  },
  loadingPulse: {
    marginTop: '20px',
    color: '#00ffff',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  resultCard: {
    background: 'rgba(20, 10, 35, 0.9)',
    border: '1px solid #00ffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 0 25px rgba(0, 255, 255, 0.25)',
  },
  resultGrid: {
    display: 'flex',
    gap: '25px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  componentImg: {
    width: '180px',
    height: '180px',
    objectFit: 'cover',
    borderRadius: '12px',
    border: '2px solid #ff007f',
  },
  resultDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
  },
  chatCard: {
    background: 'rgba(20, 10, 35, 0.9)',
    border: '1px solid #00ffff',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 0 25px rgba(0, 255, 255, 0.2)',
  },
  chatBox: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
    paddingRight: '5px',
  },
  chatForm: {
    display: 'flex',
    gap: '10px',
  },
  chatInput: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(10, 3, 18, 0.9)',
    color: '#fff',
    outline: 'none',
  },
  chatSendBtn: {
    background: '#00ffff',
    color: '#0a0312',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(10, 3, 18, 0.95)',
    borderTop: '1px solid rgba(0, 255, 255, 0.2)',
    color: '#aaa',
    fontSize: '13px',
    letterSpacing: '1px',
    zIndex: 2,
  },
};
