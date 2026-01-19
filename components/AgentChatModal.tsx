import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { chatWithAgent } from '../services/aiService';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AgentChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    childName?: string;
    childGrade?: number;
}

export const AgentChatModal: React.FC<AgentChatModalProps> = ({ isOpen, onClose, childName = '孩子', childGrade = 4 }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `您好！我是${childName}的专属教育 Agent。我可以为您分析孩子的学习状况，或者一起探讨今日的辅导策略。有任何问题都可以问我！`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            // 调用真实 AI 服务
            const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await chatWithAgent(userMsg.content, {
                childName,
                childGrade,
                chatHistory
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，AI 服务暂时不可用，请稍后再试。',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-pop">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
                        <div>
                            <h3 className="font-bold">教育顾问 Agent</h3>
                            <div className="flex items-center gap-1 text-xs text-purple-200">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                在线中
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-purple-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white text-gray-500 text-xs px-3 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="询问之前的学习情况，或者寻求辅导建议..."
                            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <Button onClick={handleSend} disabled={!input.trim() || isThinking} className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <i className="fas fa-paper-plane"></i>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
