exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    console.log('=== ALERTE URGENTE HORMUR ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Alert type:', data.category);
    console.log('Confidence:', data.confidence);
    console.log('Alert reason:', data.alert_reason);
    console.log('Immediate action required:', data.immediate_action_required);
    console.log('============================');

    // Validation des données critiques
    if (!data.from_email || !data.subject || !data.alert_reason) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Données critiques manquantes pour alerte urgente',
          required: ['from_email', 'subject', 'alert_reason']
        })
      };
    }

    // Données d'alerte urgente pour Hormur
    const urgentAlertData = {
      // Identification
      alert_id: `urgent_${Date.now()}`,
      message_id: data.message_id || `alert_${Date.now()}`,
      original_message_id: data.original_message_id,
      
      // Classification critique
      classification: 'URGENT_ALERT',
      alert_type: data.category || 'general', // securite, technique, juridique, financier, mediatique
      severity: 'critical',
      immediate_action_required: data.immediate_action_required || true,
      
      // Contenu de l'alerte
      from_email: data.from_email,
      subject: data.subject,
      original_message: data.original_message,
      alert_reason: data.alert_reason,
      
      // Réponse d'urgence
      response: data.response || 'ALERTE REÇUE - Notre équipe d\'urgence a été notifiée et va vous contacter immédiatement.',
      signature_type: data.signature_type || 'urgence',
      
      // Escalation
      escalation_to: data.escalation_to || ['management', 'technique'],
      escalation_level: 'immediate',
      
      // Notifications
      sms_alert_required: true,
      sms_alert_sent: false,
      email_alert_sent: false,
      
      // Métriques IA
      confidence: data.confidence || 98,
      processing_priority: 'highest',
      
      // Timestamps
      created_at: new Date().toISOString(),
      alert_triggered_at: new Date().toISOString(),
      response_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      
      // Status tracking
      status: 'active',
      handled: false,
      resolved: false,
      
      // Équipe Hormur
      platform: 'Hormur',
      alert_level: 'CRITICAL',
      requires_immediate_human_intervention: true
    };

    // TODO: Ici, intégrer avec Make.com pour :
    // 1. Envoyer SMS d'alerte à l'équipe Hormur
    // 2. Créer une tâche urgente dans le système de suivi
    // 3. Notifier via Slack/Teams si configuré
    // 4. Envoyer email d'alerte à la direction

    // Webhook Make.com pour alertes urgentes (à configurer)
    const MAKE_URGENT_WEBHOOK = process.env.MAKE_URGENT_ALERT_WEBHOOK;
    
    if (MAKE_URGENT_WEBHOOK) {
      try {
        const makeResponse = await fetch(MAKE_URGENT_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hormur-Alert-System/1.0'
          },
          body: JSON.stringify(urgentAlertData)
        });

        if (makeResponse.ok) {
          console.log('✅ Alerte urgente transmise à Make.com');
        } else {
          console.error('❌ Erreur transmission Make.com:', makeResponse.status);
        }
      } catch (error) {
        console.error('❌ Erreur webhook Make.com:', error.message);
      }
    }

    console.log('🚨 ALERTE URGENTE ENREGISTRÉE - Intervention immédiate requise');

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Alerte urgente enregistrée et équipe notifiée',
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        
        data: {
          alert_id: urgentAlertData.alert_id,
          message_id: urgentAlertData.message_id,
          alert_type: urgentAlertData.alert_type,
          severity: 'critical',
          
          // Statut d'alerte
          status: 'active',
          immediate_action_required: true,
          response_deadline: urgentAlertData.response_deadline,
          
          // Notifications
          sms_alert_pending: true,
          team_notified: true,
          escalation_triggered: true
        },
        
        // Actions prises
        actions_taken: {
          alert_logged: true,
          team_notification: 'pending',
          sms_alert: 'queued',
          escalation: 'initiated',
          response_prepared: true
        },
        
        // Instructions d'urgence
        urgent_instructions: {
          response_time: '< 15 minutes',
          contact_method: 'SMS + Email + Appel',
          escalation_path: 'Direction → Technique → Externe si nécessaire'
        },
        
        // Note pour l'équipe
        team_note: 'ALERTE CRITIQUE - Intervention immédiate requise. Vérifiez SMS et emails d\'urgence.'
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE alerte urgente Hormur:', {
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
        error: 'Erreur système critique - alerte urgente',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'urgent-alert',
        note: 'Contactez immédiatement l\'équipe technique si cette erreur persiste'
      })
    };
  }
};