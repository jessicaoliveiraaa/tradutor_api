const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

app.post('/api/traduzir', async (req, res) => {
    const { texto, idiomaOrigem, idiomaDestino } = req.body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        // Atendendo ao seu pedido: Voltando para o motor super inteligente Gemini 2.5 Flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const promptTexto = `Atue como um tradutor nativo especialista.
        Origem: ${idiomaOrigem}
        Destino: ${idiomaDestino}
        Texto: "${texto}"

        REGRAS DE TRADUÇÃO:
        1. SE O DESTINO FOR JAPONÊS: É obrigatório usar a gramática formal e educada (Teineigo - regras de masu/desu).
        2. SE O DESTINO FOR INGLÊS: Use o tom natural do dia a dia. Se a frase original for um pedido, adicione 'please' para soar educado.
        3. PARA TODOS OS IDIOMAS: Respeite a intimidade. Ex: "Meu amor" deve ser traduzido literalmente (ex: "My love"), e nunca suavizado para "meu querido" ou "my dear".

        Traduza o texto e forneça a pronúncia aportuguesada (como um brasileiro leria em voz alta de forma correta).`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptTexto }] }],
                generationConfig: {
                    temperature: 0.1, // Mantém a resposta direta e sem invenções
                    responseMimeType: "application/json",
                    // A MÁGICA DA VELOCIDADE NO 2.5: O responseSchema obriga a IA a cuspir os dados instantaneamente sem precisar processar exemplos de formatação no texto
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            traducao: { type: "STRING" },
                            aportuguesado: { type: "STRING" }
                        },
                        required: ["traducao", "aportuguesado"]
                    }
                }
            })
        });

        if (!response.ok) {
            const erroAPI = await response.json();
            throw new Error(erroAPI.error?.message || 'Erro na API do Google Gemini');
        }

        const data = await response.json();
        const textoResposta = data.candidates[0].content.parts[0].text;
        
        res.json(JSON.parse(textoResposta));

    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ erro: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando com Gemini 2.5 Flash e regras ativadas na porta http://localhost:${PORT}`);
});