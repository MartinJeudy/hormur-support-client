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
    
    // Validation des données requises pour Hormur
    const requiredFields = ['message_id', 'response_text', 'sent_by'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Champs manquants pour Hormur', 
          missing: missingFields,
          required: requiredFields
        })
      };
    }

    console.log('=== ENVOI RÉPONSE HORMUR + DATASTORE ===');
    console.log('Message ID:', data.message_id);
    console.log('Envoyé par:', data.sent_by);
    console.log('Aperçu réponse:', data.response_text.substring(0, 150) + '...');
    console.log('Catégorie:', data.category || 'non-définie');
    console.log('========================================');

    // URLs des webhooks
    const MAKE_SEND_WEBHOOK = process.env.MAKE_SEND_RESPONSE_WEBHOOK;
    const MAKE_DATASTORE_UPDATE_WEBHOOK = process.env.MAKE_DATASTORE_UPDATE_WEBHOOK;
    
    if (!MAKE_SEND_WEBHOOK) {
      console.error('ERREUR: Webhook d\'envoi non configuré');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'MAKE_SEND_RESPONSE_WEBHOOK non configuré'
        })
      };
    }

    // Enrichissement des données pour Hormur
    const hormurPayload = {
      // Données essentielles
      message_id: data.message_id,
      original_message_id: data.original_message_id || data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      sent_at: new Date().toISOString(),
      
      // Métadonnées Hormur
      platform: 'Hormur',
      version: '2.0',
      
      // Classification Hormur
      category: data.category || 'general',
      priority: data.priority || 'medium',
      user_type: data.user_type || 'unknown',
      
      // Historique et apprentissage IA
      user_modifications: data.user_modifications || false,
      original_ai_response: data.original_ai_response || null,
      modification_reason: data.modification_reason || null,
      feedback: data.feedback || null,
      confidence_score: data.confidence || null,
      
      // Données pour amélioration continue
      response_type: data.response_type || 'manual',
      learning_data: {
        was_modified: data.user_modifications || false,
        modification_type: data.modification_type || null,
        user_feedback: data.user_feedback || null,
        processing_time: data.processing_time || null
      },
      
      // Méta pour Brevo
      brevo_contact_id: data.brevo_contact_id || null,
      brevo_conversation_id: data.brevo_conversation_id || null,
      channel: data.channel || 'email',
      
      // Signature et personnalisation
      signature_used: data.signature_used || data.sent_by,
      personalization_applied: data.personalization_applied || false,
      
      // URLs et liens inclus
      urls_included: data.urls_included || [],
      
      // Workflow timestamp
      workflow_timestamp: new Date().getTime()
    };

    console.log('Envoi vers Brevo via Make.com...');

    // 1. Envoi vers Make.com qui transmettra à Brevo
    const makeResponse = await fetch(MAKE_SEND_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-Support-App/2.0',
        'X-Hormur-Source': 'netlify-function'
      },
      body: JSON.stringify(hormurPayload)
    });

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error('ERREUR Make.com envoi:', {
        status: makeResponse.status,
        statusText: makeResponse.statusText,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur lors de l\'envoi via Make.com vers Brevo',
          status: makeResponse.status,
          details: errorText
        })
      };
    }

    let makeResult;
    try {
      makeResult = await makeResponse.json();
    } catch (parseError) {
      console.log('Réponse Make.com non-JSON, considérée comme succès');
      makeResult = { 
        success: true, 
        raw_response: await makeResponse.text(),
        status: makeResponse.status 
      };
    }

    console.log('✅ SUCCÈS - Réponse envoyée via Brevo');

    // 2. Mise à jour du datastore si le webhook est configuré
    if (MAKE_DATASTORE_UPDATE_WEBHOOK) {
      console.log('Mise à jour du datastore...');
      
      const datastorePayload = {
        key: data.message_id,
        action: 'send_response',
        updated_by: data.sent_by,
        updated_at: new Date().toISOString(),
        platform: 'Hormur',
        updates: {
          status: 'sent',
          final_response: data.response_text,
          sent_by: data.sent_by,
          sent_at: new Date().toISOString(),
          response_modifications: data.user_modifications || false,
          original_ai_response: data.original_ai_response,
          urls_included: data.urls_included || [],
          brevo_sent: true,
          brevo_response: makeResult
        }
      };

      try {
        const datastoreResponse = await fetch(MAKE_DATASTORE_UPDATE_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hormur-Support-App/2.0',
            'X-Hormur-Source': 'netlify-send-response'
          },
          body: JSON.stringify(datastorePayload),
          timeout: 5000 // Timeout plus court pour éviter de ralentir l'envoi
        });

        if (datastoreResponse.ok) {
          console.log('✅ Datastore mis à jour');
        } else {
          console.warn('⚠️ Erreur mise à jour datastore (non-bloquant):', datastoreResponse.status);
        }
      } catch (datastoreError) {
        console.warn('⚠️ Erreur datastore (non-bloquant):', datastoreError.message);
        // Ne pas faire échouer l'envoi si le datastore a un problème
      }
    } else {
      console.log('⚠️ Datastore non configuré, mise à jour ignorée');
    }

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Réponse Hormur envoyée avec succès via Make.com → Brevo',
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        
        // Données retournées pour l'interface
        data: {
          message_id: data.message_id,
          original_message_id: data.original_message_id || data.message_id,
          sent_by: data.sent_by,
          category: data.category,
          priority: data.priority,
          response_length: data.response_text.length,
          urls_count: (data.urls_included || []).length,
          
          // Résultat Make.com
          make_response: makeResult,
          webhook_status: 'success',
          
          // Status pour l'interface
          status: 'sent_to_brevo',
          processing_status: 'completed',
          datastore_updated: MAKE_DATASTORE_UPDATE_WEBHOOK ? true : false,
          
          // Métriques
          processing_timestamp: new Date().toISOString(),
          workflow_id: hormurPayload.workflow_timestamp
        },
        
        // Instructions pour l'interface
        ui_actions: {
          refresh_message_list: true,
          close_modal: true,
          update_stats: true,
          show_success_toast: true
        },
        
        // Métriques pour l'apprentissage
        learning_metrics: {
          user_modified_response: data.user_modifications || false,
          original_confidence: data.confidence,
          response_quality_feedback: data.user_feedback,
          processing_time_ms: data.processing_time
        },
        
        // Instructions pour le suivi
        next_steps: {
          check_brevo: 'Vérifiez l\'envoi dans Brevo Conversations',
          track_response: 'Surveillez la réponse du destinataire',
          update_ai: 'Les données d\'apprentissage IA ont été transmises'
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE send-response + datastore:', {
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
        error: 'Erreur serveur interne Hormur',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'send-response-datastore',
        troubleshooting: {
          check_logs: 'Consultez les logs Netlify Functions',
          check_env_vars: 'Vérifiez les variables d\'environnement',
          check_payload: 'Vérifiez le format des données envoyées',
          check_datastore: 'Vérifiez la configuration du datastore Make.com'
        }
      })
    };
  }
};