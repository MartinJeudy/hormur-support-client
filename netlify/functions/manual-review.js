exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    console.log('=== MANUAL REVIEW MESSAGE ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Category:', data.category);
    console.log('Confidence:', data.confidence);
    console.log('Escalation Reason:', data.escalation_reason);
    console.log('==============================');
    
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Message reçu pour validation manuelle',
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id || 'unknown',
          from: data.from_email,
          subject: data.subject,
          category: data.category,
          confidence: data.confidence,
          status: 'pending_manual_review'
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Invalid JSON or server error',
        details: error.message 
      })
    };
  }
};
