const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

// --- ROTA 1: TRADUÇÃO INDIVIDUAL ---
app.post('/api/traduzir', async (req, res) => {
    const { texto, idiomaOrigem, idiomaDestino } = req.body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const promptTexto = `Atue como um professor de idiomas e tradutor nativo.
        Origem: ${idiomaOrigem === 'Automático' ? 'Identifique o idioma automaticamente' : idiomaOrigem}
        Destino: ${idiomaDestino}
        Texto: "${texto}"

        REGRAS:
        1. Traduza o texto para o ${idiomaDestino} (usando alfabeto nativo se for Japonês/Coreano/Russo).
        2. APORTUGUESADO: Crie a transcrição fonética limpa para um brasileiro ler.
        3. CONTEXTO: Uma palavra curta de contexto.`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptTexto }] }],
                generationConfig: {
                    temperature: 0.1, 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            traducao: { type: "STRING" },
                            aportuguesado: { type: "STRING" },
                            contexto: { type: "STRING" }
                        },
                        required: ["traducao", "aportuguesado", "contexto"]
                    }
                }
            })
        });

        if (!response.ok) throw new Error('Erro na API Gemini');
        const data = await response.json();
        res.json(JSON.parse(data.candidates[0].content.parts[0].text));

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// --- ROTA 2: O GERADOR DE DECK À PROVA DE BALAS ---
app.post('/api/deck', async (req, res) => {
    const { idiomaDestino, quantidade } = req.body;
    const qtd = quantidade || 5; 

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        // TRATANDO A IA COMO CRIANÇA: Nomes de variáveis impossíveis de confundir
        const promptTexto = `Gere ${qtd} frases úteis para um brasileiro que quer aprender ${idiomaDestino}.
        Preencha o JSON EXATAMENTE com estas chaves:
        "frase_br": A frase em Português do Brasil.
        "frase_gringa": A frase traduzida para o ${idiomaDestino} (use alfabeto nativo se for Japonês/Russo/Coreano).
        "pronuncia": Como um brasileiro leria a 'frase_gringa' de forma fluida (ex: Combanuá).
        "situacao": Uma frase curta de contexto (ex: Para pedir desculpas).`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptTexto }] }],
                generationConfig: {
                    temperature: 0.7, 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY", 
                        items: {
                            type: "OBJECT",
                            properties: {
                                frase_br: { type: "STRING" },
                                frase_gringa: { type: "STRING" },
                                pronuncia: { type: "STRING" },
                                situacao: { type: "STRING" }
                            },
                            required: ["frase_br", "frase_gringa", "pronuncia", "situacao"]
                        }
                    }
                }
            })
        });

        if (!response.ok) throw new Error('Erro na API ao gerar deck');
        const data = await response.json();
        const cartasBrutas = JSON.parse(data.candidates[0].content.parts[0].text);

        // MAPEAMENTO FORÇADO NO BACKEND (O segredo do sucesso)
        const deckCorrigido = cartasBrutas.map(carta => ({
            original: carta.frase_br,
            traducao: carta.frase_gringa,
            aportuguesado: carta.pronuncia,
            contexto: carta.situacao
        }));

        res.json(deckCorrigido);

    } catch (error) {
        console.error("Erro no gerador de deck:", error);
        res.status(500).json({ erro: error.message });
    }
});

// --- ROTA 3: ÁUDIO NATIVO ---
app.post('/api/audio', async (req, res) => {
    const { texto, idiomaDestino } = req.body;
    try {
        let codigoIdioma = 'en';
        if (idiomaDestino === 'Espanhol') codigoIdioma = 'es';
        else if (idiomaDestino === 'Japonês') codigoIdioma = 'ja';
        else if (idiomaDestino === 'Russo') codigoIdioma = 'ru';
        else if (idiomaDestino === 'Coreano') codigoIdioma = 'ko';
        else if (idiomaDestino === 'Francês') codigoIdioma = 'fr';
        else if (idiomaDestino === 'Alemão') codigoIdioma = 'de';
        else if (idiomaDestino === 'Português') codigoIdioma = 'pt';

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=${codigoIdioma}&client=tw-ob`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao buscar áudio');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
        res.send(buffer);
    } catch (error) {
        console.error("Erro no áudio:", error);
        res.status(500).json({ erro: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});