import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Paperclip, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string, fileInfo?: { name: string, type: string } }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<{ base64: string, mimeType: string, name: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'text/plain',
            'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            alert('Formato de arquivo não suportado. Envie imagens (JPG, PNG, WEBP), texto (.txt), Excel (.xlsx) ou CSV (.csv).');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            setAttachedFile({
                base64,
                mimeType: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                name: file.name
            });
        };
        reader.readAsDataURL(file);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedFile) return;

        const userMsg = input;
        const fileToSend = attachedFile;
        
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: userMsg, 
            fileInfo: fileToSend ? { name: fileToSend.name, type: fileToSend.mimeType } : undefined 
        }]);
        setInput('');
        setAttachedFile(null);
        setIsLoading(true);

        try {
            const filesPayload = fileToSend ? [{ base64: fileToSend.base64, mimeType: fileToSend.mimeType }] : undefined;
            const response = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, files: filesPayload })
            });
            const data = await response.json();

            if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', text: `**Erro:** ${data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: '**Erro de conexão.**' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Botão Flutuante */}
            <motion.button
                drag
                dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
                dragElastic={0.1}
                dragMomentum={false}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 p-4 bg-purple-600 text-white rounded-full shadow-2xl shadow-purple-900/50 hover:bg-purple-500 transition-all ${isOpen ? 'hidden' : 'flex'} items-center justify-center`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ cursor: 'grab' }}
                whileDrag={{ cursor: 'grabbing' }}
            >
                <Bot size={28} />
            </motion.button>

            {/* Janela do Chat Móvel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        drag
                        dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
                        dragElastic={0.1}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="fixed bottom-6 right-6 z-[100] w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col"
                        style={{ height: '500px', maxHeight: '80vh', cursor: 'grab', resize: 'both', overflow: 'hidden', minWidth: '300px', minHeight: '300px' }}
                        whileDrag={{ cursor: 'grabbing' }}
                        onPointerDownCapture={(e) => {
                            // Se estiver arrastando no cantinho (resize), não aciona o drag
                            const target = e.target as HTMLElement;
                            if (target.style.resize === 'both' && e.clientX > target.getBoundingClientRect().right - 20 && e.clientY > target.getBoundingClientRect().bottom - 20) {
                                e.stopPropagation();
                            }
                        }}
                    >
                        {/* Header */}
                        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
                                    <Bot size={18} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">Assistente IA</h3>
                                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Análise de Indicadores</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" onPointerDown={e => e.stopPropagation()}>
                            {messages.length === 0 && (
                                <div className="text-center text-slate-500 text-xs mt-10">
                                    <Bot size={32} className="mx-auto mb-3 opacity-50" />
                                    Olá! Posso ajudar a analisar seus dados, cruzar informações dos indicadores ou sugerir planos de ação. Envie uma mensagem ou arquivo.
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                                        {msg.fileInfo && (
                                            <div className="flex items-center gap-2 mb-2 bg-black/20 p-2 rounded-lg text-xs">
                                                {msg.fileInfo.type.startsWith('image/') ? <ImageIcon size={14}/> : <FileText size={14}/>}
                                                <span className="truncate">{msg.fileInfo.name}</span>
                                            </div>
                                        )}
                                        {msg.text && (
                                            <div className="text-sm prose prose-invert prose-p:my-1 prose-sm max-w-none">
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-3 text-slate-400 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" /> <span className="text-xs">Pensando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-slate-900 border-t border-slate-800" onPointerDown={e => e.stopPropagation()}>
                            {attachedFile && (
                                <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg mb-2 text-xs text-slate-300">
                                    <div className="flex items-center gap-2 truncate">
                                        {attachedFile.mimeType.startsWith('image/') ? <ImageIcon size={14} className="text-purple-400"/> : <FileText size={14} className="text-purple-400"/>}
                                        <span className="truncate">{attachedFile.name}</span>
                                    </div>
                                    <button onClick={() => setAttachedFile(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                </div>
                            )}
                            <div className="flex gap-2 relative">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    accept="image/*,.txt,.csv,.xlsx"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex-shrink-0"
                                    title="Anexar arquivo"
                                >
                                    <Paperclip size={18} />
                                </button>
                                <textarea 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white resize-none outline-none focus:border-purple-500 transition-colors max-h-32 min-h-[44px]"
                                    rows={1}
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={isLoading || (!input.trim() && !attachedFile)}
                                    className="p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all flex-shrink-0"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
