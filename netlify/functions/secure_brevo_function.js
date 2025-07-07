// /.netlify/functions/secure_brevo_function.js
// VERSION DEBUG AVEC LOGS DÉTAILLÉS

exports.handler = async (event, context) => {
  console.log('🚀 FONCTION DÉMARRÉE - secure_brevo_function');
  console.log('📥 Event reçu:', JSON.stringify({
    httpMethod: event.httpMethod,
    headers: event.headers,
    body: event.body
  }, null, 2));

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Requête OPTIONS - CORS preflight');
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ Méthode non autorisée:', event.httpMethod);
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('📋 Parsing du JSON...');
    const data = JSON.parse(event.body);
    
    console.log('=== DONNÉES REÇUES ===');
    console.log('✅ Payload complet:', JSON.stringify(data, null, 2));
    
    // Vérification des champs - VERSION DEBUG
    const requiredFields = ['message_id', 'response_text', 'sent_by', 'visitor_id'];
    console.log('🔍 Vérification des champs requis:', requiredFields);
    
    const presentFields = {};
    const missingFields = [];
    
    requiredFields.forEach(field => {
      if (data[field]) {
        presentFields[field] = data[field];
        console.log(`✅ ${field}: "${data[field]}"`);
      } else {
        missingFields.push(field);
        console.log(`❌ ${field}: MANQUANT`);
      }
    });
    
    if (missingFields.length > 0) {
      console.error('💥 ÉCHEC - Champs manquants:', missingFields);
      console.log('📝 Champs présents:', presentFields);
      console.log('📝 Toutes les clés disponibles:', Object.keys(data));
      
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Champs manquants', 
          missing: missingFields,
          present: presentFields,
          all_keys: Object.keys(data),
          received_data: data
        })
      };
    }

    console.log('=== CONFIGURATION BREVO ===');
    
    // Vérification des variables d'environnement
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_API_URL = 'https://api.brevo.com/v3/conversations/messages';
    
    console.log('🔑 BREVO_API_KEY présente:', !!BREVO_API_KEY);
    console.log('🔑 BREVO_API_KEY longueur:', BREVO_API_KEY ? BREVO_API_KEY.length : 0);
    console.log('🔑 BREVO_API_KEY début:', BREVO_API_KEY ? BREVO_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
    
    if (!BREVO_API_KEY) {
      console.error('💥 BREVO_API_KEY manquante dans les variables d\'environnement');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'BREVO_API_KEY non configurée',
          env_vars: {
            BREVO_API_KEY: !!process.env.BREVO_API_KEY,
            GOOGLE_APPS_SCRIPT_URL: !!process.env.GOOGLE_APPS_SCRIPT_URL,
            HORMUR_API_KEY: !!process.env.HORMUR_API_KEY
          }
        })
      };
    }
    
    // Détermination de l'agent ID
    console.log('👤 Utilisateur envoyeur:', data.sent_by);
    const agentId = data.sent_by === 'eleonore@hormur.com' 
      ? '6223aae91d1bcc698a514cd6_67d814247e4a70279409c965'  // Éléonore
      : '6223aae91d1bcc698a514cd6_67a0bf5edbc8f653740f31c8'; // Martin
    
    console.log('🎯 Agent ID sélectionné:', agentId);
    console.log('📋 Mapping agents:');
    console.log('  - eleonore@hormur.com → 6223aae91d1bcc698a514cd6_67d814247e4a70279409c965');
    console.log('  - autre → 6223aae91d1bcc698a514cd6_67a0bf5edbc8f653740f31c8');

    // Construction du payload Brevo
    const brevoPayload = {
      visitorId: data.visitor_id,
      text: data.response_text,
      agentId: agentId
    };

    console.log('=== PAYLOAD BREVO ===');
    console.log('📤 Payload final:', JSON.stringify(brevoPayload, null, 2));
    console.log('📤 URL cible:', BREVO_API_URL);

    // TEST: Vérification préalable des données
    console.log('🔍 VALIDATION PAYLOAD:');
    console.log('  - visitorId longueur:', brevoPayload.visitorId?.length || 'undefined');
    console.log('  - text longueur:', brevoPayload.text?.length || 'undefined');
    console.log('  - agentId longueur:', brevoPayload.agentId?.length || 'undefined');
    
    if (!brevoPayload.visitorId || brevoPayload.visitorId.length < 10) {
      console.error('❌ VisitorId invalide:', brevoPayload.visitorId);
    }
    
    if (!brevoPayload.text || brevoPayload.text.length < 5) {
      console.error('❌ Text invalide:', brevoPayload.text);
    }
    
    if (!brevoPayload.agentId || brevoPayload.agentId.length < 10) {
      console.error('❌ AgentId invalide:', brevoPayload.agentId);
    }

    console.log('🚀 ENVOI VERS BREVO...');
    
    // Appel API Brevo avec headers détaillés
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(brevoPayload)
    });

    console.log('📨 RÉPONSE BREVO:');
    console.log('  - Status:', brevoResponse.status);
    console.log('  - Status Text:', brevoResponse.statusText);
    console.log('  - Headers:', JSON.stringify([...brevoResponse.headers.entries()]));

    // Lecture de la réponse
    const responseText = await brevoResponse.text();
    console.log('📄 Réponse brute:', responseText);
    
    let brevoResult;
    try {
      brevoResult = JSON.parse(responseText);
      console.log('📋 Réponse JSON:', JSON.stringify(brevoResult, null, 2));
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      brevoResult = { raw: responseText };
    }

    if (!brevoResponse.ok) {
      console.error('💥 ERREUR BREVO:');
      console.error('  - Status:', brevoResponse.status);
      console.error('  - Status Text:', brevoResponse.statusText);
      console.error('  - Body:', responseText);
      
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Erreur envoi Brevo',
          status: brevoResponse.status,
          statusText: brevoResponse.statusText,
          details: responseText,
          brevo_payload: brevoPayload,
          headers: [...brevoResponse.headers.entries()]
        })
      };
    }

    console.log('✅ SUCCESS! Message envoyé via Brevo');
    console.log('🎉 Résultat:', JSON.stringify(brevoResult, null, 2));

    // Maintenant mettre à jour le Google Apps Script
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    
    console.log('📊 MISE À JOUR GOOGLE APPS SCRIPT:');
    console.log('  - URL présente:', !!GOOGLE_APPS_SCRIPT_URL);
    console.log('  - API Key présente:', !!HORMUR_API_KEY);
    
    if (!GOOGLE_APPS_SCRIPT_URL || !HORMUR_API_KEY) {
      console.warn('⚠️ Configuration Google Apps Script manquante');
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Message envoyé via Brevo (sheet non mis à jour)',
          brevo_response: brevoResult,
          brevo_payload: brevoPayload,
          timestamp: new Date().toISOString(),
          debug: 'Google Apps Script non configuré'
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

    console.log('📤 Payload Google Apps Script:', JSON.stringify(gasPayload, null, 2));

    const gasResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': HORMUR_API_KEY,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(gasPayload)
    });

    console.log('📨 Réponse Google Apps Script:', gasResponse.status);

    if (!gasResponse.ok) {
      console.error('❌ Erreur Google Apps Script (mais Brevo OK)');
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Message envoyé via Brevo, erreur mise à jour sheet',
          brevo_response: brevoResult,
          brevo_payload: brevoPayload,
          gas_error: 'Erreur mise à jour Google Apps Script',
          timestamp: new Date().toISOString()
        })
      };
    }

    const gasResult = await gasResponse.json();
    console.log('✅ Google Apps Script mis à jour:', gasResult);

    console.log('🎯 SUCCÈS COMPLET!');
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Message envoyé via Brevo et sheet mis à jour',
        brevo_response: brevoResult,
        brevo_payload: brevoPayload,
        gas_response: gasResult,
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id,
          sent_by: data.sent_by,
          agent_id: agentId,
          visitor_id: data.visitor_id
        }
      })
    };

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error);
    console.error('📚 Stack trace:', error.stack);
    console.error('📝 Type erreur:', error.name);
    console.error('💬 Message erreur:', error.message);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erreur serveur interne',
        details: error.message,
        stack: error.stack,
        type: error.name,
        timestamp: new Date().toISOString()
      })
    };
  }
};
