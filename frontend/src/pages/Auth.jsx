import React, { useState, useEffect } from 'react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  // Vérification de la session active au chargement
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user_id) {
          setUser(data);
          loadUserData();
        }
      })
      .catch(() => {});
  }, []);

  const loadUserData = () => {
    fetch('/api/history', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHistory(data));

    fetch('/api/stats', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data));
  };

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur d’authentification');
      setUser(data);
      loadUserData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setAnalysis(null);
    setHistory([]);
    setStats(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64String }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur lors de l’analyse IA');
        setAnalysis(data);
        loadUserData();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      {/* Styles globaux néon & Tokyo */}
      <style>{`
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #0d0221 0%, #190533 50%, #2b0b48 100%);
          color: #f0f6fc;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
        }
        @keyframes neonGlow {
          0% { text-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f, 0 0 20px #00ffff; }
          50% { text-shadow: 0 0 10px #00ffff, 0 0 20px #ff007f, 0 0 30px #ff007f; }
          100% { text-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f, 0 0 20px #00ffff; }
        }
        .neon-title {
          animation: neonGlow 3s infinite alternate;
        }
      `}</style>

      {/* En-tête Tokyo Cyberpunk */}
      <header style={styles.header}>
        <h1 className="neon-title" style={styles.logo}>🗼 TOKYO COMPONENT AI ⚡</h1>
        {user && (
          <div style={styles.userNav}>
            <span style={styles.welcomeText}>Bienvenue, {user.name}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
          </div>
        )}
      </header>

      {/* Corps de l'application */}
      <main style={styles.main}>
        {!user ? (
          /* SECTION AUTHENTIFICATION */
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>{authMode === 'login' ? 'Connexion Tokyo ID' : 'Création de Compte'}</h2>
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
                  />
                </div>
              )}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
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
                />
              </div>
              <button type="submit" disabled={loading} style={styles.neonButton}>
                {loading ? 'Chargement...' : authMode === 'login' ? 'Se connecter' : 'S’inscrire'}
              </button>
            </form>
            <p style={styles.switchAuth} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
            </p>
          </div>
        ) : (
          /* ESPACE SCAN & ANALYSE IA */
          <div style={styles.workspace}>
            <div style={styles.uploadCard}>
              <h2>Scanner un Composant ou une Pièce</h2>
              <p style={{ color: '#aaa', fontSize: '14px' }}>Importe une photo ou un fichier pour lancer l'analyse de l'IA.</p>
              
              <label style={styles.fileUploadLabel}>
                📷 Choisir une photo / fichier
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {loading && <div style={styles.loadingPulse}>⚡ L'IA analyse le composant dans les néons de Tokyo...</div>}
            </div>

            {/* RÉSULTAT DE L'ANALYSE */}
            {analysis && (
              <div style={styles.resultCard}>
                <h3 style={{ color: '#00ffff', marginTop: 0 }}>RÉSULTAT DE L'ANALYSE</h3>
                <div style={styles.resultGrid}>
                  {analysis.image_url && <img src={analysis.image_url} alt="Composant" style={styles.scannedImg} />}
                  <div>
                    <p><strong>Nom :</strong> {analysis.name}</p>
                    <p><strong>Catégorie :</strong> {analysis.category}</p>
                    <p><strong>Prix estimé :</strong> <span style={{ color: '#ff007f', fontWeight: 'bold' }}>{analysis.price_estimate}</span></p>
                    <p><strong>À quoi ça sert :</strong> {analysis.description}</p>
                    <p><strong>Confiance IA :</strong> {analysis.confidence}</p>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORIQUE ET STATS */}
            {stats && (
              <div style={styles.statsRow}>
                <div style={styles.statBox}>📊 Total scans : {stats.count}</div>
                <div style={styles.statBox}>💰 Valeur estimée : {stats.total_value} €</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER OFFICIEL */}
      <footer style={styles.footer}>
        Créé par Théo Léonard 2026/2027 ⚡ Tous droits réservés - Tokyo Cyber Edition
      </footer>
    </div>
  );
}

// Styles CSS en objets JavaScript pour une intégration propre et sans bug de syntaxe
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#0d0221',
  },
  header: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 0, 127, 0.3)',
    background: 'rgba(13, 2, 33, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    color: '#fff',
    letterSpacing: '2px',
  },
  userNav: {
    display: 'flex',
    alignItem: 'center',
    gap: '15px',
  },
  welcomeText: {
    color: '#00ffff',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #ff007f',
    color: '#ff007f',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
  },
  card: {
    background: 'rgba(25, 5, 51, 0.9)',
    border: '1px solid #00ffff',
    borderRadius: '12px',
    padding: '30px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
  },
  cardTitle: {
    textAlign: 'center',
    color: '#ff007f',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    color: '#00ffff',
  },
  input: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #444',
    background: '#120329',
    color: '#fff',
    outline: 'none',
  },
  neonButton: {
    background: 'linear-gradient(45deg, #ff007f, #00ffff)',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
  },
  switchAuth: {
    textAlign: 'center',
    marginTop: '15px',
    fontSize: '13px',
    color: '#aaa',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  workspace: {
    width: '100%',
    maxWidth: '700px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  uploadCard: {
    background: 'rgba(25, 5, 51, 0.9)',
    border: '1px solid #ff007f',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 0 20px rgba(255, 0, 127, 0.2)',
  },
  fileUploadLabel: {
    display: 'inline-block',
    background: '#ff007f',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '15px',
    boxShadow: '0 0 10px #ff007f',
  },
  loadingPulse: {
    marginTop: '15px',
    color: '#00ffff',
    fontStyle: 'italic',
  },
  resultCard: {
    background: 'rgba(25, 5, 51, 0.9)',
    border: '1px solid #00ffff',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
  },
  resultGrid: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  scannedImg: {
    width: '150px',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid #ff007f',
  },
  statsRow: {
    display: 'flex',
    gap: '15px',
  },
  statBox: {
    flex: 1,
    background: 'rgba(25, 5, 51, 0.8)',
    border: '1px solid #00ffff',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(13, 2, 33, 0.9)',
    borderTop: '1px solid rgba(0, 255, 255, 0.3)',
    color: '#aaa',
    fontSize: '13px',
    letterSpacing: '1px',
  },
};
