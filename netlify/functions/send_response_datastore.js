exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    
    // ✅ VALIDATION DES CHAMPS REQUIS
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

    console.log('=== SEND RESPONSE REQUEST ===');
    console.log('Message ID:', data.message_id);
    console.log('Sent by:', data.sent_by);
    console.log('Response length:', data.response_text?.length);

    const MAKE_SEND_RESPONSE_WEBHOOK = process.env.MAKE_SEND_RESPONSE_WEBHOOK;
    
    if (!MAKE_SEND_RESPONSE_WEBHOOK) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MAKE_SEND_RESPONSE_WEBHOOK non configuré' })
      };
    }

    // 📤 PAYLOAD POUR MAKE.COM
    const makePayload = {
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      sent_at: new Date().toISOString(),
      
      // Données d'apprentissage IA
      user_modifications: data.user_modifications || false,
      original_ai_response: data.original_ai_response || null,
      modification_reason: data.modification_reason || null,
      
      // Métadonnées
      platform: 'Hormur',
      channel: data.channel || 'email',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Envoi vers Make.com (Response):', JSON.stringify(makePayload, null, 2));

    // 🚀 APPEL VERS MAKE.COM
    const makeResponse = await fetch(MAKE_SEND_RESPONSE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-App/2.0'
      },
      body: JSON.stringify(makePayload),
      timeout: 30000
    });

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error('❌ Erreur Make.com (Send):', {
        status: makeResponse.status,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur envoi Make.com',
          status: makeResponse.status,
          details: errorText
        })
      };
    }

    let makeResult;
    try {
      makeResult = await makeResponse.json();
    } catch {
      makeResult = { success: true, status: makeResponse.status };
    }

    console.log('✅ Réponse envoyée avec succès');

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
          make_response: makeResult
        }
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE (Send):', error);
    
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
