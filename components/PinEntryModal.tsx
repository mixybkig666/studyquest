import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface PinEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '', '', '']);
            setError(false);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);
        setError(false);

        // Auto-advance
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if complete
        const fullPin = newPin.join('');
        if (fullPin.length === 6 && newPin.every(d => d !== '')) {
            if (fullPin === '111111') {
                onSuccess();
            } else {
                setError(true);
                // Shake effect reset
                setTimeout(() => setPin(['', '', '', '', '', '']), 500);
                inputRefs.current[0]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            // Move back on backspace if empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-brand-bg/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center relative overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-teal to-brand-primary"></div>

                <h2 className="text-2xl font-black text-brand-textDark mb-2">家长验证</h2>
                <p className="text-brand-textLight text-sm mb-8">请输入 6 位安全密码以继续</p>

                <div className={`flex justify-center gap-2 mb-8 ${error ? 'animate-shake' : ''}`}>
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputRefs.current[i] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleInput(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className={`w-10 h-12 rounded-xl border-2 text-center text-xl font-bold transition-all focus:outline-none focus:ring-4 focus:ring-brand-mint/50 
                                ${error ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-200 bg-gray-50 text-brand-darkTeal focus:border-brand-teal focus:bg-white'}
                            `}
                        />
                    ))}
                </div>

                {error && <p className="text-red-500 text-xs font-bold absolute bottom-20 left-0 w-full animate-bounce">密码错误，请重试</p>}

                <div className="flex justify-center">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">取消</Button>
                </div>
            </div>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
        </div>
    );
};
