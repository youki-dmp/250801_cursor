import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Helper function to parse Data URL ---
function parseDataUrl(dataUrl) {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid data URL");
    }
    return {
        mimeType: match[1],
        data: match[2],
    };
}

/**
 * Vercel Serverless Function
 * @param {import('@vercel/node').VercelRequest} req - The request object.
 * @param {import('@vercel/node').VercelResponse} res - The response object.
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- Gemini API Integration ---
    try {
        const { imageData } = req.body;
        if (!imageData) {
            return res.status(400).json({ error: 'imageData is required' });
        }

        // Get API Key from environment variables
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

                        const prompt = `この画像を分析し、内容に最も関連する日本語のタグを生成してください。画像内の文字（特に漢字）も正確に読み取り、タグに含めてください。以下のルールに厳密に従ってください。

1. 応答には、カンマ区切りの日本語タグのリストのみを含めてください。
2. 説明、前置き、その他の会話文は一切含めないでください。
3. タグは5個から7個生成してください。

例：
入力： (猫が写っている画像)
出力： 猫,動物,ペット,かわいい,室内

あなたの応答は、この形式に厳密に従う必要があります。`;

        const { mimeType, data } = parseDataUrl(imageData);

        const imagePart = {
            inlineData: {
                data: data,
                mimeType: mimeType,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // The model should return a comma-separated string of tags.
        const tags = text.split(',').map(tag => tag.trim());

        res.status(200).json({ tags });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: 'Failed to generate tags', details: error.message });
    }
}