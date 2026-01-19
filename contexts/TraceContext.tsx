/**
 * TraceContext - 全局 Agent 思考过程状态管理
 * 
 * 让"学点什么"和"拍照出题"共享同一个思考过程面板
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TraceStep {
    step: string;
    result: any;
    timestamp?: Date;
}

interface TraceContextType {
    trace: TraceStep[];
    addTrace: (step: TraceStep) => void;
    setTrace: (steps: TraceStep[]) => void;
    clearTrace: () => void;
    isProcessing: boolean;
    setIsProcessing: (v: boolean) => void;
    currentTaskName: string;
    setCurrentTaskName: (name: string) => void;
}

const TraceContext = createContext<TraceContextType | undefined>(undefined);

export const TraceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [trace, setTraceState] = useState<TraceStep[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTaskName, setCurrentTaskName] = useState('');

    const addTrace = useCallback((step: TraceStep) => {
        setTraceState(prev => [...prev, { ...step, timestamp: new Date() }]);
    }, []);

    const setTrace = useCallback((steps: TraceStep[]) => {
        setTraceState(steps.map(s => ({ ...s, timestamp: s.timestamp || new Date() })));
    }, []);

    const clearTrace = useCallback(() => {
        setTraceState([]);
        setCurrentTaskName('');
    }, []);

    return (
        <TraceContext.Provider value={{
            trace,
            addTrace,
            setTrace,
            clearTrace,
            isProcessing,
            setIsProcessing,
            currentTaskName,
            setCurrentTaskName
        }}>
            {children}
        </TraceContext.Provider>
    );
};

export const useTrace = (): TraceContextType => {
    const context = useContext(TraceContext);
    if (!context) {
        throw new Error('useTrace must be used within a TraceProvider');
    }
    return context;
};

export default TraceContext;
