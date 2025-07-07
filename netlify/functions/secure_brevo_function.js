// /.netlify/functions/send_brevo_direct.js
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
    
    const requiredFields = ['message_id', 'response_text', 'sent_by', 'visitor_id'];
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

    console.log('=== ENVOI DIRECT BREVO ===');
    console.log('Message ID:', data.message_id);
    console.log('Sent by:', data.sent_by);

    // Configuration Brevo - SÉCURISÉE avec variable d'environnement
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_API_URL = 'https://api.brevo.com/v3/conversations/messages';
    
    // Vérification que la clé API est disponible
    if (!BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY manquante dans les variables d\'environnement');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'BREVO_API_KEY non configurée'
        })
      };
    }
    
    // Déterminer l'agent ID selon l'utilisateur
    const agentId = data.sent_by === 'eleonore@hormur.com' 
      ? '6223aae91d1bcc698a514cd6_67d814247e4a70279409c965'  // Éléonore
      : '6223aae91d1bcc698a514cd6_67a0bf5edbc8f653740f31c8'; // Martin

    // Payload pour Brevo
    const brevoPayload = {
      visitorId: data.visitor_id,
      text: data.response_text,
      agentId: agentId
    };

    console.log('📤 Envoi vers Brevo:', JSON.stringify(brevoPayload, null, 2));

    // Appel API Brevo
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });

    console.log('📨 Réponse Brevo Status:', brevoResponse.status);

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('❌ Erreur Brevo:', {
        status: brevoResponse.status,
        body: errorText.substring(0, 500)
      });
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur envoi Brevo',
          status: brevoResponse.status,
          details: 'Erreur serveur Brevo'
        })
      };
    }

    const brevoResult = await brevoResponse.json();
    console.log('✅ Message envoyé via Brevo:', brevoResult);

    // Maintenant mettre à jour le Google Apps Script
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    
    if (!GOOGLE_APPS_SCRIPT_URL || !HORMUR_API_KEY) {
      console.warn('⚠️ Configuration Google Apps Script manquante, envoi Brevo réussi mais pas de mise à jour du sheet');
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Message envoyé via Brevo (sheet non mis à jour)',
          brevo_response: brevoResult,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Mettre à jour le Google Apps Script
    const gasPayload = {
      action: 'send_response',
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      timestamp: new Date().toISOString(),
      api_key: HORMUR_API_KEY
    };

    console.log('📊 Mise à jour Google Apps Script...');

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
      console.error('❌ Erreur Google Apps Script (mais Brevo OK)');
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Message envoyé via Brevo, erreur mise à jour sheet',
          brevo_response: brevoResult,
          gas_error: 'Erreur mise à jour Google Apps Script',
          timestamp: new Date().toISOString()
        })
      };
    }

    const gasResult = await gasResponse.json();
    console.log('✅ Google Apps Script mis à jour:', gasResult);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Message envoyé via Brevo et sheet mis à jour',
        brevo_response: brevoResult,
        gas_response: gasResult,
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id,
          sent_by: data.sent_by,
          agent_id: agentId
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