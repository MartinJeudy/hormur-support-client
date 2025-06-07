exports.handler = async (event, context) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Récupération des paramètres (query string pour GET, body pour POST)
    let filters = {};
    let userAuth = {};
    
    if (event.httpMethod === 'GET') {
      filters = event.queryStringParameters || {};
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      filters = body.filters || {};
      userAuth = body.auth || {};
    }

    console.log('=== RÉCUPÉRATION MESSAGES HORMUR ===');
    console.log('Method:', event.httpMethod);
    console.log('Filters:', filters);
    console.log('User auth:', userAuth.email ? `${userAuth.email.substring(0, 10)}...` : 'non fourni');
    console.log('====================================');

    // URL webhook Make.com pour récupérer les messages Hormur
    const MAKE_GET_MESSAGES_WEBHOOK = process.env.MAKE_GET_MESSAGES_WEBHOOK || process.env.NETLIFY_HORMUR_GET_WEBHOOK;

    // Données de démonstration Hormur enrichies
    let demoMessages = [
      {
        id: Date.now(),
        from: 'artiste.piano@gmail.com',
        subject: 'Question SACEM pour concert privé chez particulier',
        content: 'Bonjour, je donne un concert de piano classique chez un particulier pour 18 personnes le 20 juin. Comment gérez-vous la déclaration SACEM ? Est-ce automatique ? Le montant est-il déduit de mes recettes ?',
        receivedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'auto-sent',
        category: 'artiste',
        priority: 'medium',
        confidence: 96,
        spamScore: 3,
        assignedTo: 'eleonore',
        aiClassification: 'Question SACEM standard - processus automatisé Hormur',
        aiResponse: 'Salut !\n\nExcellente question ! Hormur automatise complètement la gestion SACEM pour toi :\n\n✅ **Déclaration automatique** si ton répertoire nécessite la SACEM\n✅ **Calcul automatique** : 34€ minimum OU 10% des recettes (le plus élevé)\n✅ **Déduction directe** de tes recettes avant virement\n\nPour ton concert piano 18 personnes :\n- Si recettes < 340€ → 34€ déduits\n- Si recettes > 340€ → 10% déduits\n\nTu n\'as rien à faire, tout est géré automatiquement !\n\nÀ bientôt sur scène !\n\nÉléonore\nResponsable Relations Artistes\nHormur',
        urls: ['https://hormur.com/sacem-info'],
        conversationHistory: [],
        brevoContactId: 'contact_123',
        channel: 'email'
      },
      {
        id: Date.now() + 1,
        from: 'nouveau.lieu@outlook.fr',
        subject: 'Inscription lieu - questions assurance et fréquence événements',
        content: 'Bonjour, je souhaite proposer mon appartement (salon 35m² + terrasse) pour des événements artistiques. J\'ai des questions sur l\'assurance en cas de dégâts et sur la fréquence - combien d\'événements par mois maximum ?',
        receivedAt: new Date(Date.now() - 1800000).toISOString().slice(0, 16).replace('T', ' '),
        status: 'manual-review',
        category: 'hote',
        priority: 'high',
        confidence: 88,
        spamScore: 5,
        assignedTo: 'martin',
        aiClassification: 'Inscription hôte + questions assurance - validation requise',
        aiResponse: 'Bonjour !\n\nC\'est formidable que vous souhaitiez rejoindre notre communauté d\'hôtes ! Votre appartement avec salon et terrasse semble parfait.\n\n**Assurance :** Excellente nouvelle ! Tous les événements Hormur sont automatiquement couverts par notre partenariat Beloy x Hiscox :\n- Jusqu\'à 1 000 000 € pour dommages corporels/matériels\n- Aucune démarche de votre part\n\n**Fréquence :** Aucune restriction ! C\'est entièrement selon vos envies. Certains hôtes accueillent chaque semaine, d\'autres une fois par mois.\n\nPlus d\'infos : https://webviews.beloy.com/hormur/hormur.html\nInscription : https://hormur.com/place/new\n\nMartin\nResponsable Partenariats Lieux\nHormur',
        needsHumanReview: true,
        escalationReason: 'Questions assurance spécifiques nécessitant validation experte',
        urls: ['https://webviews.beloy.com/hormur/hormur.html', 'https://hormur.com/place/new'],
        conversationHistory: [],
        brevoContactId: 'contact_124',
        channel: 'email'
      },
      {
        id: Date.now() + 2,
        from: 'spam.crypto@tempmail.com',
        subject: 'URGENT: Gagnez des Bitcoin maintenant!!!',
        content: 'Félicitations! Vous avez gagné 5 Bitcoin GRATUITS! Cliquez immédiatement: http://suspicious-crypto-link.com',
        receivedAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16).replace('T', ' '),
        status: 'spam',
        category: 'spam',
        priority: 'low',
        confidence: 0,
        spamScore: 97,
        spamIndicators: ['Urgence artificielle', 'Crypto/Bitcoin', 'Domaine temporaire', 'Lien suspect', 'Majuscules excessives'],
        aiClassification: 'SPAM évident - filtrage automatique',
        conversationHistory: [],
        brevoContactId: null,
        channel: 'email'
      },
      {
        id: Date.now() + 3,
        from: 'spectateur.nantes@gmail.com',
        subject: 'Pas d\'événements à Nantes - développement Loire-Atlantique ?',
        content: 'Bonjour, je suis à Nantes et j\'aimerais vraiment découvrir des événements Hormur mais je ne vois rien dans ma région. Hormur se développe-t-il en Loire-Atlantique ? Comment être informé dès qu\'un événement se crée près de chez moi ?',
        receivedAt: new Date(Date.now() - 7200000).toISOString().slice(0, 16).replace('T', ' '),
        status: 'auto-sent',
        category: 'spectateur',
        priority: 'medium',
        confidence: 94,
        spamScore: 2,
        assignedTo: 'auto',
        aiClassification: 'Demande expansion géographique - réponse standard',
        aiResponse: 'Bonjour !\n\nMerci pour votre intérêt pour Hormur ! Nous développons progressivement l\'offre partout en France, Nantes inclus.\n\nPour être informé dès qu\'un événement se crée près de chez vous :\n1. Remplissez vos préférences : https://hormur-preferences-public.netlify.app/\n2. Vous recevrez les nouvelles propositions par email\n\nNous encourageons aussi les artistes et lieux nantais à nous rejoindre pour enrichir l\'offre locale !\n\nCordialement,\nL\'équipe Hormur',
        urls: ['https://hormur-preferences-public.netlify.app/'],
        conversationHistory: [],
        brevoContactId: 'contact_125',
        channel: 'email'
      },
      {
        id: Date.now() + 4,
        from: 'artiste.theatre@hotmail.fr',
        subject: 'Spectacle théâtre intimiste - contraintes techniques et lieux adaptés',
        content: 'Bonjour, je suis comédienne et je prépare un spectacle de théâtre contemporain intimiste pour 15-25 personnes. Quelles contraintes techniques puis-je demander aux hôtes ? Éclairage, espace scénique minimum, acoustique... Comment trouver des lieux adaptés ?',
        receivedAt: new Date(Date.now() - 10800000).toISOString().slice(0, 16).replace('T', ' '),
        status: 'manual-review',
        category: 'artiste',
        priority: 'medium',
        confidence: 91,
        spamScore: 4,
        assignedTo: 'eleonore',
        aiClassification: 'Demande création projet théâtre - besoins techniques spécifiques',
        aiResponse: 'Bonjour !\n\nTon projet de théâtre intimiste sonne passionnant ! Hormur a plusieurs lieux parfaits pour ce type d\'expérience.\n\n**Contraintes techniques possibles :**\n- Espace scénique minimum (ex: 3x3m)\n- Éclairage d\'appoint ou spots\n- Acoustique naturelle ou sonorisation simple\n- Accès électrique pour matériel\n- Configuration modulable\n\n**Pour créer ton projet :**\n1. https://hormur.com/projet/new\n2. Décris précisément tes besoins techniques\n3. Nos hôtes avec espaces adaptés te feront des propositions\n\nConsulte aussi notre FAQ : https://vivacious-phosphorus-9a9.notion.site/FAQ-pour-les-artistes-sur-Hormur-18f3052419ea80ce8d1ac4618dc25699\n\nÀ bientôt sur scène !\n\nÉléonore\nResponsable Relations Artistes\nHormur',
        needsHumanReview: true,
        escalationReason: 'Besoins techniques spécifiques nécessitant expertise théâtrale',
        urls: ['https://hormur.com/projet/new', 'https://vivacious-phosphorus-9a9.notion.site/FAQ-pour-les-artistes-sur-Hormur-18f3052419ea80ce8d1ac4618dc25699'],
        conversationHistory: [],
        brevoContactId: 'contact_126',
        channel: 'instagram'
      },
      {
        id: Date.now() + 5,
        from: 'contact@ehpad-soleil.fr',
        subject: 'Partenariat EHPAD - événements culturels pour résidents',
        content: 'Bonjour, nous sommes l\'EHPAD Les Jardins du Soleil à Lyon (120 résidents). Nous aimerions proposer des événements culturels réguliers à nos résidents (concerts adaptés, ateliers, lectures). Comment établir un partenariat avec Hormur ? Y a-t-il une tarification spéciale pour les établissements ?',
        receivedAt: new Date(Date.now() - 14400000).toISOString().slice(0, 16).replace('T', ' '),
        status: 'manual-review',
        category: 'partenariat',
        priority: 'high',
        confidence: 92,
        spamScore: 1,
        assignedTo: 'martin',
        aiClassification: 'Demande partenariat institutionnel B2B - opportunité commerciale',
        aiResponse: 'Bonjour,\n\nNous serions ravis de développer un partenariat avec votre EHPAD ! Les événements culturels apportent beaucoup aux résidents.\n\n**Hormur propose :**\n- Concerts adaptés au public senior\n- Ateliers créatifs et participatifs\n- Lectures et spectacles intimistes\n- Tarification préférentielle pour établissements\n\n**Pour établir un partenariat :**\n1. Inscrivez votre EHPAD : https://hormur.com/place/new\n2. Précisez vos contraintes (horaires, accessibilité, résidents)\n3. Choisissez événements publics ou privés\n\nSouhaitez-vous un rendez-vous téléphonique pour discuter spécifiquement de vos besoins ?\n\nCordialement,\n\nMartin\nResponsable Partenariats Lieux\nHormur',
        needsHumanReview: true,
        escalationReason: 'Opportunité commerciale B2B importante - qualification nécessaire',
        urls: ['https://hormur.com/place/new'],
        conversationHistory: [],
        brevoContactId: 'contact_127',
        channel: 'email'
      }
    ];

    // Tentative de récupération via Make.com si configuré
    if (MAKE_GET_MESSAGES_WEBHOOK) {
      try {
        console.log('Tentative récupération via Make.com...');
        
        const makePayload = {
          filters,
          timestamp: new Date().toISOString(),
          user_auth: userAuth,
          platform: 'Hormur',
          request_id: `hormur_${Date.now()}`
        };

        const makeResponse = await fetch(MAKE_GET_MESSAGES_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hormur-Support-App/2.0',
            'X-Hormur-Source': 'netlify-function'
          },
          body: JSON.stringify(makePayload),
          timeout: 10000 // 10 secondes timeout
        });

        if (makeResponse.ok) {
          const makeData = await makeResponse.json();
          console.log('✅ Messages récupérés via Make.com');
          
          // Formatage des données Make.com pour Hormur
          let messages = makeData.data || makeData.messages || makeData;
          if (!Array.isArray(messages)) {
            messages = [messages];
          }
          
          return {
            statusCode: 200,
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              success: true,
              source: 'make_com_brevo',
              messages: messages,
              total: messages.length,
              timestamp: new Date().toISOString(),
              filters_applied: filters,
              platform: 'Hormur',
              data_source: 'live'
            })
          };
        } else {
          console.log('Make.com indisponible, utilisation des données de démo');
        }
      } catch (makeError) {
        console.log('Erreur Make.com, fallback vers démo:', makeError.message);
      }
    } else {
      console.log('Webhook Make.com non configuré, utilisation des données de démo');
    }

    // Application des filtres sur les données de démo Hormur
    let filteredMessages = [...demoMessages];

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      filteredMessages = filteredMessages.filter(msg => msg.status === filters.status);
    }
    
    // Filtre par catégorie Hormur
    if (filters.category && filters.category !== 'all') {
      filteredMessages = filteredMessages.filter(msg => msg.category === filters.category);
    }
    
    // Filtre par priorité
    if (filters.priority && filters.priority !== 'all') {
      filteredMessages = filteredMessages.filter(msg => msg.priority === filters.priority);
    }

    // Filtre par assignation (Eléonore/Martin)
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      filteredMessages = filteredMessages.filter(msg => msg.assignedTo === filters.assignedTo);
    }

    // Filtre par recherche textuelle
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredMessages = filteredMessages.filter(msg => 
        msg.from.toLowerCase().includes(searchTerm) ||
        msg.subject.toLowerCase().includes(searchTerm) ||
        msg.content.toLowerCase().includes(searchTerm) ||
        (msg.aiClassification && msg.aiClassification.toLowerCase().includes(searchTerm))
      );
    }

    // Filtre par canal (email, instagram, messenger)
    if (filters.channel && filters.channel !== 'all') {
      filteredMessages = filteredMessages.filter(msg => msg.channel === filters.channel);
    }

    // Tri par priorité et date
    filteredMessages.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.receivedAt) - new Date(a.receivedAt);
    });

    // Limite le nombre de résultats
    const limit = parseInt(filters.limit) || 50;
    filteredMessages = filteredMessages.slice(0, limit);

    // Statistiques pour le dashboard Hormur
    const stats = {
      total: demoMessages.length,
      filtered: filteredMessages.length,
      by_status: {
        'auto-sent': demoMessages.filter(m => m.status === 'auto-sent').length,
        'manual-review': demoMessages.filter(m => m.status === 'manual-review').length,
        'pending': demoMessages.filter(m => m.status === 'pending').length,
        'spam': demoMessages.filter(m => m.status === 'spam').length,
        'sent': demoMessages.filter(m => m.status === 'sent').length
      },
      by_category: {
        'artiste': demoMessages.filter(m => m.category === 'artiste').length,
        'hote': demoMessages.filter(m => m.category === 'hote').length,
        'spectateur': demoMessages.filter(m => m.category === 'spectateur').length,
        'partenariat': demoMessages.filter(m => m.category === 'partenariat').length,
        'spam': demoMessages.filter(m => m.category === 'spam').length
      },
      by_priority: {
        'high': demoMessages.filter(m => m.priority === 'high').length,
        'medium': demoMessages.filter(m => m.priority === 'medium').length,
        'low': demoMessages.filter(m => m.priority === 'low').length
      },
      avg_confidence: Math.round(
        demoMessages.filter(m => m.confidence).reduce((sum, m) => sum + m.confidence, 0) / 
        demoMessages.filter(m => m.confidence).length || 0
      )
    };

    console.log('✅ Messages Hormur filtrés:', {
      total: filteredMessages.length,
      filters: filters,
      stats: stats
    });

    return {
      statusCode: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        source: 'demo_data_hormur',
        messages: filteredMessages,
        total: filteredMessages.length,
        timestamp: new Date().toISOString(),
        filters_applied: filters,
        platform: 'Hormur',
        
        // Statistiques enrichies
        stats: stats,
        
        // Métadonnées
        metadata: {
          data_source: 'demo',
          last_updated: new Date().toISOString(),
          version: '2.0',
          environment: process.env.NODE_ENV || 'development'
        },
        
        // Instructions
        note: 'Données de démonstration Hormur - En production, les vraies données viendraient de Make.com/Brevo',
        production_setup: {
          required_env_vars: ['MAKE_GET_MESSAGES_WEBHOOK'],
          workflow: 'Brevo → Make.com → Cette fonction → Interface Hormur'
        }
      })
    };

  } catch (error) {
    console.error('ERREUR CRITIQUE get-messages Hormur:', {
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
        error: 'Erreur serveur interne Hormur',
        details: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Hormur',
        function: 'get-messages',
        troubleshooting: {
          check_logs: 'Consultez les logs Netlify Functions',
          check_env_vars: 'Vérifiez MAKE_GET_MESSAGES_WEBHOOK',
          check_make_scenario: 'Vérifiez le scénario Make.com de récupération',
          check_brevo_connection: 'Vérifiez la connexion Brevo'
        }
      })
    };
  }
};