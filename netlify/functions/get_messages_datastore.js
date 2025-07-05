exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    let filters = {};
    if (event.httpMethod === 'GET') {
      filters = event.queryStringParameters || {};
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      filters = body.filters || {};
    }

    console.log('=== GET MESSAGES FROM GOOGLE APPS SCRIPT ===');
    console.log('Filters:', filters);

    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;

    if (!GOOGLE_APPS_SCRIPT_URL || !HORMUR_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'GOOGLE_APPS_SCRIPT_URL et HORMUR_API_KEY requis'
        })
      };
    }

    const requestPayload = {
      action: 'get',
      filters: {
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        category: filters.category && filters.category !== 'all' ? filters.category : undefined,
        priority: filters.priority && filters.priority !== 'all' ? filters.priority : undefined,
        archived: filters.archived
      },
      search: filters.search || undefined,
      limit: parseInt(filters.limit) || 100,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    Object.keys(requestPayload.filters).forEach(key => {
      if (requestPayload.filters[key] === undefined) {
        delete requestPayload.filters[key];
      }
    });

    console.log('📤 Requête vers Google Apps Script:', JSON.stringify(requestPayload, null, 2));

    const gasResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📨 Réponse GAS Status:', gasResponse.status);

    if (!gasResponse.ok) {
      const errorText = await gasResponse.text();
      console.error('❌ Erreur Google Apps Script:', {
        status: gasResponse.status,
        body: errorText.substring(0, 500)
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur Google Apps Script',
          status: gasResponse.status,
          details: 'Erreur serveur'
        })
      };
    }

    const gasData = await gasResponse.json();
    console.log('✅ Données reçues:', gasData?.messages?.length || 0, 'messages');

    if (!gasData.success) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(gasData)
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        source: 'google_apps_script',
        messages: gasData.messages || [],
        total: gasData.total || 0,
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
