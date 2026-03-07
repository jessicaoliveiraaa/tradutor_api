document.addEventListener('DOMContentLoaded', () => {
    const btnTraduzir = document.getElementById('btnTraduzir');
    const btnAudio = document.getElementById('btnAudio');
    const btnInverter = document.getElementById('btnInverter');
    const textoPt = document.getElementById('textoPt');
    const textoTraduzido = document.getElementById('textoTraduzido');
    const textoPronuncia = document.getElementById('textoPronuncia');
    const seletorOrigem = document.getElementById('idiomaOrigem');
    const seletorDestino = document.getElementById('idiomaDestino');
    const seletorVelocidade = document.getElementById('velocidadeVoz'); 
    
    // Elementos do microfone
    const btnGravar = document.getElementById('btnGravar');
    const feedbackPronuncia = document.getElementById('feedbackPronuncia');

    btnInverter.addEventListener('click', () => {
        const temp = seletorOrigem.value;
        seletorOrigem.value = seletorDestino.value;
        seletorDestino.value = temp;
    });

    btnTraduzir.addEventListener('click', async () => {
        const textoOriginal = textoPt.value.trim();
        const idiomaOrigem = seletorOrigem.value;
        const idiomaDestino = seletorDestino.value;
        
        if (!textoOriginal) return;

        btnTraduzir.innerText = 'Traduzindo...';
        btnTraduzir.disabled = true;
        btnAudio.disabled = true;
        textoTraduzido.innerText = '';
        textoPronuncia.innerText = '';
        feedbackPronuncia.innerText = ''; 

        try {
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    texto: textoOriginal, 
                    idiomaOrigem: idiomaOrigem, 
                    idiomaDestino: idiomaDestino 
                })
            });

            if (!response.ok) throw new Error('Falha na comunicação com o servidor.');

            const resultado = await response.json();

            textoTraduzido.innerText = resultado.traducao;
            textoPronuncia.innerText = resultado.aportuguesado;
            
            btnAudio.disabled = false;

        } catch (error) {
            textoTraduzido.innerText = "Erro ao traduzir.";
            console.error(error);
        } finally {
            btnTraduzir.innerText = 'Traduzir Rápido';
            btnTraduzir.disabled = false;
        }
    });

    btnAudio.addEventListener('click', async () => {
        const textoFalar = textoTraduzido.innerText;
        const idiomaDestino = seletorDestino.value;
        btnAudio.disabled = false;
        
        if (!textoFalar) return;

        btnAudio.disabled = true;
        const textoOriginal = btnAudio.innerText;
        btnAudio.innerText = 'Carregando Áudio...';

        try {
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    texto: textoFalar,
                    idiomaDestino: idiomaDestino
                })
            });

            if (!response.ok) throw new Error('Falha ao gerar áudio no servidor');

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = parseFloat(seletorVelocidade.value);
            
            audio.onended = () => {
                btnAudio.disabled = false;
                btnAudio.innerText = textoOriginal;
            };

            audio.play();

        } catch (error) {
            console.error(error);
            alert("Erro ao carregar a pronúncia. Tente novamente.");
            btnAudio.disabled = false;
            btnAudio.innerText = textoOriginal;
        }
    });

    // --- SISTEMA DE RECONHECIMENTO DE VOZ (SPEECH-TO-TEXT) ---
    let isRecording = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && btnGravar) {
        const recognition = new SpeechRecognition();
        
        const mapIdiomasVoz = {
            'Inglês': 'en-US',
            'Espanhol': 'es-ES',
            'Japonês': 'ja-JP',
            'Português': 'pt-BR',
            'Francês': 'fr-FR',
            'Alemão': 'de-DE',
            'Russo': 'ru-RU',
            'Coreano': 'ko-KR'
        };

        btnGravar.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
                return;
            }
            recognition.lang = mapIdiomasVoz[seletorDestino.value] || 'en-US';
            recognition.start();
        });

        recognition.onstart = () => {
            isRecording = true;
            btnGravar.innerHTML = '<i class="fas fa-stop"></i> Ouvindo... (Fale agora)';
            btnGravar.style.backgroundColor = '#ef4444'; 
            btnGravar.style.color = 'white';
            feedbackPronuncia.innerText = 'Escutando sua pronúncia...';
            feedbackPronuncia.style.color = '#64748b'; 
        };

        recognition.onresult = (event) => {
            const textoOuvido = event.results[0][0].transcript.toLowerCase();
            const textoCorreto = textoTraduzido.innerText.toLowerCase();

            // 🔥 SUPER LIMPADOR UNIVERSAL 🔥
            const limparTexto = (texto) => {
                return texto
                    .normalize("NFD") // Separa os acentos latinos
                    .replace(/[\u0300-\u036f]/g, "") // Remove os acentos latinos
                    .replace(/[.,!?¿¡;:'"。、！？「」『』\-\n\r]/g, '') // Remove pontuação do mundo todo!
                    .replace(/\s+/g, ''); // REMOVE TODOS OS ESPAÇOS para não dar erro na comparação
            };
            
            const ouvidoLimpo = limparTexto(textoOuvido);
            const corretoLimpo = limparTexto(textoCorreto);

            if (ouvidoLimpo === corretoLimpo) {
                feedbackPronuncia.innerHTML = `✅ <strong>Perfeito!</strong> O app entendeu: "${textoOuvido}"`;
                feedbackPronuncia.style.color = '#10b981'; 
            } else {
                feedbackPronuncia.innerHTML = `❌ <strong>Quase lá!</strong> Entendemos: "${textoOuvido}". <br> Leia o aportuguesado e tente de novo!`;
                feedbackPronuncia.style.color = '#ef4444'; 
            }
        };

        recognition.onerror = (event) => {
            feedbackPronuncia.innerText = 'Não consegui escutar. Verifique a permissão do microfone.';
            feedbackPronuncia.style.color = '#ef4444';
        };

        recognition.onend = () => {
            isRecording = false;
            btnGravar.innerHTML = '<i class="fas fa-microphone"></i> Pressione para Falar';
            btnGravar.style.backgroundColor = 'transparent';
            btnGravar.style.color = 'var(--primary-color)';
        };

    } else if (btnGravar) {
        btnGravar.disabled = true;
        btnGravar.innerText = 'Navegador não suporta voz.';
    }
});