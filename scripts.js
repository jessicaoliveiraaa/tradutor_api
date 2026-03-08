document.addEventListener('DOMContentLoaded', () => {
    const btnTraduzir = document.getElementById('btnTraduzir');
    const btnAudio = document.getElementById('btnAudio');
    const btnInverter = document.getElementById('btnInverter');
    const textoPt = document.getElementById('textoPt');
    const textoTraduzido = document.getElementById('textoTraduzido');
    const textoPronuncia = document.getElementById('textoPronuncia');
    const badgeContexto = document.getElementById('badgeContexto');
    const seletorOrigem = document.getElementById('idiomaOrigem');
    const seletorDestino = document.getElementById('idiomaDestino');
    const seletorVelocidade = document.getElementById('velocidadeVoz'); 
    
    const btnGravar = document.getElementById('btnGravar');
    const feedbackPronuncia = document.getElementById('feedbackPronuncia');
    
    const btnFavoritar = document.getElementById('btnFavoritar');
    const btnGerarDeck = document.getElementById('btnGerarDeck'); 
    const listaCaderno = document.getElementById('listaCaderno');
    let cadernoVocabulario = JSON.parse(localStorage.getItem('appTradutorCaderno')) || [];

    // --- MODO NOTURNO ---
    const btnTema = document.getElementById('btnTema');
    if (localStorage.getItem('temaEscuro') === 'sim') {
        document.body.classList.add('dark-mode');
        btnTema.innerHTML = '<i class="fas fa-sun"></i>';
    }
    btnTema.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('temaEscuro', 'sim');
            btnTema.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('temaEscuro', 'nao');
            btnTema.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });

    // --- TRADUÇÃO NORMAL ---
    btnInverter.addEventListener('click', () => {
        const temp = seletorOrigem.value === 'Automático' ? 'Português' : seletorOrigem.value;
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
        btnFavoritar.disabled = true; 
        textoTraduzido.innerText = '';
        textoPronuncia.innerText = '';
        feedbackPronuncia.innerText = ''; 
        badgeContexto.style.display = 'none';

        try {
            // LINK OFICIAL DO RENDER
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: textoOriginal, idiomaOrigem, idiomaDestino })
            });
            if (!response.ok) throw new Error('Falha na comunicação.');
            const resultado = await response.json();

            textoTraduzido.innerText = resultado.traducao;
            textoPronuncia.innerText = resultado.aportuguesado;
            if (resultado.contexto) {
                badgeContexto.innerText = resultado.contexto;
                badgeContexto.style.display = 'inline-block';
            }
            btnAudio.disabled = false;
            btnFavoritar.disabled = false;
        } catch (error) {
            textoTraduzido.innerText = "Erro ao traduzir.";
        } finally {
            btnTraduzir.innerText = 'Traduzir Rápido';
            btnTraduzir.disabled = false;
        }
    });

    // --- ÁUDIO GLOBAL ---
    async function tocarAudio(texto, idioma, taxa, botaoOrigem, textoBotaoOriginal) {
        botaoOrigem.disabled = true;
        botaoOrigem.innerText = 'Carregando...';
        try {
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto, idiomaDestino: idioma })
            });
            if (!response.ok) throw new Error('Erro áudio');
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = parseFloat(taxa);
            audio.onended = () => { botaoOrigem.disabled = false; botaoOrigem.innerHTML = textoBotaoOriginal; };
            audio.play();
        } catch (error) {
            botaoOrigem.disabled = false;
            botaoOrigem.innerHTML = textoBotaoOriginal;
        }
    }

    btnAudio.addEventListener('click', () => {
        tocarAudio(textoTraduzido.innerText, seletorDestino.value, seletorVelocidade.value, btnAudio, '<i class="fas fa-volume-up"></i> Ouvir Pronúncia');
    });

    // --- RECONHECIMENTO DE VOZ GLOBAL ---
    let isRecording = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognitionAPI = null;
    
    const limparTexto = (texto) => {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,!?¿¡;:'"。、！？「」『』\-\n\r]/g, '').replace(/\s+/g, ''); 
    };

    if (SpeechRecognition) {
        recognitionAPI = new SpeechRecognition();
        const mapIdiomasVoz = { 'Inglês': 'en-US', 'Espanhol': 'es-ES', 'Japonês': 'ja-JP', 'Português': 'pt-BR', 'Francês': 'fr-FR', 'Alemão': 'de-DE', 'Russo': 'ru-RU', 'Coreano': 'ko-KR' };

        if(btnGravar) {
            btnGravar.addEventListener('click', () => {
                if (isRecording) { recognitionAPI.stop(); return; }
                recognitionAPI.lang = mapIdiomasVoz[seletorDestino.value] || 'en-US';
                recognitionAPI.onstart = () => {
                    isRecording = true;
                    btnGravar.innerHTML = '<i class="fas fa-stop"></i> Ouvindo...';
                    btnGravar.style.backgroundColor = '#ef4444'; btnGravar.style.color = 'white';
                    feedbackPronuncia.innerText = 'Pode falar...'; feedbackPronuncia.style.color = 'var(--text-muted)'; 
                };
                recognitionAPI.onresult = (event) => {
                    const ouvidoLimpo = limparTexto(event.results[0][0].transcript.toLowerCase());
                    const corretoLimpo = limparTexto(textoTraduzido.innerText.toLowerCase());
                    if (ouvidoLimpo === corretoLimpo) {
                        feedbackPronuncia.innerHTML = `✅ <strong>Perfeito!</strong> Entendido: "${event.results[0][0].transcript}"`;
                        feedbackPronuncia.style.color = '#10b981'; 
                    } else {
                        feedbackPronuncia.innerHTML = `❌ <strong>Quase lá!</strong> Entendido: "${event.results[0][0].transcript}"`;
                        feedbackPronuncia.style.color = '#ef4444'; 
                    }
                };
                recognitionAPI.onend = () => {
                    isRecording = false;
                    btnGravar.innerHTML = '<i class="fas fa-microphone"></i> Pressione para Falar';
                    btnGravar.style.backgroundColor = 'transparent'; btnGravar.style.color = 'var(--primary-color)';
                };
                recognitionAPI.start();
            });
        }
    }

    // --- CADERNO ATUALIZADO (NOVO LAYOUT DE CONTEXTO E BOTÕES) ---
    function renderizarCaderno() {
        listaCaderno.innerHTML = '';
        if (cadernoVocabulario.length === 0) {
            listaCaderno.innerHTML = '<p style="color: var(--text-muted); width: 100%; grid-column: 1 / -1; text-align: center;">Caderno vazio. Crie as tuas cartas ou clica em "Gerar Cartas"!</p>';
            return;
        }
        cadernoVocabulario.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'flashcard';
            
            // O replace garante que aspas não quebrem o código dos botões
            const textoTraducaoLimpo = item.traducao.replace(/'/g, "\\'");
            const textoAportuguesadoLimpo = item.aportuguesado.replace(/'/g, "\\'");

            card.innerHTML = `
                <div style="margin-bottom: 5px;">
                    <div class="fc-lang">${item.idioma}</div>
                    ${item.contexto ? `<div class="fc-badge">${item.contexto}</div>` : ''}
                </div>
                <div class="fc-orig">"${item.original}"</div>
                <div class="fc-trad">${item.traducao}</div>
                <div class="fc-pron">🗣️ ${item.aportuguesado}</div>

                <div class="card-actions">
                    <button class="btn-card-audio" onclick="ouvirCarta('${textoTraducaoLimpo}', '${item.idioma}', this)">
                        <i class="fas fa-volume-up"></i> Ouvir
                    </button>
                    <button class="btn-card-mic" onclick="falarCarta('${textoTraducaoLimpo}', '${item.idioma}', '${textoAportuguesadoLimpo}', this)">
                        <i class="fas fa-microphone"></i> Falar
                    </button>
                </div>
                <p class="card-feedback"></p>

                <button class="btn-remover" onclick="removerDoCaderno(${index})"><i class="fas fa-trash"></i> Remover</button>
            `;
            listaCaderno.appendChild(card);
        });
    }

    // Funções globais que os botões das cartas chamam
    window.removerDoCaderno = (index) => {
        cadernoVocabulario.splice(index, 1); 
        localStorage.setItem('appTradutorCaderno', JSON.stringify(cadernoVocabulario)); 
        renderizarCaderno(); 
    };

    window.ouvirCarta = async (texto, idioma, botao) => {
        const textoOriginal = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: texto, idiomaDestino: idioma })
            });
            if (!response.ok) throw new Error('Erro');
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.onended = () => { botao.disabled = false; botao.innerHTML = textoOriginal; };
            audio.play();
        } catch (e) {
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    };

    window.falarCarta = (textoCorreto, idioma, aportuguesado, botao) => {
        if (isRecording) return; 
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert('Microfone não suportado no seu navegador.'); return; }

        const cardElement = botao.closest('.flashcard');
        const feedbackEl = cardElement.querySelector('.card-feedback');
        const mapIdiomasVoz = { 'Inglês': 'en-US', 'Espanhol': 'es-ES', 'Japonês': 'ja-JP', 'Português': 'pt-BR', 'Francês': 'fr-FR', 'Alemão': 'de-DE', 'Russo': 'ru-RU', 'Coreano': 'ko-KR' };
        
        const rec = new SpeechRecognition();
        rec.lang = mapIdiomasVoz[idioma] || 'en-US';

        rec.onstart = () => {
            isRecording = true;
            botao.innerHTML = '<i class="fas fa-stop"></i>';
            botao.style.backgroundColor = '#ef4444';
            botao.style.color = 'white';
            feedbackEl.innerText = 'Ouvindo...';
            feedbackEl.style.color = 'var(--text-muted)';
        };

        rec.onresult = (event) => {
            const ouvidoLimpo = limparTexto(event.results[0][0].transcript.toLowerCase());
            const corretoLimpo = limparTexto(textoCorreto.toLowerCase());

            if (ouvidoLimpo === corretoLimpo) {
                feedbackEl.innerHTML = '✅ Acertou!';
                feedbackEl.style.color = '#10b981';
            } else {
                feedbackEl.innerHTML = `❌ Fale: ${aportuguesado}`;
                feedbackEl.style.color = '#ef4444';
            }
        };

        rec.onend = () => {
            isRecording = false;
            botao.innerHTML = '<i class="fas fa-microphone"></i> Falar';
            botao.style.backgroundColor = 'transparent';
            botao.style.color = 'var(--primary-color)';
        };

        rec.start();
    };

    btnFavoritar.addEventListener('click', () => {
        cadernoVocabulario.unshift({
            original: textoPt.value.trim(),
            traducao: textoTraduzido.innerText,
            aportuguesado: textoPronuncia.innerText,
            idioma: seletorDestino.value,
            contexto: badgeContexto.innerText !== '' && badgeContexto.style.display !== 'none' ? badgeContexto.innerText : 'Uso Comum'
        }); 
        localStorage.setItem('appTradutorCaderno', JSON.stringify(cadernoVocabulario));
        btnFavoritar.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        btnFavoritar.disabled = true;
        setTimeout(() => { btnFavoritar.innerHTML = '<i class="fas fa-bookmark"></i> Salvar no Caderno'; btnFavoritar.disabled = false; }, 2000);
        renderizarCaderno();
    });

    // --- GERADOR DE DECK ---
    btnGerarDeck.addEventListener('click', async () => {
        const idioma = seletorDestino.value;
        const qtdEscolhida = document.getElementById('qtdCartas').value; 
        
        btnGerarDeck.disabled = true;
        btnGerarDeck.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

        try {
            const response = await fetch('https://tradutor-api-1j66.onrender.com/api/deck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idiomaDestino: idioma, quantidade: qtdEscolhida }) 
            });
            if (!response.ok) {
                const erroServidor = await response.text();
                throw new Error(`Erro do Servidor (${response.status}): ${erroServidor}`);
            }
            const novasCartas = await response.json();
            novasCartas.forEach(carta => {
                carta.idioma = idioma;
                cadernoVocabulario.unshift(carta);
            });
            localStorage.setItem('appTradutorCaderno', JSON.stringify(cadernoVocabulario));
            renderizarCaderno();
            btnGerarDeck.innerHTML = '<i class="fas fa-check"></i> Deck Criado!';
        } catch (error) {
            console.error("🕵️ ERRO COMPLETO:", error);
            alert(`Falha ao gerar o deck.\n\nDetalhes: ${error.message}`);
        } finally {
            setTimeout(() => { btnGerarDeck.disabled = false; btnGerarDeck.innerHTML = '<i class="fas fa-magic"></i> Gerar Cartas'; }, 3000);
        }
    });

    renderizarCaderno();

    // --- MINI-GAME ---
    const modalGame = document.getElementById('modalGame');
    const btnJogar = document.getElementById('btnJogar');
    const btnFecharGame = document.getElementById('btnFecharGame');
    const btnGameOuvir = document.getElementById('btnGameOuvir');
    const btnGameFalar = document.getElementById('btnGameFalar');
    const btnProxCarta = document.getElementById('btnProxCarta');
    const gameOriginal = document.getElementById('gameOriginal');
    const gameIdioma = document.getElementById('gameIdioma');
    const gameFeedback = document.getElementById('gameFeedback');
    
    const placarAcertosElement = document.getElementById('placarAcertos');
    const placarErrosElement = document.getElementById('placarErros');
    let qtdAcertos = 0;
    let qtdErros = 0;
    let cartaAtual = null;

    function atualizarPlacar() {
        placarAcertosElement.innerText = qtdAcertos;
        placarErrosElement.innerText = qtdErros;
    }

    function carregarCartaAleatoria() {
        if(cadernoVocabulario.length === 0) { alert("Adiciona palavras ou gera um deck primeiro!"); return false; }
        const randomIndex = Math.floor(Math.random() * cadernoVocabulario.length);
        cartaAtual = cadernoVocabulario[randomIndex];
        gameOriginal.innerText = `Como falar "${cartaAtual.original}" em ${cartaAtual.idioma}?`;
        gameIdioma.innerText = cartaAtual.idioma;
        gameFeedback.innerText = '';
        btnProxCarta.style.display = 'none';
        btnGameFalar.style.display = 'inline-block'; 
        return true;
    }

    btnJogar.addEventListener('click', () => { 
        qtdAcertos = 0; qtdErros = 0; atualizarPlacar(); 
        if(carregarCartaAleatoria()) modalGame.style.display = 'flex'; 
    });
    
    btnFecharGame.addEventListener('click', () => { modalGame.style.display = 'none'; });
    btnProxCarta.addEventListener('click', carregarCartaAleatoria);

    btnGameOuvir.addEventListener('click', () => {
        tocarAudio(cartaAtual.traducao, cartaAtual.idioma, 1.0, btnGameOuvir, '<i class="fas fa-volume-up"></i> Dica');
    });

    if (SpeechRecognition) {
        btnGameFalar.addEventListener('click', () => {
            if (isRecording) { return; } 
            const mapIdiomasVoz = { 'Inglês': 'en-US', 'Espanhol': 'es-ES', 'Japonês': 'ja-JP', 'Português': 'pt-BR', 'Francês': 'fr-FR', 'Alemão': 'de-DE', 'Russo': 'ru-RU', 'Coreano': 'ko-KR' };
            const gameRec = new SpeechRecognition();
            gameRec.lang = mapIdiomasVoz[cartaAtual.idioma] || 'en-US';
            
            gameRec.onstart = () => {
                isRecording = true;
                btnGameFalar.innerHTML = '<i class="fas fa-stop"></i> Ouvindo...';
                gameFeedback.innerText = 'Podes falar...'; gameFeedback.style.color = 'var(--text-muted)';
            };
            
            gameRec.onresult = (event) => {
                const ouvidoLimpo = limparTexto(event.results[0][0].transcript.toLowerCase());
                const corretoLimpo = limparTexto(cartaAtual.traducao.toLowerCase());
                
                if (ouvidoLimpo === corretoLimpo) {
                    gameFeedback.innerHTML = '🎉 Acertaste em cheio!'; gameFeedback.style.color = '#10b981';
                    qtdAcertos++;
                } else {
                    gameFeedback.innerHTML = `❌ Quase! O certo é: ${cartaAtual.aportuguesado}`; gameFeedback.style.color = '#ef4444';
                    qtdErros++;
                }
                atualizarPlacar();
                btnProxCarta.style.display = 'inline-block'; 
                btnGameFalar.style.display = 'none'; 
            };
            
            gameRec.onend = () => {
                isRecording = false;
                btnGameFalar.innerHTML = '<i class="fas fa-microphone"></i> Falar';
            };
            gameRec.start();
        });
    }
});