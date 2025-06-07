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
    
    console.log('=== SPAM BLOCKED ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Spam score:', data.spam_score);
    console.log('Spam indicators:', data.spam_indicators);
    console.log('Channel:', data.channel);
    console.log('===================');
    
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Spam bloqué et loggé',
        timestamp: new Date().toISOString(),
        data: {
          message_id: data.message_id || 'unknown',
          from: data.from_email,
          subject: data.subject,
          spam_score: data.spam_score,
          spam_indicators: data.spam_indicators,
          channel: data.channel,
          status: 'blocked_as_spam',
          blocked_at: new Date().toISOString()
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
