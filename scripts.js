document.addEventListener('DOMContentLoaded', () => {
    const btnTraduzir = document.getElementById('btnTraduzir');
    const btnAudio = document.getElementById('btnAudio');
    const btnInverter = document.getElementById('btnInverter');
    const textoPt = document.getElementById('textoPt');
    const textoTraduzido = document.getElementById('textoTraduzido');
    const textoPronuncia = document.getElementById('textoPronuncia');
    const seletorOrigem = document.getElementById('idiomaOrigem');
    const seletorDestino = document.getElementById('idiomaDestino');

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

    // --- NOVO SISTEMA DE ÁUDIO SEGURO E DEFINITIVO ---
    btnAudio.addEventListener('click', async () => {
        const textoFalar = textoTraduzido.innerText;
        const idiomaDestino = seletorDestino.value;

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
});