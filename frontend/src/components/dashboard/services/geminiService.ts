
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');

export const generateProductDescription = async (productName: string, features: string) => {
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(`Write a seductive, elegant, and professional marketing description for a premium lingerie item called "${productName}" with the following features: ${features}. Focus on comfort, material quality, and how it makes the wearer feel. Keep it under 100 words.`);
    return response.response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description. Please try again.";
  }
};
