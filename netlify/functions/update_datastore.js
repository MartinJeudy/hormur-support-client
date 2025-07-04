exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
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
    
    console.log('=== UPDATE MESSAGE VIA GOOGLE APPS SCRIPT ===');
    console.log('Action:', data.action);
    console.log('Message ID:', data.message_id);

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

    // ✅ Configuration Google Apps Script
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

    // 📤 PAYLOAD POUR GOOGLE APPS SCRIPT
    const updatePayload = {
      action: 'update',
      message_id: data.message_id,
      user_email: data.user_email || 'system',
      update_action: data.action, // Renommé pour éviter la confusion
      new_status: data.new_status,
      assigned_to: data.assigned_to,
      reason: data.reason,
      escalation_reason: data.escalation_reason,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    console.log('📤 Mise à jour Google Apps Script:', JSON.stringify(updatePayload, null, 2));

    // 🚀 APPEL VERS GOOGLE APPS SCRIPT
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
      const errorText = await gasResponse.text();
      console.error('❌ Erreur Google Apps Script:', {
        status: gasResponse.status,
        body: errorText.substring(0, 500)
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur mise à jour Google Apps Script',
          status: gasResponse.status,
          details: gasResponse.status === 401 ? 'URL ou API Key incorrecte' : 'Erreur serveur GAS'
        })
      };
    }

    const gasResult = await gasResponse.json();
    
    if (!gasResult.success) {
      console.error('❌ Erreur métier Google Apps Script:', gasResult);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(gasResult)
      };
    }

    console.log('✅ Mise à jour effectuée');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(gasResult)
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE update:', error);
    
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
