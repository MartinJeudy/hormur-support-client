exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    // 📥 DONNÉES REÇUES DE L'APP
    let filters = {};
    if (event.httpMethod === 'GET') {
      filters = event.queryStringParameters || {};
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      filters = body.filters || {};
    }

    console.log('=== GET MESSAGES REQUEST ===');
    console.log('Filters:', filters);

    const MAKE_DATASTORE_GET_WEBHOOK = process.env.MAKE_DATASTORE_GET_WEBHOOK;

    if (!MAKE_DATASTORE_GET_WEBHOOK) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MAKE_DATASTORE_GET_WEBHOOK non configuré' })
      };
    }

    // 📤 PAYLOAD POUR MAKE.COM (Format attendu par votre flow)
    const makePayload = {
      filters: {
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        category: filters.category && filters.category !== 'all' ? filters.category : undefined,
        priority: filters.priority && filters.priority !== 'all' ? filters.priority : undefined,
        archived: filters.archived === 'true' ? true : filters.archived === 'false' ? false : undefined
      },
      search: filters.search || undefined,
      limit: parseInt(filters.limit) || 100,
      sort: {
        field: filters.sortField || 'received_at',
        direction: filters.sortDirection || 'desc'
      },
      timestamp: new Date().toISOString()
    };

    // Nettoyer les undefined
    Object.keys(makePayload.filters).forEach(key => {
      if (makePayload.filters[key] === undefined) {
        delete makePayload.filters[key];
      }
    });

    console.log('📤 Envoi vers Make.com:', JSON.stringify(makePayload, null, 2));

    // 🚀 APPEL VERS MAKE.COM
    const makeResponse = await fetch(MAKE_DATASTORE_GET_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-App/2.0'
      },
      body: JSON.stringify(makePayload),
      timeout: 15000
    });

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error('❌ Erreur Make.com:', {
        status: makeResponse.status,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur Make.com',
          status: makeResponse.status,
          details: errorText
        })
      };
    }

    const makeData = await makeResponse.json();
    console.log('✅ Réponse Make.com reçue:', makeData?.length || 'objet');

    // 📥 TRAITEMENT DE LA RÉPONSE MAKE.COM
    let messages = [];
    
    // Gérer différents formats de réponse Make.com
    if (Array.isArray(makeData)) {
      messages = makeData;
    } else if (makeData.messages) {
      messages = makeData.messages;
    } else if (makeData.result) {
      messages = makeData.result;
    } else {
      console.warn('Format de réponse Make.com inattendu:', typeof makeData);
      messages = [];
    }

    // 🔄 TRANSFORMATION POUR L'APP
    const transformedMessages = messages.map(item => {
      const data = item.data || item;
      return {
        id: item.key || data.id || `msg_${Date.now()}`,
        from: data.from_email || data.from || 'inconnu@example.com',
        subject: data.subject || 'Sujet non défini',
        content: data.content || '',
        receivedAt: data.received_at || data.receivedAt || new Date().toISOString(),
        status: data.status || 'pending',
        category: data.category || 'general',
        priority: data.priority || 'medium',
        confidence: data.confidence || 0,
        assignedTo: data.assigned_to || data.assignedTo,
        aiResponse: data.ai_response || data.aiResponse,
        archived: data.archived || false,
        timeReceived: new Date(data.received_at || data.receivedAt || Date.now()).getTime()
      };
    });

    console.log('🎯 Messages transformés:', transformedMessages.length);

    // 📤 RÉPONSE POUR L'APP
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        source: 'make_datastore',
        messages: transformedMessages,
        total: transformedMessages.length,
        timestamp: new Date().toISOString(),
        filters_applied: filters
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erreur serveur interne',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
