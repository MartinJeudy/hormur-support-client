// Fonction de debug à ajouter temporairement dans get_messages_datastore.js
// POUR DEBUG UNIQUEMENT - À SUPPRIMER APRÈS

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // 🔍 DEBUG: Vérifier les variables d'environnement
  console.log('=== DEBUG VARIABLES D\'ENVIRONNEMENT ===');
  console.log('GOOGLE_APPS_SCRIPT_URL:', process.env.GOOGLE_APPS_SCRIPT_URL);
  console.log('HORMUR_API_KEY:', process.env.HORMUR_API_KEY ? 'CONFIGURÉ ✅' : 'MANQUANT ❌');
  
  // Si variables manquantes, arrêter ici
  if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'GOOGLE_APPS_SCRIPT_URL non configuré',
        debug: {
          allEnvVars: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('HORMUR'))
        }
      })
    };
  }

  if (!process.env.HORMUR_API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'HORMUR_API_KEY non configuré',
        debug: {
          gasUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
          allEnvVars: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('HORMUR'))
        }
      })
    };
  }

  // Test simple de l'URL Google Apps Script
  try {
    const testPayload = {
      action: 'get',
      api_key: process.env.HORMUR_API_KEY,
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Test URL Google Apps Script...');
    console.log('URL:', process.env.GOOGLE_APPS_SCRIPT_URL);

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.HORMUR_API_KEY
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Status:', response.status);
    console.log('Headers:', response.headers);

    const responseText = await response.text();
    console.log('Response preview:', responseText.substring(0, 200));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debug: true,
        gasUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
        apiKeyConfigured: !!process.env.HORMUR_API_KEY,
        testResponse: {
          status: response.status,
          ok: response.ok,
          responsePreview: responseText.substring(0, 200),
          isHtml: responseText.includes('<!DOCTYPE html>')
        }
      })
    };

  } catch (error) {
    console.error('💥 Erreur test:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erreur test Google Apps Script',
        details: error.message,
        gasUrl: process.env.GOOGLE_APPS_SCRIPT_URL
      })
    };
  }
};
