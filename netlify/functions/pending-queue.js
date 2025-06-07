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
    
    console.log('=== PENDING QUEUE MESSAGE ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Classification:', data.classification);
    console.log('Clarification needed:', data.clarification_needed);
    console.log('Priority:', data.priority || 'normal');
    console.log('=============================');
    
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Message mis en file d\'attente',
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id || 'unknown',
          from: data.from_email,
          subject: data.subject,
          classification: data.classification,
          clarification_needed: data.clarification_needed,
          priority: data.priority || 'normal',
          status: 'queued',
          queued_at: new Date().toISOString()
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
