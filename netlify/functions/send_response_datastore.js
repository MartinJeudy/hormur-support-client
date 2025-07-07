// ===== FONCTION SENDRESPONSE FINALE - VIA MAKE.COM UNIQUEMENT =====

async function sendResponse(messageId, responseText, sentBy) {
    if (!messageId || !responseText || !sentBy) {
        showToast('Données manquantes pour l\'envoi', 'error');
        return;
    }
    
    try {
        showToast('Envoi en cours...', 'info');
        
        // Trouver le message dans allMessages
        const message = allMessages.find(m => m.id === messageId);
        console.log('📧 Message trouvé pour envoi:', message);
        
        // RECHERCHE VISITOR_ID - ORDRE DE PRIORITÉ
        let visitorId = null;
        if (message) {
            visitorId = message.id_visitor ||          // Structure réelle (colonne V)
                       message.visitorId ||           // Version transformée
                       message.visitor_id ||          // Version standard  
                       message.brevoVisitorId ||      // Version Brevo
                       message.conversationId ||      // Conversation ID
                       message.conversation_id;       // Variation
            
            console.log('🔍 Recherche visitor_id dans message:');
            console.log('  - id_visitor (RÉEL):', message.id_visitor);
            console.log('  - visitorId:', message.visitorId);
            console.log('  - visitor_id:', message.visitor_id);
            console.log('🆔 Visitor ID final sélectionné:', visitorId);
        } else {
            console.error('❌ Message non trouvé dans allMessages pour ID:', messageId);
        }
        
        // VALIDATION VISITOR_ID
        const isValidVisitorId = visitorId && 
                                typeof visitorId === 'string' &&
                                visitorId.length >= 20 &&
                                !visitorId.includes('undefined') &&
                                !visitorId.includes('email') &&
                                !visitorId.includes('null') &&
                                visitorId.trim() !== '';
        
        console.log('✅ Validation visitor ID:');
        console.log('  - Présent:', !!visitorId);
        console.log('  - Type:', typeof visitorId);
        console.log('  - Longueur:', visitorId?.length || 0);
        console.log('  - Valide:', isValidVisitorId);
        
        // PRÉPARATION PAYLOAD POUR MAKE.COM
        const makePayload = {
            message_id: messageId,
            response_text: responseText,
            sent_by: sentBy,
            
            // 🎯 NOUVELLES DONNÉES POUR MAKE.COM
            visitor_id: visitorId || null,
            has_visitor_id: isValidVisitorId,
            use_brevo_direct: isValidVisitorId, // Flag pour que Make.com utilise Brevo si possible
            
            // Métadonnées
            routing_method: isValidVisitorId ? 'brevo_via_makecom' : 'standard_makecom',
            timestamp: new Date().toISOString(),
            source: 'hormur_frontend'
        };
        
        console.log('🚀 ENVOI VIA MAKE.COM UNIQUEMENT');
        console.log('📤 Payload Make.com:', makePayload);
        
        // APPEL DIRECT AU WEBHOOK MAKE.COM
        const result = await apiCall(API_CONFIG.endpoints.sendResponse, 'POST', makePayload);
        
        if (result && (result.success || result.status === 'success')) {
            // Mettre à jour localement
            const messageIndex = allMessages.findIndex(m => m.id == messageId);
            if (messageIndex !== -1) {
                allMessages[messageIndex].status = 'sent';
                allMessages[messageIndex].finalResponse = responseText;
                allMessages[messageIndex].sentBy = sentBy;
                allMessages[messageIndex].sentAt = new Date().toISOString();
            }
            
            updateStats();
            renderCurrentTab();
            showToast('✅ Réponse envoyée avec succès !', 'success');
            closeMessageModal();
            
            // Log de succès
            console.log('🎉 ENVOI RÉUSSI VIA MAKE.COM:', {
                method: isValidVisitorId ? 'brevo_via_makecom' : 'standard_makecom',
                message_id: messageId,
                visitor_id: visitorId,
                sent_by: sentBy,
                webhook_used: 'eq7ftu6vgz6p84n2qe72i5skba6u5kwm'
            });
            
        } else {
            throw new Error(result?.error || 'Erreur inconnue lors de l\'envoi');
        }
        
    } catch (error) {
        console.error('❌ ERREUR ENVOI COMPLÈTE:', error);
        showToast('❌ Erreur lors de l\'envoi: ' + error.message, 'error');
        
        // DEBUG COMPLET pour troubleshooting
        console.error('🔍 DEBUG ERREUR ENVOI COMPLET:', {
            messageId,
            messageFound: !!allMessages.find(m => m.id === messageId),
            responseLength: responseText?.length,
            sentBy,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            }
        });
    }
}
