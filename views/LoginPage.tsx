import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

type AuthMode = 'login' | 'register';

export const LoginPage: React.FC = () => {
    const { signIn, signUp, loading, error } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [familyName, setFamilyName] = useState('');

    const [localError, setLocalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                const result = await signIn(email, password);
                if (!result.success) {
                    setLocalError(result.error || '登录失败');
                }
            } else {
                if (!name.trim()) {
                    setLocalError('请输入您的名字');
                    setIsSubmitting(false);
                    return;
                }
                if (!familyName.trim()) {
                    setLocalError('请输入家庭名称');
                    setIsSubmitting(false);
                    return;
                }

                const result = await signUp(email, password, name, familyName);
                if (!result.success) {
                    setLocalError(result.error || '注册失败');
                } else {
                    // 注册成功
                    setSuccessMessage('🎉 注册成功！请使用邮箱和密码登录');
                    setMode('login');
                    // 清空注册表单
                    setName('');
                    setFamilyName('');
                }
            }
        } catch (err: any) {
            setLocalError(err.message || '操作失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-bg via-orange-50 to-yellow-50 flex flex-col items-center justify-center p-6">
            {/* 背景装饰 */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-brand-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-brand-accent/20 rounded-full blur-2xl"></div>

            {/* Logo */}
            <div className="relative z-10 mb-8 text-center">
                <div className="text-6xl mb-4 animate-float">🎒</div>
                <h1 className="text-4xl font-display font-bold text-brand-textDark mb-2 tracking-tight">
                    StudyQuest
                </h1>
                <p className="text-brand-textLight font-display">学习探险 · 快乐成长</p>
            </div>

            {/* Login/Register Card */}
            <Card className="relative z-10 w-full max-w-md p-8">
                {/* Mode Toggle */}
                <div className="flex mb-6 bg-brand-bg rounded-full p-1">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 px-4 rounded-full font-display font-bold transition-all ${mode === 'login'
                            ? 'bg-white shadow text-brand-primary'
                            : 'text-brand-textLight hover:text-brand-textDark'
                            }`}
                    >
                        登录
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2 px-4 rounded-full font-display font-bold transition-all ${mode === 'register'
                            ? 'bg-white shadow text-brand-primary'
                            : 'text-brand-textLight hover:text-brand-textDark'
                            }`}
                    >
                        注册
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Register-only fields */}
                    {mode === 'register' && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-brand-textDark mb-1">
                                    您的名字
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    autoComplete="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例如：球妈"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-bg focus:border-brand-primary outline-none transition-colors font-display"
                                    required={mode === 'register'}
                                />
                            </div>
                            <div>
                                <label htmlFor="familyName" className="block text-sm font-bold text-brand-textDark mb-1">
                                    家庭名称
                                </label>
                                <input
                                    id="familyName"
                                    name="familyName"
                                    autoComplete="organization"
                                    type="text"
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    placeholder="例如：快乐之家"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-bg focus:border-brand-primary outline-none transition-colors font-display"
                                    required={mode === 'register'}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-brand-textDark mb-1">
                            邮箱
                        </label>
                        <input
                            id="email"
                            name="email"
                            autoComplete="username"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl border-2 border-brand-bg focus:border-brand-primary outline-none transition-colors font-display"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-brand-textDark mb-1">
                            密码
                        </label>
                        <input
                            id="password"
                            name="password"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少6位"
                            className="w-full px-4 py-3 rounded-xl border-2 border-brand-bg focus:border-brand-primary outline-none transition-colors font-display"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-display">
                            {successMessage}
                        </div>
                    )}

                    {/* Error Message */}
                    {displayError && (
                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-display">
                            ⚠️ {displayError}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-3 text-lg clay-button font-display font-bold rounded-clay transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting || loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                {mode === 'login' ? '登录中...' : '注册中...'}
                            </span>
                        ) : (
                            mode === 'login' ? '🚀 登录' : '✨ 开始探险'
                        )}
                    </button>
                </form>

                {/* Tips */}
                <div className="mt-6 text-center text-sm text-brand-textLight">
                    {mode === 'login' ? (
                        <p>还没有账号？点击上方"注册"创建家庭</p>
                    ) : (
                        <p>注册后可以添加孩子账号，开始学习之旅！</p>
                    )}
                </div>
            </Card>

            <p className="text-brand-textLight/50 text-xs mt-8 relative z-10">v2.5 Warm Edition with Supabase</p>
        </div>
    );
};

export default LoginPage;
