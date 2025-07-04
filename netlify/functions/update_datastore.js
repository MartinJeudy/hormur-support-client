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
    
    console.log('=== UPDATE MESSAGE VIA GOOGLE SHEETS ===');
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
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbw0PCN3NSWGP07EwCJiUHXWmBvEAVuS5I2RHfUKFG74B9ktk8fQEBn7Hk1kJ11SPsFnEw/exec';
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    
    if (!HORMUR_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'HORMUR_API_KEY requis'
        })
      };
    }

    // 📤 PAYLOAD POUR GOOGLE APPS SCRIPT
    const updatePayload = {
      action: 'update', // Action principale
      message_id: data.message_id,
      user_email: data.user_email || 'system',
      action: data.action, // Sous-action (archive, mark_spam, etc.)
      new_status: data.new_status,
      assigned_to: data.assigned_to,
      reason: data.reason,
      escalation_reason: data.escalation_reason,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    console.log('📤 Mise à jour Google Sheets:', JSON.stringify(updatePayload, null, 2));

    // 🚀 APPEL VERS GOOGLE APPS SCRIPT
    const sheetsResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(updatePayload),
      timeout: 10000
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
          error: 'Erreur mise à jour Google Sheets',
          status: sheetsResponse.status,
          details: errorText
        })
      };
    }

    const sheetsResult = await sheetsResponse.json();
    
    if (!sheetsResult.success) {
      console.error('❌ Erreur métier Google Sheets:', sheetsResult);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(sheetsResult)
      };
    }

    console.log('✅ Mise à jour effectuée');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetsResult)
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
