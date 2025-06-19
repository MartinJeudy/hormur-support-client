exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Récupération des paramètres (query string pour GET, body pour POST)
    let filters = {};
    let userAuth = {};
    
    if (event.httpMethod === 'GET') {
      filters = event.queryStringParameters || {};
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      filters = body.filters || {};
      userAuth = body.auth || {};
    }

    console.log('=== RÉCUPÉRATION MESSAGES HORMUR DATASTORE ===');
    console.log('Method:', event.httpMethod);
    console.log('Filters:', filters);
    console.log('User auth:', userAuth.email ? `${userAuth.email.substring(0, 10)}...` : 'non fourni');
    console.log('==============================================');

    // URL webhook Make.com pour récupérer les messages depuis le datastore
    const MAKE_DATASTORE_GET_WEBHOOK = process.env.MAKE_DATASTORE_GET_WEBHOOK;

    if (!MAKE_DATASTORE_GET_WEBHOOK) {
      console.error('ERREUR: MAKE_DATASTORE_GET_WEBHOOK non configuré');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration datastore manquante',
          details: 'MAKE_DATASTORE_GET_WEBHOOK non configuré',
          setup_required: 'Configurez le webhook pour récupérer les données du datastore'
        })
      };
    }

    // Préparer la requête pour le datastore Make.com
    const datastoreQuery = {
      filters: {
        status: filters.status && filters.status !== 'all' ? filters.status : null,
        category: filters.category && filters.category !== 'all' ? filters.category : null,
        priority: filters.priority && filters.priority !== 'all' ? filters.priority : null,
        assigned_to: filters.assignedTo && filters.assignedTo !== 'all' ? filters.assignedTo : null,
        archived: filters.archived === 'true' ? true : filters.archived === 'false' ? false : null
      },
      search: filters.search || null,
      limit: parseInt(filters.limit) || 100,
      sort: {
        field: 'received_at',
        direction: 'desc'
      },
      user_auth: userAuth,
      timestamp: new Date().toISOString(),
      platform: 'Hormur'
    };

    // Supprimer les filtres null pour optimiser la requête
    Object.keys(datastoreQuery.filters).forEach(key => {
      if (datastoreQuery.filters[key] === null) {
        delete datastoreQuery.filters[key];
      }
    });

    console.log('Requête datastore:', JSON.stringify(datastoreQuery, null, 2));

    // Appel au webhook Make.com pour récupérer les données du datastore
    const datastoreResponse = await fetch(MAKE_DATASTORE_GET_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-Support-App/2.0',
        'X-Hormur-Source': 'netlify-get-messages'
      },
      body: JSON.stringify(datastoreQuery),
      timeout: 15000 // 15 secondes timeout
    });

    if (!datastoreResponse.ok) {
      const errorText = await datastoreResponse.text();
      console.error('ERREUR Datastore Make.com:', {
        status: datastoreResponse.status,
        statusText: datastoreResponse.statusText,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur lors de la récupération depuis le datastore',
          status: datastoreResponse.status,
          details: errorText,
          troubleshooting: {
            check_webhook_url: 'Vérifiez l\'URL du webhook datastore',
            check_make_scenario: 'Vérifiez que le scénario Make.com est actif',
            check_datastore_permissions: 'Vérifiez les permissions du datastore'
          }
        })
      };
    }

    const datastoreData = await datastoreResponse.json();
    console.log('✅ Données récupérées du datastore:', datastoreData.length || 0, 'messages');

    // Transformer les données du datastore au format attendu par l'application
    let messages = transformDatastoreToMessages(datastoreData);

    // Appliquer les filtres côté client pour plus de flexibilité
    messages = applyClientSideFilters(messages, filters);

    // Calculer les statistiques
    const stats = calculateMessageStats(messages);

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        source: 'make_datastore',
        messages: messages,
        total: messages.length,
        timestamp: new Date().toISOString(),
        filters_applied: filters,
        platform: 'Hormur',
        
        // Statistiques enrichies
        stats: stats,
        
        // Métadonnées
        metadata: {
          data_source: 'make_datastore',
          last_updated: new Date().toISOString(),
          version: '2.0',
          environment: process.env.NODE_ENV || 'production'
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE get-messages datastore:', {
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
        error: 'Erreur serveur interne - récupération datastore',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'get-messages-datastore',
        troubleshooting: {
          check_logs: 'Consultez les logs Netlify Functions',
          check_env_vars: 'Vérifiez MAKE_DATASTORE_GET_WEBHOOK',
          check_make_datastore: 'Vérifiez la configuration du datastore Make.com'
        }
      })
    };
  }
};

// Transformer les données du datastore au format de l'application
function transformDatastoreToMessages(datastoreData) {
  if (!Array.isArray(datastoreData)) {
    console.log('Données datastore non-array, tentative de traitement...');
    if (datastoreData.data && Array.isArray(datastoreData.data)) {
      datastoreData = datastoreData.data;
    } else if (datastoreData.messages && Array.isArray(datastoreData.messages)) {
      datastoreData = datastoreData.messages;
    } else {
      return [];
    }
  }

  return datastoreData.map(item => {
    const data = item.data || item;
    
    return {
      id: data.message_id || item.key || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: data.from_email || 'email.inconnu@example.com',
      subject: data.subject || 'Sujet non défini',
      content: data.content || '',
      receivedAt: formatDate(data.received_at || data.created_at),
      status: mapDatastoreStatus(data.status, data.ai_classification),
      category: data.category || 'general',
      priority: data.priority || 'medium',
      confidence: data.confidence || 0,
      spamScore: data.spam_score || 0,
      assignedTo: data.assigned_to || determineAssignedUser(data.category),
      aiClassification: data.ai_classification,
      aiResponse: data.ai_response,
      urls: data.urls || [],
      conversationHistory: data.conversation_history || [],
      brevoContactId: data.brevo_contact_id || null,
      channel: data.channel || 'email',
      timeReceived: new Date(data.received_at || data.created_at).getTime(),
      archived: data.archived || false,
      archivedAt: data.archived_at ? new Date(data.archived_at).getTime() : null,
      archivedBy: data.archived_by || null,
      
      // Propriétés spécifiques selon le type
      ...(data.status === 'auto-sent' && {
        autoSentAt: new Date(data.sent_at || data.created_at).getTime()
      }),
      
      ...(data.escalation_reason && {
        escalationReason: data.escalation_reason,
        needsHumanReview: true
      }),
      
      ...(data.spam_score > 70 && {
        spamIndicators: data.spam_indicators || ['Score de spam élevé']
      })
    };
  });
}

// Mapper le statut datastore vers le statut application
function mapDatastoreStatus(datastoreStatus, aiClassification) {
  // Mapping basé sur ai_classification si disponible
  if (aiClassification) {
    switch (aiClassification.toUpperCase()) {
      case 'AUTO_SENT':
        return 'auto-sent';
      case 'MANUAL_REVIEW':
      case 'NEEDS_REVIEW':
        return 'manual-review';
      case 'SPAM':
        return 'spam';
      case 'URGENT':
        return 'manual-review'; // Les urgents vont en révision manuelle
      case 'B2B_OPPORTUNITY':
        return 'manual-review';
      case 'PENDING':
      default:
        return 'pending';
    }
  }
  
  // Fallback sur le statut direct
  return datastoreStatus || 'pending';
}

// Déterminer l'utilisateur assigné basé sur la catégorie
function determineAssignedUser(category) {
  switch (category) {
    case 'artiste':
      return 'eleonore';
    case 'hote':
    case 'partenariat':
      return 'martin';
    default:
      return null;
  }
}

// Formater la date pour l'affichage
function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 16).replace('T', ' ');
  
  try {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16).replace('T', ' ');
  } catch (error) {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
}

// Appliquer les filtres côté client
function applyClientSideFilters(messages, filters) {
  let filtered = [...messages];

  // Filtre de recherche textuelle
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(msg => 
      msg.from.toLowerCase().includes(searchTerm) ||
      msg.subject.toLowerCase().includes(searchTerm) ||
      msg.content.toLowerCase().includes(searchTerm) ||
      (msg.aiClassification && msg.aiClassification.toLowerCase().includes(searchTerm))
    );
  }

  // Filtre par canal
  if (filters.channel && filters.channel !== 'all') {
    filtered = filtered.filter(msg => msg.channel === filters.channel);
  }

  // Trier par priorité et date
  filtered.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.timeReceived - a.timeReceived;
  });

  // Limiter le nombre de résultats
  const limit = parseInt(filters.limit) || 100;
  return filtered.slice(0, limit);
}

// Calculer les statistiques des messages
function calculateMessageStats(messages) {
  return {
    total: messages.length,
    by_status: {
      'auto-sent': messages.filter(m => m.status === 'auto-sent').length,
      'manual-review': messages.filter(m => m.status === 'manual-review').length,
      'pending': messages.filter(m => m.status === 'pending').length,
      'spam': messages.filter(m => m.status === 'spam').length,
      'sent': messages.filter(m => m.status === 'sent').length,
      'archived': messages.filter(m => m.archived).length
    },
    by_category: {
      'artiste': messages.filter(m => m.category === 'artiste').length,
      'hote': messages.filter(m => m.category === 'hote').length,
      'spectateur': messages.filter(m => m.category === 'spectateur').length,
      'partenariat': messages.filter(m => m.category === 'partenariat').length,
      'general': messages.filter(m => m.category === 'general').length,
      'spam': messages.filter(m => m.category === 'spam').length
    },
    by_priority: {
      'high': messages.filter(m => m.priority === 'high').length,
      'medium': messages.filter(m => m.priority === 'medium').length,
      'low': messages.filter(m => m.priority === 'low').length
    },
    avg_confidence: Math.round(
      messages.filter(m => m.confidence).reduce((sum, m) => sum + m.confidence, 0) / 
      messages.filter(m => m.confidence).length || 0
    ),
    today: {
      received: messages.filter(m => isToday(m.timeReceived)).length,
      auto_sent: messages.filter(m => m.status === 'auto-sent' && isToday(m.timeReceived)).length,
      urgent: messages.filter(m => m.priority === 'high' && isToday(m.timeReceived)).length
    }
  };
}

// Vérifier si une date est aujourd'hui
function isToday(timestamp) {
  const today = new Date();
  const date = new Date(timestamp);
  return date.toDateString() === today.toDateString();
}