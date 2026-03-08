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
        
        const promptTexto = `Atue como um professor de idiomas e tradutor nativo especialista.
        Origem: ${idiomaOrigem === 'Automático' ? 'Identifique o idioma automaticamente' : idiomaOrigem}
        Destino: ${idiomaDestino}
        Texto: "${texto}"

        REGRAS DE TRADUÇÃO:
        1. SE O DESTINO FOR JAPONÊS: É obrigatório usar a gramática formal e educada (Teineigo - regras de masu/desu).
        2. SE O DESTINO FOR INGLÊS: Use o tom natural do dia a dia. Se a frase original for um pedido, adicione 'please'.
        3. PARA TODOS OS IDIOMAS: Respeite a intimidade.
        4. ALFABETO NATIVO: Se o destino for Japonês, Russo ou Coreano, a "traducao" DEVE OBRIGATORIAMENTE vir no alfabeto original do país. NUNCA coloque letras latinas na chave "traducao".
        5. APORTUGUESADO: Crie a transcrição fonética exata de como um brasileiro leria a tradução em voz alta.
        6. CONTEXTO: Analise o texto e classifique-o com UMA tag curta. Exemplos: "Uso Comum", "Formal", "Informal", "Gíria", "Expressão Idiomática".`;

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

        if (!response.ok) throw new Error('Erro na API do Google Gemini');
        const data = await response.json();
        res.json(JSON.parse(data.candidates[0].content.parts[0].text));

    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ erro: error.message });
    }
});

// --- ROTA 2: GERADOR DE DECK MÁGICO ---
app.post('/api/deck', async (req, res) => {
    const { idiomaDestino, quantidade } = req.body;
    const qtd = quantidade || 5; 

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const promptTexto = `Crie um minicurso rápido com ${qtd} frases curtas e extremamente úteis para o dia a dia no idioma ${idiomaDestino}.
        REGRAS:
        1. Se for Japonês, Russo ou Coreano, use obrigatoriamente o alfabeto nativo do país.
        2. Forneça o aportuguesado perfeito (como um brasileiro leria em voz alta).
        3. Dê o contexto da frase (ex: "Saudação", "Restaurante", "Emergência").`;

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
                                original: { type: "STRING" },
                                traducao: { type: "STRING" },
                                aportuguesado: { type: "STRING" },
                                contexto: { type: "STRING" }
                            },
                            required: ["original", "traducao", "aportuguesado", "contexto"]
                        }
                    }
                }
            })
        });

        if (!response.ok) throw new Error('Erro na API ao gerar deck');
        const data = await response.json();
        res.json(JSON.parse(data.candidates[0].content.parts[0].text));

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