/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { type Chat, type Part } from '@google/genai';
import { startChat, ai } from './services/geminiService';
import Header from './components/Header';
import { SendIcon, PaperClipIcon, CodeBracketIcon, MagnifyingGlassIcon, XCircleIcon } from './components/icons';

interface Message {
    role: 'user' | 'model';
    text: string;
    citations?: { uri: string; title: string; }[];
}

const AI_MODELS = {
    'ecoiuris': {
        name: 'EcoIuris AI',
        instruction: 'You are an AI assistant from EcoIuris AI. Your mission is to listen, translate, protect, and transform realities. Your motto is: "The right to exist. The power to evolve." You should provide helpful, ethical, and insightful responses to assist users.',
    },
    'legal_pro': {
        name: 'Gemini Legal Pro',
        instruction: 'You are a specialized legal AI assistant. Provide detailed and accurate information on legal matters, citing relevant laws and precedents. Always include a disclaimer that you are not a substitute for a human lawyer.',
    },
    'juscrawler': {
        name: 'JusCrawler',
        instruction: 'You are JusCrawler, an AI expert in legal data extraction and analysis. Scan and summarize legal documents, identify key entities, and provide concise reports based on the provided text.',
    },
    'processual': {
        name: 'Assistente Processual',
        instruction: 'You are a procedural assistant AI. Guide users through legal processes step-by-step. Your tone is helpful, clear, and focused on procedural accuracy.',
    },
};

type AiModelKeys = keyof typeof AI_MODELS;

const fullWelcomeMessageText = `
<pre class="text-xs sm:text-sm" style="font-family: 'Source Code Pro', monospace; color: #87CEEB; line-height: 1;">
███████╗ ██████╗  ██████╗ ██╗ ██╗   ██╗ ██╗ ██████╗ ███████╗      █████╗ ██╗
██╔════╝██╔═══██╗██╔═══██╗██║ ██║   ██║ ██║██╔════╝ ██╔════╝     ██╔══██╗██║
█████╗  ██║   ██║██║   ██║██║ ██║   ██║ ██║██║  ███╗███████╗     ███████║██║
██╔══╝  ██║   ██║██║   ██║██║ ╚██╗ ██╔╝ ██║██║   ██║╚════██║     ██╔══██║╚═╝
███████╗╚██████╔╝╚██████╔╝██║  ╚████╔╝  ██║╚██████╔╝███████║     ██║  ██║██╗
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝   ╚═══╝   ╚═╝ ╚═════╝ ╚══════╝     ╚═╝  ╚═╝╚═╝
</pre>
Welcome to the EcoIuris AI CLI. How can I help you today?
`;


// Helper to convert File to a GoogleGenerativeAI.Part
const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};


const App: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentModel, setCurrentModel] = useState<AiModelKeys>('ecoiuris');
    const [isDeepSearch, setIsDeepSearch] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const welcomeAnimationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const animateWelcomeMessage = () => {
        if (welcomeAnimationIntervalRef.current) {
            clearInterval(welcomeAnimationIntervalRef.current);
        }
        let animatedText = '';
        setMessages([{ role: 'model', text: '' }]);

        let i = 0;
        welcomeAnimationIntervalRef.current = setInterval(() => {
            if (i < fullWelcomeMessageText.length) {
                animatedText += fullWelcomeMessageText[i];
                setMessages([{ role: 'model', text: animatedText + '█' }]);
                i++;
            } else {
                if (welcomeAnimationIntervalRef.current) {
                    clearInterval(welcomeAnimationIntervalRef.current);
                }
                setMessages([{ role: 'model', text: animatedText }]);
            }
        }, 5);
    };

    useEffect(() => {
        try {
            const newChat = startChat(AI_MODELS[currentModel].instruction);
            setChat(newChat);
            animateWelcomeMessage();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during initialization.';
            console.error(e);
            setError(`Failed to initialize AI Chat: ${errorMessage}`);
        }
        return () => {
            if (welcomeAnimationIntervalRef.current) {
                clearInterval(welcomeAnimationIntervalRef.current);
            }
        };
    }, [currentModel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !attachedFile || isLoading || !chat) return;

        const currentInput = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: `${currentInput}${attachedFile ? `\n\n[File Attached: ${attachedFile.name}]` : ''}` }]);
        setIsLoading(true);
        setError(null);

        try {
             if (isDeepSearch) {
                await handleDeepSearch(currentInput);
            } else {
                await handleStandardChat(currentInput);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error(err);
            setError(`Error from AI: ${errorMessage}`);
            setMessages(prev => [...prev.slice(0, -1)]);
        } finally {
            setIsLoading(false);
            setAttachedFile(null);
            setIsDeepSearch(false);
        }
    };
    
    const handleStandardChat = async (currentInput: string) => {
        if (!chat) return;
        let messageParts: (string | Part)[] = [currentInput];

        if (attachedFile) {
            const filePart = await fileToGenerativePart(attachedFile);
            messageParts = [filePart, currentInput];
        }
        
        const stream = await chat.sendMessageStream({ message: messageParts });
        
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '...' }]);

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse };
                return newMessages;
            });
        }
    }

    const handleDeepSearch = async (currentInput: string) => {
        setMessages(prev => [...prev, { role: 'model', text: 'Performing deep search...' }]);
        
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: currentInput,
           config: {
             tools: [{googleSearch: {}}],
           },
        });

        const text = response.text;
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const citations = chunks
            ?.map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!web?.uri && !!web?.title) ?? [];

        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', text, citations };
            return newMessages;
        });
    }

    const handleDownloadChat = () => {
        const chatHistory = messages.map(msg => {
            let prefix = msg.role === 'user' ? '> User:' : '< AI:';
            let citationsText = '';
            if (msg.citations && msg.citations.length > 0) {
                citationsText = '\n\nSources:\n' + msg.citations.map((c, i) => `[${i+1}] ${c.title}: ${c.uri}`).join('\n');
            }
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = msg.text;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";

            return `${prefix}\n${plainText}${citationsText}`;
        }).join('\n\n---\n\n');

        const blob = new Blob([chatHistory], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecoiuris-chat-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderMessage = (message: Message, index: number) => {
        const isUser = message.role === 'user';
        if (isUser) {
            return (
                <div key={index} className="flex items-start gap-2.5 text-gray-300 animate-fade-in-up user-message-bubble">
                    <span className="text-cyan-400 font-bold">&gt;</span>
                    <p className="whitespace-pre-wrap flex-1">{message.text}</p>
                </div>
            );
        }
        
        const isTyping = (isLoading && index === messages.length - 1 && message.text === "...") || message.text.endsWith('█');
        const htmlContent = marked.parse(message.text.endsWith('█') ? message.text.slice(0, -1) : message.text);
        
        return (
            <div key={index} className="prose prose-sm sm:prose-base prose-invert prose-p:text-gray-300 prose-li:text-gray-300 prose-headings:text-cyan-400 prose-strong:text-white prose-code:text-amber-300 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#161B22] animate-fade-in-up">
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                {isTyping && !message.text.endsWith('█') && <span className="inline-block w-2.5 h-5 bg-cyan-400 animate-pulse ml-1" aria-label="AI is typing"></span>}
                {message.citations && message.citations.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-gray-400 text-sm">Sources:</h4>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                            {message.citations.map((citation, i) => (
                                <li key={i}>
                                    <a href={citation.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        {citation.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="body-wrapper">
            <div className="terminal-window">
                <div className="terminal-header">
                    <div className="traffic-lights">
                        <span className="dot red"></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                    </div>
                    <div className="terminal-title">bash -- EcoIuris AI</div>
                </div>
                <div className="terminal-body">
                    <Header
                        models={AI_MODELS}
                        currentModel={currentModel}
                        onModelChange={(modelKey) => setCurrentModel(modelKey as AiModelKeys)}
                        onDownloadChat={handleDownloadChat}
                    />
                    <main className="flex-grow w-full max-w-4xl mx-auto p-4 flex flex-col overflow-hidden">
                        <div className="flex-grow space-y-6 overflow-y-auto pr-4 custom-scrollbar">
                            {messages.map(renderMessage)}
                            <div ref={messagesEndRef} />
                        </div>
                        {error && (
                            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300">
                                <p><strong>Error:</strong> {error}</p>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="mt-6 flex flex-col gap-2 flex-shrink-0">
                            {attachedFile && (
                                <div className="flex items-center gap-2 bg-gray-800/50 text-sm px-3 py-1.5 rounded-md animate-fade-in-up">
                                    <PaperClipIcon className="w-4 h-4 text-cyan-400" />
                                    <span className="text-gray-300">{attachedFile.name}</span>
                                    <button type="button" onClick={() => setAttachedFile(null)} aria-label="Remove file">
                                        <XCircleIcon className="w-5 h-5 text-gray-500 hover:text-red-400" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 border-t border-gray-700 pt-4">
                                <label htmlFor="chat-input" className="text-cyan-400 font-bold text-lg input-prompt">&gt;</label>
                                <input
                                    id="chat-input"
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your command..."
                                    className="flex-grow bg-transparent text-gray-200 text-lg focus:outline-none disabled:cursor-not-allowed"
                                    disabled={isLoading || !chat}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || (!input.trim() && !attachedFile) || !chat}
                                    className="bg-cyan-600/50 text-white p-3 rounded-md transition-all hover:bg-cyan-500/80 disabled:bg-gray-700 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                                    aria-label="Send message"
                                >
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 pl-6 pt-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => setAttachedFile(e.target.files ? e.target.files[0] : null)}
                                    accept=".pdf,image/*,video/*,audio/*"
                                />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="toolbar-button" aria-label="Upload file" disabled={isLoading}>
                                    <PaperClipIcon className="w-5 h-5"/>
                                    <span>Upload</span>
                                </button>
                                <button type="button" onClick={() => setInput(prev => `\`\`\`\n${prev}\n\`\`\``)} className="toolbar-button" aria-label="Format as code" disabled={isLoading}>
                                    <CodeBracketIcon className="w-5 h-5"/>
                                    <span>Code</span>
                                </button>
                                <button type="button" onClick={() => setIsDeepSearch(!isDeepSearch)} className={`toolbar-button ${isDeepSearch ? 'bg-cyan-500/30 text-cyan-300' : ''}`} aria-pressed={isDeepSearch} disabled={isLoading}>
                                    <MagnifyingGlassIcon className={`w-5 h-5 transition-transform ${isDeepSearch ? 'scale-110' : ''}`}/>
                                    <span>Deep Search</span>
                                </button>
                            </div>
                        </form>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;