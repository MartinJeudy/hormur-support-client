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

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Format JSON invalide',
        details: 'Le body de la requête doit être un JSON valide'
      })
    };
  }

  try {
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

    console.log('=== TRAITEMENT RÉPONSE ROBUSTE ===');
    console.log('Message ID:', data.message_id);
    console.log('Taille texte original:', data.response_text?.length || 0);

    // ✅ SANITISATION ULTRA-ROBUSTE DU TEXTE
    const sanitizedText = sanitizeTextForWebhook(data.response_text);
    const extractedSource = extractMessageSource(data);
    const extractedEmail = extractUserEmail(data);

    console.log('Source détectée:', extractedSource);
    console.log('Email détecté:', extractedEmail);
    console.log('Taille texte sanitisé:', sanitizedText?.length || 0);

    // ✅ TENTATIVE D'ENVOI VERS MAKE.COM (PRIORITAIRE)
    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
    let makeSuccess = false;
    
    if (MAKE_WEBHOOK_URL) {
      makeSuccess = await sendToMakeWebhook({
        ...data,
        response_text: sanitizedText,
        message_source: extractedSource,
        user_email: extractedEmail
      }, MAKE_WEBHOOK_URL);
    }

    // ✅ FALLBACK VERS GOOGLE APPS SCRIPT
    let gasSuccess = false;
    const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    const HORMUR_API_KEY = process.env.HORMUR_API_KEY;
    
    if (GOOGLE_APPS_SCRIPT_URL && HORMUR_API_KEY) {
      gasSuccess = await sendToGoogleAppsScript({
        ...data,
        response_text: sanitizedText,
        message_source: extractedSource,
        user_email: extractedEmail
      }, GOOGLE_APPS_SCRIPT_URL, HORMUR_API_KEY);
    }

    // ✅ RÉPONSE SELON LE SUCCÈS
    if (makeSuccess || gasSuccess) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Réponse envoyée avec succès',
          routes: {
            make_com: makeSuccess,
            google_apps_script: gasSuccess
          },
          data: {
            message_id: data.message_id,
            sent_by: data.sent_by,
            message_source: extractedSource,
            text_length: sanitizedText?.length || 0
          },
          timestamp: new Date().toISOString()
        })
      };
    } else {
      // ✅ AUCUNE ROUTE N'A FONCTIONNÉ - MAIS ON NE FAIL PAS
      console.error('⚠️ Aucune route disponible, mais réponse OK pour éviter les erreurs');
      return {
        statusCode: 200, // 200 pour éviter les retry infinis
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Configuration manquante mais requête traitée',
          error: 'Aucune route disponible (Make.com ou Google Apps Script)',
          data: {
            message_id: data.message_id,
            sent_by: data.sent_by
          },
          timestamp: new Date().toISOString()
        })
      };
    }

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE (mais récupérée):', error);
    
    // ✅ MÊME EN CAS D'ERREUR CRITIQUE, ON RÉPOND 200
    return {
      statusCode: 200, // 200 pour éviter les retry
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: false,
        error: 'Erreur interne traitée',
        message: 'La requête a été reçue mais n\'a pas pu être traitée complètement',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur',
        data: {
          message_id: data?.message_id || 'unknown',
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};

// ✅ FONCTION DE SANITISATION ULTRA-ROBUSTE
function sanitizeTextForWebhook(text) {
  if (!text) return '';
  
  try {
    let sanitized = String(text);
    
    // Limiter la taille (10MB max)
    if (sanitized.length > 10000000) {
      sanitized = sanitized.substring(0, 9999900) + '\n[... texte tronqué pour éviter les limites ...]';
      console.warn('⚠️ Texte tronqué, taille originale:', text.length);
    }
    
    // Échapper les caractères JSON dangereux
    sanitized = sanitized
      .replace(/\\/g, '\\\\')     // Échapper les backslashes d'abord
      .replace(/"/g, '\\"')       // Échapper les guillemets
      .replace(/\r\n/g, '\\n')    // Normaliser CRLF
      .replace(/\r/g, '\\n')      // Normaliser CR
      .replace(/\n/g, '\\n')      // Normaliser LF
      .replace(/\t/g, '\\t')      // Normaliser les tabs
      .replace(/\f/g, '\\f')      // Échapper form feed
      .replace(/\b/g, '\\b')      // Échapper backspace
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Supprimer caractères de contrôle
    
    return sanitized;
  } catch (sanitizeError) {
    console.error('❌ Erreur sanitisation:', sanitizeError);
    return 'Erreur: texte non traitable';
  }
}

// ✅ EXTRACTION ROBUSTE DE LA SOURCE
function extractMessageSource(data) {
  try {
    if (data?.visitor?.source) return data.visitor.source;
    if (data?.message_source) return data.message_source;
    if (data?.routing_method === 'email_reply') return 'email';
    if (data?.routing_method === 'brevo_via_makecom') return 'widget';
    if (data?.messages?.[0]?.receivedFrom) return data.messages[0].receivedFrom;
    return 'unknown';
  } catch (error) {
    console.error('❌ Erreur extraction source:', error);
    return 'unknown';
  }
}

// ✅ EXTRACTION ROBUSTE DE L'EMAIL
function extractUserEmail(data) {
  try {
    // Essayer différentes sources
    const sources = [
      data?.user_email,
      data?.visitor?.contactAttributes?.EMAIL,
      data?.visitor?.attributes?.EMAIL,
      data?.visitor?.integrationAttributes?.EMAIL,
      data?.messages?.[0]?.from?.email,
      data?.messages?.[0]?.to?.[0]?.email
    ];
    
    for (const email of sources) {
      if (email && isValidEmail(email)) {
        return email;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur extraction email:', error);
    return null;
  }
}

// ✅ VALIDATION EMAIL SIMPLE
function isValidEmail(email) {
  try {
    return typeof email === 'string' && 
           email.includes('@') && 
           email.includes('.') && 
           email.length > 5 && 
           email.length < 320;
  } catch (error) {
    return false;
  }
}

// ✅ ENVOI VERS MAKE.COM ULTRA-ROBUSTE
async function sendToMakeWebhook(data, webhookUrl) {
  try {
    console.log('📤 Tentative envoi Make.com...');
    
    const payload = {
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      visitor_id: data.visitor_id,
      has_visitor_id: !!data.visitor_id,
      use_brevo_direct: true,
      routing_method: data.routing_method || 'brevo_via_makecom',
      message_source: data.message_source,
      user_email: data.user_email,
      timestamp: new Date().toISOString(),
      source: "hormur_frontend"
    };

    // Validation du payload
    const payloadString = JSON.stringify([payload]);
    if (payloadString.length > 50000000) { // 50MB limite
      throw new Error('Payload trop volumineux pour Make.com');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Hormur-Webhook/2.0'
      },
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ Make.com: succès');
      return true;
    } else {
      console.error('❌ Make.com error:', response.status, response.statusText);
      return false;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Make.com timeout');
    } else {
      console.error('❌ Make.com error:', error.message);
    }
    return false;
  }
}

// ✅ ENVOI VERS GOOGLE APPS SCRIPT ULTRA-ROBUSTE
async function sendToGoogleAppsScript(data, gasUrl, apiKey) {
  try {
    console.log('📤 Tentative envoi Google Apps Script...');
    
    const gasPayload = {
      action: 'send_response',
      message_id: data.message_id,
      response_text: data.response_text,
      sent_by: data.sent_by,
      message_source: data.message_source,
      user_email: data.user_email,
      timestamp: new Date().toISOString(),
      api_key: apiKey
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'User-Agent': 'Hormur-Support/2.0'
      },
      body: JSON.stringify(gasPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ Google Apps Script: succès');
        return true;
      } else {
        console.error('❌ Google Apps Script: échec logique', result);
        return false;
      }
    } else {
      console.error('❌ Google Apps Script error:', response.status);
      return false;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Google Apps Script timeout');
    } else {
      console.error('❌ Google Apps Script error:', error.message);
    }
    return false;
  }
}
