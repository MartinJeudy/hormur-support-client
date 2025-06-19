exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  if (!['POST', 'PUT', 'DELETE'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    console.log('=== MISE À JOUR DATASTORE HORMUR ===');
    console.log('Method:', event.httpMethod);
    console.log('Action:', data.action);
    console.log('Message ID:', data.message_id);
    console.log('User:', data.user_email || 'system');
    console.log('====================================');

    // Validation des données requises
    if (!data.action || !data.message_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Données manquantes',
          required: ['action', 'message_id'],
          received: Object.keys(data)
        })
      };
    }

    // URL webhook Make.com pour mettre à jour le datastore
    const MAKE_DATASTORE_UPDATE_WEBHOOK = process.env.MAKE_DATASTORE_UPDATE_WEBHOOK;
    
    if (!MAKE_DATASTORE_UPDATE_WEBHOOK) {
      console.error('ERREUR: MAKE_DATASTORE_UPDATE_WEBHOOK non configuré');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration datastore manquante',
          details: 'MAKE_DATASTORE_UPDATE_WEBHOOK non configuré'
        })
      };
    }

    // Préparer les données selon l'action
    const updatePayload = buildUpdatePayload(data);

    console.log('Payload de mise à jour:', JSON.stringify(updatePayload, null, 2));

    // Envoi vers Make.com pour mise à jour du datastore
    const datastoreResponse = await fetch(MAKE_DATASTORE_UPDATE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-Support-App/2.0',
        'X-Hormur-Source': 'netlify-update-datastore'
      },
      body: JSON.stringify(updatePayload),
      timeout: 10000
    });

    if (!datastoreResponse.ok) {
      const errorText = await datastoreResponse.text();
      console.error('ERREUR Datastore Update:', {
        status: datastoreResponse.status,
        statusText: datastoreResponse.statusText,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur lors de la mise à jour du datastore',
          status: datastoreResponse.status,
          details: errorText
        })
      };
    }

    const updateResult = await datastoreResponse.json();
    console.log('✅ Datastore mis à jour avec succès');

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Action '${data.action}' effectuée avec succès`,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        
        data: {
          message_id: data.message_id,
          action: data.action,
          updated_by: data.user_email || 'system',
          datastore_result: updateResult
        },

        // Instructions pour l'interface
        ui_update: getUIUpdateInstructions(data.action),
        
        // Actions effectuées
        actions_performed: getActionsPerformed(data.action, data)
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE update-datastore:', {
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
        error: 'Erreur serveur interne - mise à jour datastore',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'update-datastore'
      })
    };
  }
};

// Construire le payload de mise à jour selon l'action
function buildUpdatePayload(data) {
  const basePayload = {
    key: data.message_id,
    action: data.action,
    updated_by: data.user_email || 'system',
    updated_at: new Date().toISOString(),
    platform: 'Hormur'
  };

  switch (data.action) {
    case 'archive':
      return {
        ...basePayload,
        updates: {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: data.user_email || 'system',
          status: 'archived'
        }
      };

    case 'unarchive':
      return {
        ...basePayload,
        updates: {
          archived: false,
          archived_at: null,
          archived_by: null,
          status: data.previous_status || 'pending'
        }
      };

    case 'send_response':
      return {
        ...basePayload,
        updates: {
          status: 'sent',
          final_response: data.response_text,
          sent_by: data.sent_by || data.user_email,
          sent_at: new Date().toISOString(),
          response_modifications: data.user_modifications || false,
          original_ai_response: data.original_ai_response,
          urls_included: data.urls_included || []
        }
      };

    case 'update_status':
      return {
        ...basePayload,
        updates: {
          status: data.new_status,
          status_reason: data.reason || null,
          priority: data.priority || null
        }
      };

    case 'assign':
      return {
        ...basePayload,
        updates: {
          assigned_to: data.assigned_to,
          assignment_reason: data.reason || null
        }
      };

    case 'add_note':
      return {
        ...basePayload,
        updates: {
          notes: data.notes || [],
          last_note_by: data.user_email || 'system'
        }
      };

    case 'mark_spam':
      return {
        ...basePayload,
        updates: {
          status: 'spam',
          spam_score: 100,
          spam_marked_by: data.user_email || 'system',
          spam_marked_at: new Date().toISOString(),
          spam_reason: data.reason || 'Marqué manuellement comme spam'
        }
      };

    case 'unmark_spam':
      return {
        ...basePayload,
        updates: {
          status: 'pending',
          spam_score: Math.max((data.current_spam_score || 100) - 50, 0),
          spam_unmarked_by: data.user_email || 'system',
          spam_unmarked_at: new Date().toISOString()
        }
      };

    case 'escalate':
      return {
        ...basePayload,
        updates: {
          status: 'manual-review',
          priority: 'high',
          escalation_reason: data.escalation_reason,
          escalated_by: data.user_email || 'system',
          escalated_at: new Date().toISOString()
        }
      };

    case 'update_ai_response':
      return {
        ...basePayload,
        updates: {
          ai_response: data.new_ai_response,
          ai_response_modified: true,
          ai_response_modified_by: data.user_email || 'system',
          ai_response_modified_at: new Date().toISOString(),
          original_ai_response: data.original_ai_response
        }
      };

    case 'bulk_archive':
      return {
        ...basePayload,
        action: 'bulk_update',
        message_ids: data.message_ids,
        updates: {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: data.user_email || 'system',
          status: 'archived'
        }
      };

    default:
      return {
        ...basePayload,
        updates: data.updates || {}
      };
  }
}

// Instructions pour mettre à jour l'interface utilisateur
function getUIUpdateInstructions(action) {
  const instructions = {
    archive: {
      refresh_tabs: ['dashboard', 'all', 'archives'],
      update_stats: true,
      close_modal: true,
      show_toast: 'Message archivé avec succès'
    },
    unarchive: {
      refresh_tabs: ['archives', 'all'],
      update_stats: true,
      show_toast: 'Message restauré des archives'
    },
    send_response: {
      refresh_tabs: ['dashboard', 'validation', 'all'],
      update_stats: true,
      close_modal: true,
      show_toast: 'Réponse envoyée avec succès'
    },
    update_status: {
      refresh_tabs: ['dashboard', 'all'],
      update_stats: true,
      show_toast: 'Statut mis à jour'
    },
    assign: {
      refresh_tabs: ['dashboard', 'validation', 'all'],
      show_toast: 'Message assigné'
    },
    mark_spam: {
      refresh_tabs: ['dashboard', 'all'],
      update_stats: true,
      close_modal: true,
      show_toast: 'Message marqué comme spam'
    },
    escalate: {
      refresh_tabs: ['dashboard', 'validation', 'all'],
      update_stats: true,
      show_toast: 'Message escaladé en urgence'
    }
  };

  return instructions[action] || {
    refresh_tabs: ['all'],
    show_toast: 'Action effectuée'
  };
}

// Actions effectuées selon le type
function getActionsPerformed(action, data) {
  const actions = {
    archive: [
      'Message déplacé vers les archives',
      'Statut mis à jour vers "archived"',
      'Horodatage d\'archivage ajouté'
    ],
    send_response: [
      'Réponse envoyée via Brevo',
      'Statut mis à jour vers "sent"',
      'Historique de la conversation mis à jour',
      'Métriques IA enregistrées pour amélioration'
    ],
    escalate: [
      'Priorité élevée au niveau "high"',
      'Statut mis à jour vers "manual-review"',
      'Notification d\'urgence envoyée à l\'équipe',
      'Raison d\'escalation enregistrée'
    ],
    mark_spam: [
      'Message marqué comme spam',
      'Score de spam mis à 100%',
      'Filtres anti-spam mis à jour',
      'Apprentissage automatique du filtre'
    ]
  };

  return actions[action] || ['Action personnalisée effectuée'];
}