import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Hormur - Support Client IA</h1>
      <p>Système de classification automatique des messages clients</p>
      
      <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h2>📊 Tableau de bord</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>📥 Messages en attente</h3>
            <div style={{ fontSize: '24px', color: '#ff6b35' }}>0</div>
          </div>
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>🤖 Auto-traités</h3>
            <div style={{ fontSize: '24px', color: '#28a745' }}>0</div>
          </div>
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>🚫 Spams bloqués</h3>
            <div style={{ fontSize: '24px', color: '#dc3545' }}>0</div>
          </div>
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>⏳ Révision manuelle</h3>
            <div style={{ fontSize: '24px', color: '#ffc107' }}>0</div>
          </div>
          
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e8', borderRadius: '8px' }}>
        <h2>✅ Statut du système</h2>
        <p>🔗 <strong>Webhook Make.com :</strong> <span style={{color: '#28a745'}}>Configuré</span></p>
        <p>🤖 <strong>Agent IA :</strong> <span style={{color: '#28a745'}}>Opérationnel</span></p>
        <p>📋 <strong>Netlify Functions :</strong> <span style={{color: '#28a745'}}>Déployées</span></p>
      </div>
    </div>
  );
}

export default App;
