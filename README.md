# 🚀 Hormur - Support Client IA

Système de classification automatique des messages clients avec intelligence artificielle.

## 📋 Fonctionnalités

- ✅ Classification automatique des emails
- ✅ Détection de spam avancée  
- ✅ Escalade pour révision manuelle
- ✅ File d'attente intelligente
- ✅ Tableau de bord en temps réel

## 🛠 Architecture

### Netlify Functions
- `/manual-review` - Messages nécessitant une révision manuelle
- `/pending-queue` - File d'attente des messages en attente
- `/spam-log` - Journalisation des spams détectés

### Intégrations
- **Make.com** - Orchestration des workflows
- **Brevo** - Gestion des emails
- **OpenAI** - Classification IA
- **Netlify** - Hébergement et functions

## 🚀 Déploiement

1. Push vers repository Git
2. Connecter à Netlify
3. Configuration automatique via `netlify.toml`

## 📊 URLs des Functions

Une fois déployé sur Netlify :
- `https://votre-site.netlify.app/.netlify/functions/manual-review`
- `https://votre-site.netlify.app/.netlify/functions/pending-queue`  
- `https://votre-site.netlify.app/.netlify/functions/spam-log`
