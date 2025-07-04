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

    console.log('=== SEND RESPONSE VIA GOOGLE SHEETS ===');
    console.log('Message ID:', data.message_id);
    console.log('Sent by:', data.sent_by);

    // ✅ Configuration Google Apps Script
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbw0PCN3NSWGP07EwCJiUHXWmBvEAVuS5I2RHfUKFG74B9ktk8fQEBn7Hk1kJ11SPsFnEw/exec';
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    const MAKE_SEND_RESPONSE_WEBHOOK = process.env.MAKE_SEND_RESPONSE_WEBHOOK; // Optionnel pour Brevo
    
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
    const sheetsPayload = {
      action: 'send_response',
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      user_modifications: data.user_modifications || false,
      original_ai_response: data.original_ai_response || null,
      modification_reason: data.modification_reason || null,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    console.log('📤 Marquage comme envoyé:', JSON.stringify(sheetsPayload, null, 2));

    // 🚀 1. MARQUER COMME ENVOYÉ DANS GOOGLE SHEETS
    const sheetsResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(sheetsPayload),
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

    // 🚀 2. ENVOYER VIA MAKE.COM → BREVO (OPTIONNEL)
    let makeResult = null;
    if (MAKE_SEND_RESPONSE_WEBHOOK) {
      const makePayload = {
        message_id: data.message_id,
        response_text: data.response_text,
        sent_by: data.sent_by,
        sent_at: new Date().toISOString(),
        platform: 'Hormur'
      };

      try {
        console.log('📤 Envoi vers Make.com → Brevo...');
        const makeResponse = await fetch(MAKE_SEND_RESPONSE_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hormur-Support/2.0'
          },
          body: JSON.stringify(makePayload),
          timeout: 15000
        });

        if (makeResponse.ok) {
          makeResult = await makeResponse.json();
          console.log('✅ Envoi Brevo réussi');
        } else {
          console.warn('⚠️ Erreur Make.com (non-bloquant):', makeResponse.status);
        }
      } catch (makeError) {
        console.warn('⚠️ Erreur Make.com (non-bloquant):', makeError.message);
      }
    }

    console.log('✅ Réponse traitée avec succès');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Réponse envoyée avec succès',
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id,
          sent_by: data.sent_by,
          sheets_result: sheetsResult,
          brevo_sent: !!makeResult
        }
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE send-response:', error);
    
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
