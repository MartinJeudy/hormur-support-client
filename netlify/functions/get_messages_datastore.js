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
    // 📥 DONNÉES REÇUES DE L'APP
    let filters = {};
    if (event.httpMethod === 'GET') {
      filters = event.queryStringParameters || {};
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      filters = body.filters || {};
    }

    console.log('=== GET MESSAGES FROM GOOGLE SHEETS ===');
    console.log('Filters:', filters);

    // ✅ Configuration Google Apps Script
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbw0PCN3NSWGP07EwCJiUHXWmBvEAVuS5I2RHfUKFG74B9ktk8fQEBn7Hk1kJ11SPsFnEw/exec';
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;

    if (!HORMUR_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'HORMUR_API_KEY non configuré'
        })
      };
    }

    // 📤 PAYLOAD POUR GOOGLE APPS SCRIPT
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

    // Nettoyer les undefined
    Object.keys(requestPayload.filters).forEach(key => {
      if (requestPayload.filters[key] === undefined) {
        delete requestPayload.filters[key];
      }
    });

    console.log('📤 Requête vers Google Sheets:', JSON.stringify(requestPayload, null, 2));

    // 🚀 APPEL VERS GOOGLE APPS SCRIPT SÉCURISÉ
    const sheetsResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(requestPayload),
      timeout: 15000
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('❌ Erreur Google Sheets:', {
        status: sheetsResponse.status,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur Google Sheets',
          status: sheetsResponse.status,
          details: errorText
        })
      };
    }

    const sheetsData = await sheetsResponse.json();
    console.log('✅ Données reçues de Google Sheets:', sheetsData?.messages?.length || 0, 'messages');

    // 🔄 VÉRIFICATION ET TRANSFORMATION DES DONNÉES
    if (!sheetsData.success) {
      console.error('❌ Erreur métier Google Sheets:', sheetsData);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(sheetsData)
      };
    }

    // 📤 RÉPONSE POUR L'APP (format attendu par l'interface)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        source: 'google_sheets_secure',
        messages: sheetsData.messages || [],
        total: sheetsData.total || 0,
        timestamp: new Date().toISOString(),
        filters_applied: filters
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE get-messages:', error);
    
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
