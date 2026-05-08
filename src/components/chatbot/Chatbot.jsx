import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Trash2, Bot, User } from 'lucide-react';
import { useChatbot } from '../../hooks/useChatbot';

export default function Chatbot() {
  const { 
    messages, 
    isOpen, 
    isTyping, 
    messagesEndRef, 
    toggleChat, 
    sendMessage, 
    clearHistory 
  } = useChatbot();
  
  const [inputText, setInputText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isTyping) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-neon-purple text-white rounded-full shadow-[0_0_20px_rgba(188,19,254,0.5)] flex items-center justify-center z-[9999] hover:bg-purple-600 transition-colors"
        aria-label="Open AI Assistant"
      >
        <MessageSquare size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] max-h-[600px] h-[80vh] flex flex-col bg-space-dark/95 backdrop-blur-xl border border-neon-purple/30 rounded-2xl shadow-[0_0_30px_rgba(188,19,254,0.2)] overflow-hidden z-[9999]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-space-light/80 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bot className="text-neon-purple w-5 h-5" />
                <h3 className="font-bold text-slate-100 text-sm">Space Station AI</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={clearHistory}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                  title="Clear Chat"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={toggleChat}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title="Close Chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.isUser ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
                        {msg.isUser ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.isUser 
                          ? 'bg-neon-blue/10 border border-neon-blue/30 text-slate-200 rounded-tr-none' 
                          : 'bg-space-light border border-white/10 text-slate-300 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-neon-purple/20 text-neon-purple flex items-center justify-center shrink-0">
                      <Bot size={14} />
                    </div>
                    <div className="p-4 rounded-2xl bg-space-light border border-white/10 rounded-tl-none flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-space-light/80 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about ISS or Space News..."
                className="flex-1 bg-space-dark border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neon-purple/50 focus:shadow-[0_0_10px_rgba(188,19,254,0.2)] transition-all"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-neon-purple text-white flex items-center justify-center hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} className="ml-1" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
