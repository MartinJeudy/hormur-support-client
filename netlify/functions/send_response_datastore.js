exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
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
    
    const requiredFields = ['message_id', 'response_text', 'sent_by'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Champs manquants', 
          missing: missingFields
        })
      };
    }

    console.log('=== SEND RESPONSE VIA GOOGLE APPS SCRIPT ===');
    console.log('Message ID:', data.message_id);

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

    const gasPayload = {
      action: 'send_response',
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
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
      body: JSON.stringify(gasPayload)
    });

    if (!gasResponse.ok) {
      const errorText = await gasResponse.text();
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur Google Apps Script',
          details: 'Erreur serveur'
        })
      };
    }

    const gasResult = await gasResponse.json();
    
    if (!gasResult.success) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(gasResult)
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Réponse envoyée avec succès',
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id,
          sent_by: data.sent_by
        }
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
