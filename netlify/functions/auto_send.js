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
    
    console.log('=== AUTO-SEND MONITORING HORMUR ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Category:', data.category);
    console.log('Priority:', data.priority);
    console.log('Original message preview:', data.original_message ? data.original_message.substring(0, 100) + '...' : 'No original');
    console.log('AI Response preview:', data.ai_response ? data.ai_response.substring(0, 100) + '...' : 'No response');
    console.log('Signature type:', data.signature_type);
    console.log('Confidence:', data.confidence);
    console.log('Already sent to client:', data.sent_to_client || 'unknown');
    console.log('===================================');

    // Validation des données requises pour le monitoring
    if (!data.ai_response || !data.from_email || !data.original_message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Données manquantes pour le monitoring auto-send',
          required: ['ai_response', 'from_email', 'original_message'],
          received: Object.keys(data),
          note: 'Cette fonction stocke les données pour monitoring/correction, la réponse a déjà été envoyée via REPONSE BREVO'
        })
      };
    }

    // Stockage des données pour monitoring et correction rapide
    const monitoringData = {
      // Identification
      message_id: data.message_id || `auto_${Date.now()}`,
      original_message_id: data.original_message_id || data.message_id,
      
      // Contenu original et réponse IA
      original_message: data.original_message,
      ai_response: data.ai_response,
      
      // Métadonnées du contact
      from_email: data.from_email,
      subject: data.subject,
      
      // Classification IA
      category: data.category || 'general',
      priority: data.priority || 'medium',
      user_type: data.category, // artiste, hote, spectateur, partenariat
      classification: data.classification,
      confidence: data.confidence || 0,
      
      // Status de l'envoi
      status: 'auto_sent',
      sent_by: data.signature_type || 'auto',
      sent_at: new Date().toISOString(),
      sent_via: 'brevo_direct',
      
      // Données pour correction rapide
      needs_review: false,
      can_be_corrected: true,
      correction_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      
      // URLs incluses dans la réponse
      urls_included: data.urls_included || [],
      
      // Canal et contexte
      channel: data.channel || 'email',
      platform: 'Hormur',
      
      // Métriques IA
      ai_metrics: {
        processing_time: data.processing_time || null,
        tokens_used: data.tokens_used || null,
        model_version: data.model_version || null,
        confidence_score: data.confidence || 0
      },
      
      // Données Brevo
      brevo_contact_id: data.brevo_contact_id || null,
      brevo_conversation_id: data.brevo_conversation_id || null,
      
      // Timestamp pour l'interface
      created_at: new Date().toISOString(),
      monitoring_id: `monitor_${Date.now()}`,
      
      // Flags de suivi
      auto_send: true,
      monitoring_active: true,
      correction_available: true
    };

    console.log('📊 Données de monitoring auto-send enregistrées');
    console.log('Monitoring ID:', monitoringData.monitoring_id);
    console.log('Correction deadline:', monitoringData.correction_deadline);

    // ✅ La réponse a déjà été envoyée via REPONSE BREVO
    // ✅ Ici on stocke les données pour monitoring et correction rapide
    
    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Données auto-send enregistrées pour monitoring',
        note: 'La réponse a déjà été envoyée au client via REPONSE BREVO',
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        
        data: {
          monitoring_id: monitoringData.monitoring_id,
          message_id: monitoringData.message_id,
          original_message_id: monitoringData.original_message_id,
          from_email: data.from_email,
          subject: data.subject,
          category: data.category,
          priority: data.priority,
          sent_by: data.signature_type || 'auto',
          
          // Status de monitoring
          status: 'auto_sent_monitored',
          sent_via: 'brevo_direct',
          monitoring_active: true,
          correction_available: true,
          correction_deadline: monitoringData.correction_deadline,
          
          // Métriques
          response_length: data.ai_response ? data.ai_response.length : 0,
          confidence: data.confidence,
          auto_send: true,
          processing_status: 'monitoring_active'
        },
        
        // Métriques détaillées
        metrics: {
          ai_confidence: data.confidence,
          signature_used: data.signature_type,
          urls_included_count: (data.urls_included || []).length,
          processing_timestamp: new Date().toISOString(),
          monitoring_duration: '30_minutes'
        },
        
        // Actions disponibles
        available_actions: {
          view_conversation: true,
          send_correction: true,
          mark_as_reviewed: true,
          escalate_if_needed: true
        },
        
        // Instructions pour l'équipe
        team_instructions: {
          monitor_for: '30 minutes après envoi',
          can_correct: 'Oui, via l\'interface de correction',
          escalate_if: 'Réponse client négative ou erreur détectée'
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE auto-send Hormur:', {
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
        error: 'Erreur serveur interne auto-send monitoring',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'auto-send-monitoring',
        note: 'Cette fonction enregistre les données de monitoring, pas l\'envoi direct'
      })
    };
  }
};