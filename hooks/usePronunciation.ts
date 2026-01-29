/**
 * 发音 Hook
 * 使用 Web Speech API 实现单词发音
 */

import { useState, useCallback } from 'react';
import type { AccentType } from '../types/word';

interface UsePronunciationReturn {
    speak: (text: string, accent?: AccentType) => void;
    speaking: boolean;
    supported: boolean;
    stop: () => void;
}

/**
 * 发音 Hook
 * 
 * @example
 * const { speak, speaking, supported } = usePronunciation();
 * 
 * // 播放美式发音
 * speak('hello', 'us');
 * 
 * // 播放英式发音
 * speak('hello', 'uk');
 */
export function usePronunciation(): UsePronunciationReturn {
    const [speaking, setSpeaking] = useState(false);

    // 检查浏览器支持
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    /**
     * 播放发音
     */
    const speak = useCallback((text: string, accent: AccentType = 'us') => {
        if (!supported) {
            console.warn('[usePronunciation] Web Speech API not supported');
            return;
        }

        // 停止之前的发音
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // 设置语言
        utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';

        // 语速略慢，适合儿童学习
        utterance.rate = 0.85;

        // 音量
        utterance.volume = 1;

        // 音调
        utterance.pitch = 1;

        // 事件处理
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = (e) => {
            // 忽略被取消的错误 (如快速切换单词)
            if (e.error === 'canceled' || e.error === 'interrupted') {
                setSpeaking(false);
                return;
            }
            console.error('[usePronunciation] Error:', e);
            setSpeaking(false);
        };

        // 尝试选择更好的声音
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => {
            if (accent === 'uk') {
                return v.lang.includes('en-GB') || v.lang.includes('en_GB');
            } else {
                return v.lang.includes('en-US') || v.lang.includes('en_US');
            }
        });

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        // 播放
        window.speechSynthesis.speak(utterance);
    }, [supported]);

    /**
     * 停止发音
     */
    const stop = useCallback(() => {
        if (supported) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
        }
    }, [supported]);

    return {
        speak,
        speaking,
        supported,
        stop,
    };
}

/**
 * 预加载语音
 * 在组件挂载时调用，确保语音列表已加载
 */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            resolve([]);
            return;
        }

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }

        // 等待语音列表加载
        window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
        };

        // 超时处理
        setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    });
}

export default usePronunciation;
