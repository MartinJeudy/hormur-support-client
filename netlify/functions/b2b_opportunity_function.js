exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
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
    
    console.log('=== OPPORTUNITÉ B2B HORMUR ===');
    console.log('From:', data.from_email);
    console.log('Subject:', data.subject);
    console.log('Opportunity type:', data.opportunity_type);
    console.log('Estimated value:', data.estimated_value);
    console.log('Business indicators:', data.business_indicators);
    console.log('============================');

    // Validation des données B2B
    if (!data.from_email || !data.subject || !data.original_message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Données manquantes pour opportunité B2B',
          required: ['from_email', 'subject', 'original_message']
        })
      };
    }

    // Données d'opportunité B2B pour Hormur
    const b2bOpportunityData = {
      // Identification
      opportunity_id: `b2b_${Date.now()}`,
      message_id: data.message_id || `opp_${Date.now()}`,
      original_message_id: data.original_message_id,
      
      // Classification B2B
      classification: 'B2B_OPPORTUNITY',
      opportunity_type: data.opportunity_type || 'abonnement', // abonnement, partenariat, accompagnement
      category: data.category || 'entreprise', // entreprise, institution, collectivite, reseau
      
      // Contenu de l'opportunité
      from_email: data.from_email,
      subject: data.subject,
      original_message: data.original_message,
      
      // Évaluation commerciale
      estimated_value: data.estimated_value || 'medium', // high, medium
      revenue_potential: data.revenue_potential || 'unknown',
      business_indicators: data.business_indicators || [],
      
      // Réponse commerciale
      response: data.response || generateB2BResponse(data.category, data.opportunity_type),
      signature_type: data.signature_type || 'martin',
      
      // Qualification
      company_size: data.company_size || 'unknown',
      industry: data.industry || 'unknown',
      budget_mentioned: data.budget_mentioned || false,
      recurring_need: data.recurring_need || false,
      decision_maker: data.decision_maker || 'unknown',
      
      // Actions commerciales
      assign_to_sales: true,
      sales_priority: data.estimated_value === 'high' ? 'urgent' : 'normal',
      follow_up_delay: data.estimated_value === 'high' ? '24h' : '72h',
      meeting_suggested: true,
      
      // Métriques IA
      confidence: data.confidence || 92,
      processing_priority: data.estimated_value === 'high' ? 'high' : 'medium',
      
      // Timestamps
      created_at: new Date().toISOString(),
      detected_at: new Date().toISOString(),
      follow_up_deadline: new Date(Date.now() + (data.estimated_value === 'high' ? 24 : 72) * 60 * 60 * 1000).toISOString(),
      
      // Status tracking
      status: 'identified',
      qualified: false,
      sales_contacted: false,
      meeting_scheduled: false,
      
      // Équipe Hormur
      platform: 'Hormur',
      assigned_to: 'martin', // Responsable Partenariats
      sales_stage: 'lead',
      priority_level: data.estimated_value === 'high' ? 'high' : 'medium'
    };

    // TODO: Ici, intégrer avec Make.com pour :
    // 1. Créer une opportunité dans le CRM
    // 2. Assigner au commercial approprié
    // 3. Programmer un suivi automatique
    // 4. Notifier l'équipe commerciale

    // Webhook Make.com pour opportunités B2B (à configurer)
    const MAKE_B2B_WEBHOOK = process.env.MAKE_B2B_OPPORTUNITY_WEBHOOK;
    
    if (MAKE_B2B_WEBHOOK) {
      try {
        const makeResponse = await fetch(MAKE_B2B_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hormur-B2B-System/1.0'
          },
          body: JSON.stringify(b2bOpportunityData)
        });

        if (makeResponse.ok) {
          console.log('✅ Opportunité B2B transmise à Make.com');
        } else {
          console.error('❌ Erreur transmission B2B Make.com:', makeResponse.status);
        }
      } catch (error) {
        console.error('❌ Erreur webhook B2B Make.com:', error.message);
      }
    }

    console.log('💼 OPPORTUNITÉ B2B IDENTIFIÉE - Assignation commerciale en cours');

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Opportunité B2B identifiée et assignée à l\'équipe commerciale',
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        
        data: {
          opportunity_id: b2bOpportunityData.opportunity_id,
          message_id: b2bOpportunityData.message_id,
          opportunity_type: b2bOpportunityData.opportunity_type,
          estimated_value: b2bOpportunityData.estimated_value,
          
          // Statut commercial
          status: 'identified',
          sales_priority: b2bOpportunityData.sales_priority,
          assigned_to: 'martin',
          follow_up_deadline: b2bOpportunityData.follow_up_deadline,
          
          // Actions commerciales
          meeting_suggested: true,
          crm_integration: 'pending',
          sales_notification: 'sent'
        },
        
        // Qualification automatique
        qualification: {
          estimated_value: b2bOpportunityData.estimated_value,
          business_indicators: b2bOpportunityData.business_indicators,
          priority_score: calculatePriorityScore(b2bOpportunityData),
          recommended_actions: getRecommendedActions(b2bOpportunityData)
        },
        
        // Actions commerciales suggérées
        sales_actions: {
          immediate: [
            'Répondre avec proposition de RDV',
            'Qualifier le budget et timeline',
            'Identifier le processus de décision'
          ],
          follow_up: [
            'Préparer présentation sur-mesure',
            'Identifier contact décisionnaire',
            'Proposer période d\'essai'
          ]
        },
        
        // Métriques pour le commercial
        metrics: {
          confidence_score: b2bOpportunityData.confidence,
          estimated_monthly_value: estimateMonthlyValue(b2bOpportunityData),
          conversion_probability: calculateConversionProbability(b2bOpportunityData)
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE opportunité B2B Hormur:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Erreur système - opportunité B2B',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'b2b-opportunity'
      })
    };
  }
};

// Fonctions utilitaires pour la qualification B2B
function generateB2BResponse(category, opportunityType) {
  const responses = {
    entreprise: 'Bonjour,\n\nVotre projet corporate semble parfaitement aligné avec notre vision !\n\nNous proposons des accompagnements sur-mesure pour les entreprises souhaitant enrichir leur offre culturelle.\n\nPuis-je vous proposer un rendez-vous cette semaine pour vous présenter nos solutions dédiées ?\n\nMartin\nResponsable Partenariats Lieux\nHormur',
    institution: 'Bonjour,\n\nNous serions ravis de développer un partenariat avec votre institution !\n\nHormur accompagne déjà plusieurs établissements dans leurs programmations culturelles.\n\nJe vous propose un échange pour comprendre vos besoins spécifiques et vous présenter notre offre institutionnelle.\n\nMartin\nResponsable Partenariats Lieux\nHormur',
    collectivite: 'Bonjour,\n\nExcellente initiative de votre collectivité !\n\nNous avons l\'expérience des partenariats publics et pouvons vous accompagner dans vos projets culturels territoriaux.\n\nSouhaitez-vous que nous échangions sur vos objectifs et notre offre dédiée collectivités ?\n\nMartin\nResponsable Partenariats Lieux\nHormur'
  };
  return responses[category] || responses.entreprise;
}

function calculatePriorityScore(data) {
  let score = 50; // Base score
  
  if (data.estimated_value === 'high') score += 30;
  if (data.budget_mentioned) score += 20;
  if (data.recurring_need) score += 15;
  if (data.business_indicators?.length > 2) score += 10;
  
  return Math.min(score, 100);
}

function getRecommendedActions(data) {
  const actions = ['Réponse personnalisée immédiate'];
  
  if (data.estimated_value === 'high') {
    actions.push('RDV prioritaire sous 24h');
    actions.push('Préparation présentation sur-mesure');
  }
  
  if (data.recurring_need) {
    actions.push('Proposition d\'abonnement');
  }
  
  return actions;
}

function estimateMonthlyValue(data) {
  const indicators = data.business_indicators || [];
  
  // Extraction simple de budget mentionné
  for (const indicator of indicators) {
    const match = indicator.match(/(\d+)k?\s*€/i);
    if (match) {
      return parseInt(match[1]) * (indicator.includes('k') ? 1000 : 1);
    }
  }
  
  // Estimation basée sur le type et la valeur
  const estimates = {
    high: { entreprise: 5000, institution: 8000, collectivite: 3000 },
    medium: { entreprise: 2000, institution: 3000, collectivite: 1500 }
  };
  
  return estimates[data.estimated_value]?.[data.category] || 1000;
}

function calculateConversionProbability(data) {
  let probability = 30; // Base 30%
  
  if (data.estimated_value === 'high') probability += 20;
  if (data.budget_mentioned) probability += 15;
  if (data.decision_maker === 'identified') probability += 10;
  if (data.recurring_need) probability += 10;
  
  return Math.min(probability, 85);
}