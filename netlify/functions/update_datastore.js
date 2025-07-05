exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    const data = JSON.parse(event.body);
    
    if (!data.action || !data.message_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Données manquantes',
          required: ['action', 'message_id']
        })
      };
    }

    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    
    if (!GOOGLE_APPS_SCRIPT_URL || !HORMUR_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante'
        })
      };
    }

    const updatePayload = {
      action: 'update',
      message_id: data.message_id,
      user_email: data.user_email || 'system',
      update_action: data.action,
      new_status: data.new_status,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    const gasResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!gasResponse.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur Google Apps Script'
        })
      };
    }

    const gasResult = await gasResponse.json();
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(gasResult)
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erreur serveur interne',
        details: error.message
      })
    };
  }
};
