exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    
    console.log('=== UPDATE DATASTORE REQUEST ===');
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

    const MAKE_DATASTORE_UPDATE_WEBHOOK = process.env.MAKE_DATASTORE_UPDATE_WEBHOOK;
    
    if (!MAKE_DATASTORE_UPDATE_WEBHOOK) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MAKE_DATASTORE_UPDATE_WEBHOOK non configuré' })
      };
    }

    // 📤 PAYLOAD POUR MAKE.COM
    const makePayload = {
      action: data.action,
      message_id: data.message_id,
      user_email: data.user_email || 'system',
      timestamp: new Date().toISOString(),
      
      // Données spécifiques selon l'action
      ...(data.action === 'archive' && {
        archive_reason: data.reason || 'manual'
      }),
      ...(data.action === 'mark_spam' && {
        spam_reason: data.reason || 'Marqué manuellement'
      }),
      ...(data.action === 'escalate' && {
        escalation_reason: data.escalation_reason || 'Escalation manuelle'
      })
    };

    console.log('📤 Envoi vers Make.com (Update):', JSON.stringify(makePayload, null, 2));

    // 🚀 APPEL VERS MAKE.COM
    const makeResponse = await fetch(MAKE_DATASTORE_UPDATE_WEBHOOK, {
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
      console.error('❌ Erreur Make.com (Update):', {
        status: makeResponse.status,
        body: errorText
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur mise à jour Make.com',
          status: makeResponse.status,
          details: errorText
        })
      };
    }

    const makeResult = await makeResponse.json();
    console.log('✅ Mise à jour effectuée');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Action '${data.action}' effectuée avec succès`,
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id,
          action: data.action,
          make_response: makeResult
        }
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE (Update):', error);
    
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
