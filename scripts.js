document.addEventListener('DOMContentLoaded', () => {
    const btnTraduzir = document.getElementById('btnTraduzir');
    const btnAudio = document.getElementById('btnAudio');
    const btnInverter = document.getElementById('btnInverter');
    const textoPt = document.getElementById('textoPt');
    const textoTraduzido = document.getElementById('textoTraduzido');
    const textoPronuncia = document.getElementById('textoPronuncia');
    const seletorOrigem = document.getElementById('idiomaOrigem');
    const seletorDestino = document.getElementById('idiomaDestino');

    const synth = window.speechSynthesis;

    btnInverter.addEventListener('click', () => {
        const temp = seletorOrigem.value;
        seletorOrigem.value = seletorDestino.value;
        seletorDestino.value = temp;
    });

    function obterVozCorreta(idioma) {
        const voices = synth.getVoices();
        let codigoIdioma = '';

        if (idioma === 'Inglês') codigoIdioma = 'en';
        else if (idioma === 'Espanhol') codigoIdioma = 'es';
        else if (idioma === 'Japonês') codigoIdioma = 'ja';
        else if (idioma === 'Russo') codigoIdioma = 'ru';
        else if (idioma === 'Coreano') codigoIdioma = 'ko';
        else if (idioma === 'Francês') codigoIdioma = 'fr';
        else if (idioma === 'Alemão') codigoIdioma = 'de';
        else if (idioma === 'Português') codigoIdioma = 'pt';

        const vozesFiltradas = voices.filter(voice => voice.lang.startsWith(codigoIdioma));
        if (vozesFiltradas.length === 0) return voices[0];

        const vozPerfeita = vozesFiltradas.find(voice => 
            voice.name.includes('Natural') || 
            voice.name.includes('Google') || 
            voice.name.includes('Premium') ||
            voice.name.includes('Online')
        );
        
        return vozPerfeita || vozesFiltradas[0];
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }

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

        try {
            const response = await fetch('http://localhost:3000/api/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Enviando explicitamente as três variáveis necessárias
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

    btnAudio.addEventListener('click', () => {
        const textoFalar = textoTraduzido.innerText;
        const idiomaDestino = seletorDestino.value;

        if (synth.speaking || !textoFalar) return;

        const utterance = new SpeechSynthesisUtterance(textoFalar);
        utterance.voice = obterVozCorreta(idiomaDestino);
        utterance.rate = 0.9;
        utterance.pitch = 1.0; 

        synth.speak(utterance);
    });
});