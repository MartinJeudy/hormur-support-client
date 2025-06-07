exports.handler = async (event, context) => {
  console.log('=== SEND RESPONSE FUNCTION ===');
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // LECTURE UNIQUE DU BODY - CORRECTION DU BUG
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON',
          details: parseError.message 
        })
      };
    }

    console.log('Data reçue:', JSON.stringify(requestData, null, 2));

    // Validation des champs requis
    const requiredFields = ['message_id', 'response_text', 'original_message_id'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Champs manquants pour Hormur',
          missing: missingFields,
          required: requiredFields
        })
      };
    }

    // Préparation des données pour Make.com
    const makeData = {
      message_id: requestData.message_id,
      original_message_id: requestData.original_message_id,
      response_text: requestData.response_text,
      from_email: requestData.from_email || '',
      subject: requestData.subject || '',
      sent_by: requestData.sent_by || 'système',
      timestamp: new Date().toISOString(),
      platform: 'Hormur',
      action: 'send_response'
    };

    console.log('=== ENVOI VERS MAKE.COM ===');
    console.log('Data à envoyer:', JSON.stringify(makeData, null, 2));

    // Récupération URL webhook Make.com
    const makeWebhookUrl = process.env.MAKE_SEND_RESPONSE_WEBHOOK;
    
    if (!makeWebhookUrl || makeWebhookUrl === 'https://temp-test.com') {
      console.error('ERREUR: Webhook Make.com non configuré');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration webhook manquante',
          details: 'MAKE_SEND_RESPONSE_WEBHOOK non configuré'
        })
      };
    }

    console.log('URL Webhook Make.com:', makeWebhookUrl);

    // Envoi vers Make.com
    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(makeData)
    });

    console.log('Statut Make.com:', makeResponse.status);
    
    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error('Erreur Make.com:', errorText);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur envoi vers Make.com',
          status: makeResponse.status,
          details: errorText
        })
      };
    }

    // Lecture de la réponse Make.com
    let makeResponseData;
    try {
      const responseText = await makeResponse.text();
      console.log('Réponse Make.com (raw):', responseText);
      
      if (responseText.trim()) {
        makeResponseData = JSON.parse(responseText);
        console.log('Réponse Make.com (JSON):', makeResponseData);
      } else {
        makeResponseData = { success: true, message: 'Webhook reçu' };
      }
    } catch (e) {
      console.log('Réponse Make.com non-JSON, considérée comme succès');
      makeResponseData = { success: true, message: 'Webhook reçu' };
    }

    console.log('=== SUCCÈS SEND RESPONSE ===');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Réponse envoyée avec succès',
        timestamp: new Date().toISOString(),
        make_response: makeResponseData,
        data: {
          message_id: requestData.message_id,
          sent_by: requestData.sent_by,
          platform: 'Hormur'
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE send-response Hormur:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur serveur interne Hormur',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'send-response',
        troubleshooting: {
          check_logs: 'Consultez les logs Netlify Functions',
          check_env_vars: 'Vérifiez les variables d\'environnement',
          check_payload: 'Vérifiez le format des données envoyées'
        }
      })
    };
  }
};
