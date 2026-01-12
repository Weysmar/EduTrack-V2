const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = "AIzaSyDq7Xjh--Cq3nLL76w0qzBSKVn-BFksyls";
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Fetching models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        console.log("Models supporting generateContent:");
        generateModels.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
