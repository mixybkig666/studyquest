import { useState, useEffect, useCallback } from 'react';
import { LearningPeriod } from '../types';

interface UserPreferences {
    // ... items ...
    learningPeriod: LearningPeriod;
}

const STORAGE_KEY = 'studyquest_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
    readingDuration: 15,
    lastSelectedChildId: null,
    lastInputMode: 'book_quiz',
    reportPeriod: 'today',
    showCelebration: true,
    theme: 'auto',
    learningPeriod: 'school',
};

/**
 * 用户偏好记忆 Hook
 * 自动保存到 localStorage，跨会话保持
 */
export function useUserPreferences() {
    const [prefs, setPrefs] = useState<UserPreferences>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load user preferences:', e);
        }
        return DEFAULT_PREFERENCES;
    });

    // 更新单个偏好
    const updatePref = useCallback(<K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('Failed to save user preferences:', e);
            }
            return next;
        });
    }, []);

    // 批量更新偏好
    const updatePrefs = useCallback((updates: Partial<UserPreferences>) => {
        setPrefs(prev => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('Failed to save user preferences:', e);
            }
            return next;
        });
    }, []);

    // 重置偏好
    const resetPrefs = useCallback(() => {
        setPrefs(DEFAULT_PREFERENCES);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to reset user preferences:', e);
        }
    }, []);

    return {
        prefs,
        updatePref,
        updatePrefs,
        resetPrefs,
    };
}

/**
 * 简化版：阅读时长偏好
 */
export function useReadingDurationPref() {
    const { prefs, updatePref } = useUserPreferences();

    return {
        readingDuration: prefs.readingDuration,
        setReadingDuration: (duration: number) => updatePref('readingDuration', duration),
    };
}

/**
 * 简化版：上次选择的孩子
 */
export function useLastSelectedChild() {
    const { prefs, updatePref } = useUserPreferences();

    return {
        lastChildId: prefs.lastSelectedChildId,
        setLastChildId: (id: string | null) => updatePref('lastSelectedChildId', id),
    };
}

/**
 * 简化版：输入模式偏好
 */
export function useInputModePref() {
    const { prefs, updatePref } = useUserPreferences();

    return {
        inputMode: prefs.lastInputMode,
        setInputMode: (mode: 'book_quiz' | 'upload' | 'topic') => updatePref('lastInputMode', mode),
    };
}
