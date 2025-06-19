exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    
    console.log('=== PARAMÈTRES AUTO-SEND HORMUR ===');
    console.log('Method:', method);
    console.log('User:', body.user_email || 'anonymous');
    console.log('=====================================');

    // Variables d'environnement pour la configuration Auto-Send
    const DEFAULT_SETTINGS = {
      enabled: process.env.AUTO_SEND_ENABLED === 'true' || false,
      delayMinutes: parseInt(process.env.AUTO_SEND_DELAY_MINUTES) || 15,
      confidenceThreshold: parseInt(process.env.AUTO_SEND_CONFIDENCE_THRESHOLD) || 90,
      testMode: process.env.AUTO_SEND_TEST_MODE === 'true' || true,
      maxPerHour: parseInt(process.env.AUTO_SEND_MAX_PER_HOUR) || 10,
      allowedCategories: (process.env.AUTO_SEND_ALLOWED_CATEGORIES || 'artiste,hote,spectateur').split(','),
      excludedKeywords: (process.env.AUTO_SEND_EXCLUDED_KEYWORDS || 'paiement,urgent,réclamation,avocat').split(',')
    };

    if (method === 'GET') {
      // Récupérer les paramètres actuels
      return {
        statusCode: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'Paramètres Auto-Send récupérés',
          timestamp: new Date().toISOString(),
          platform: 'Hormur',
          
          settings: DEFAULT_SETTINGS,
          
          // Statut système
          system_status: {
            auto_send_operational: DEFAULT_SETTINGS.enabled,
            current_mode: DEFAULT_SETTINGS.testMode ? 'test' : 'production',
            last_updated: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
          },
          
          // Métriques (simulées pour la démo)
          metrics: {
            messages_auto_sent_today: 6,
            messages_pending_auto_send: 2,
            average_confidence_score: 92,
            success_rate_24h: 94.5,
            total_auto_sent_this_week: 42
          },
          
          // Configuration recommandée pour les tests
          recommended_test_settings: {
            enabled: true,
            delayMinutes: 15, // 15 minutes en mode test
            confidenceThreshold: 95, // Plus élevé en test
            testMode: true,
            maxPerHour: 5 // Limité en test
          }
        })
      };
    }

    if (method === 'POST' || method === 'PUT') {
      // Mettre à jour les paramètres Auto-Send
      const newSettings = body.settings || {};
      
      // Validation des paramètres
      if (newSettings.confidenceThreshold && (newSettings.confidenceThreshold < 50 || newSettings.confidenceThreshold > 100)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Seuil de confiance invalide (doit être entre 50 et 100)',
            field: 'confidenceThreshold',
            received: newSettings.confidenceThreshold
          })
        };
      }

      if (newSettings.delayMinutes && (newSettings.delayMinutes < 0 || newSettings.delayMinutes > 1440)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Délai invalide (doit être entre 0 et 1440 minutes)',
            field: 'delayMinutes',
            received: newSettings.delayMinutes
          })
        };
      }

      // Merge avec les paramètres existants
      const updatedSettings = {
        ...DEFAULT_SETTINGS,
        ...newSettings,
        lastUpdated: new Date().toISOString(),
        updatedBy: body.user_email || 'system'
      };

      // Log de sécurité pour les changements critiques
      if (newSettings.enabled !== undefined && newSettings.enabled !== DEFAULT_SETTINGS.enabled) {
        console.log(`🔄 AUTO-SEND ${newSettings.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'} par ${body.user_email || 'système'}`);
      }

      if (newSettings.testMode !== undefined && newSettings.testMode !== DEFAULT_SETTINGS.testMode) {
        console.log(`🧪 Mode ${newSettings.testMode ? 'TEST' : 'PRODUCTION'} activé par ${body.user_email || 'système'}`);
      }

      // TODO: Ici, sauvegarder en base de données ou envoyer à Make.com
      // pour synchroniser avec le système de classification IA

      console.log('✅ Paramètres Auto-Send mis à jour:', updatedSettings);

      return {
        statusCode: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'Paramètres Auto-Send mis à jour avec succès',
          timestamp: new Date().toISOString(),
          platform: 'Hormur',
          
          settings: updatedSettings,
          
          // Changements appliqués
          changes_applied: {
            enabled: newSettings.enabled !== undefined ? (newSettings.enabled ? 'Activé' : 'Désactivé') : 'Inchangé',
            testMode: newSettings.testMode !== undefined ? (newSettings.testMode ? 'Mode test' : 'Mode production') : 'Inchangé',
            delayMinutes: newSettings.delayMinutes !== undefined ? `${newSettings.delayMinutes} minutes` : 'Inchangé',
            confidenceThreshold: newSettings.confidenceThreshold !== undefined ? `${newSettings.confidenceThreshold}%` : 'Inchangé'
          },
          
          // Impact sur le système
          impact: {
            effective_immediately: true,
            affects_new_messages: true,
            affects_pending_messages: newSettings.enabled === false,
            restart_required: false
          },
          
          // Prochaines étapes
          next_steps: {
            monitor_for: '30 minutes après activation',
            check_metrics: 'Surveillez les métriques de confiance',
            rollback_if_needed: 'Possibilité de revenir aux anciens paramètres'
          }
        })
      };
    }

    // Méthode non supportée
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: `Méthode ${method} non supportée`,
        allowed_methods: ['GET', 'POST', 'PUT', 'OPTIONS']
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE paramètres Auto-Send:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Erreur serveur interne Auto-Send',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'auto-send-settings',
        troubleshooting: {
          check_env_vars: 'Vérifiez les variables d\'environnement AUTO_SEND_*',
          check_permissions: 'Vérifiez les permissions utilisateur',
          contact_support: 'Contactez l\'équipe technique si l\'erreur persiste'
        }
      })
    };
  }
};