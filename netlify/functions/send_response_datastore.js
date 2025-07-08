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
    
    console.log('=== DONNÉES REÇUES DU WEBHOOK BREVO ===');
    console.log('Data:', JSON.stringify(data, null, 2));

    // ✅ EXTRACTION DES DONNÉES BREVO (déjà présentes dans `data`)
    const messageSource = data.visitor?.source || 'unknown';
    const userEmail = extractUserEmail(data);
    
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

    // ✅ ENVOI VERS MAKE.COM avec données extraites
    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
    if (MAKE_WEBHOOK_URL) {
      const makePayload = {
        message_id: data.message_id,
        response_text: data.response_text,
        sent_by: data.sent_by,
        
        // ✅ DONNÉES EXTRAITES DU WEBHOOK BREVO
        message_source: messageSource,              // Colonne W
        user_email: userEmail,                     // Email utilisateur
        
        channel_type: messageSource === 'email' ? 'email' : 'chat_widget',
        routing_method: messageSource === 'email' ? 'email_reply' : 'brevo_via_makecom',
        
        visitor_id: data.visitor?.id,
        conversation_id: data.conversationId,
        thread_id: data.visitor?.threadId,
        
        // Données email (si disponibles)
        sender_email: data.messages?.[0]?.from?.email,
        recipient_email: data.messages?.[0]?.to?.[0]?.email,
        original_subject: data.messages?.[0]?.subject,
        
        timestamp: new Date().toISOString(),
        source: "hormur_frontend"
      };

      try {
        console.log('📤 Envoi vers Make.com avec source:', messageSource);
        const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([makePayload])
        });

        if (makeResponse.ok) {
          console.log('✅ Make.com webhook envoyé');
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              message: 'Envoyé vers Make.com',
              data: {
                message_source: messageSource,
                user_email: userEmail,
                routing_method: makePayload.routing_method
              }
            })
          };
        }
      } catch (makeError) {
        console.error('❌ Erreur Make.com:', makeError);
      }
    }

    // Fallback vers Google Apps Script si Make.com échoue...
    // (reste du code existant)

  } catch (error) {
    console.error('💥 ERREUR:', error);
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

// ✅ FONCTION HELPER POUR EXTRAIRE L'EMAIL
function extractUserEmail(data) {
  // Pour les messages email
  if (data.visitor?.source === 'email') {
    return data.messages?.[0]?.from?.email || 
           data.visitor?.contactAttributes?.EMAIL ||
           data.visitor?.attributes?.EMAIL;
  }
  
  // Pour les messages widget
  if (data.visitor?.source === 'widget') {
    return data.visitor?.contactAttributes?.EMAIL ||
           data.visitor?.attributes?.EMAIL ||
           data.visitor?.integrationAttributes?.EMAIL;
  }
  
  return null;
}
