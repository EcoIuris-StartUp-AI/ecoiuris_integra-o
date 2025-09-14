/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Chat } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Initializes and returns a new chat session with a given system instruction.
 * @param {string} systemInstruction The system instruction for the AI model.
 * @returns A Chat object for starting a conversation.
 */
export const startChat = (systemInstruction: string): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};
