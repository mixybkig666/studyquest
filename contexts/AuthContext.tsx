
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface AuthContextType {
    session: any | null;
    user: User | null;
    family: { id: string; name: string } | null;
    familyMembers: User[];
    children: User[];
    loading: boolean;
    error: string | null;
    selectedChild: User | null;
    viewAsRole: 'parent' | 'child';
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, name: string, familyName: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    addChild: (name: string, avatarUrl?: string, gradeLevel?: number) => Promise<{ success: boolean; childId?: string; error?: string }>;
    selectChild: (child: User | null) => void;
    switchToParentView: () => void;
    switchToChildView: (child?: User) => void;
    refreshUser: () => Promise<void>;
    refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children: propsChildren }) => {
    const [session, setSession] = useState<any | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
    const [familyMembers, setFamilyMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fix for stale closure in setTimeout
    const loadingRef = React.useRef(loading);
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    const [selectedChild, setSelectedChild] = useState<User | null>(null);
    const selectedChildRef = React.useRef<User | null>(null);
    const [viewAsRole, setViewAsRole] = useState<'parent' | 'child'>('child');

    const isSigningUpRef = React.useRef(false);

    // Derived state for children users
    const childrenUsers = familyMembers.filter(m => m.role === 'child');

    // Fetch current user profile using direct fetch - bypass ALL Supabase client code
    const fetchUserProfile = async (userId: string): Promise<User | null> => {
        console.log(`Auth: fetchUserProfile called for: ${userId}`);
        const startTime = Date.now();

        try {
            // Read token DIRECTLY from localStorage - don't use getSession() as it may make network calls
            const storageKey = 'studyquest-auth-token'; // Must match storageKey in supabaseClient.ts
            const storedData = localStorage.getItem(storageKey);

            if (!storedData) {
                console.error('Auth: No session in localStorage');
                return null;
            }

            let accessToken: string | null = null;
            try {
                const parsed = JSON.parse(storedData);
                accessToken = parsed.access_token;
            } catch (e) {
                console.error('Auth: Failed to parse localStorage data');
                return null;
            }

            if (!accessToken) {
                console.error('Auth: No access token in stored session');
                return null;
            }

            console.log('Auth: Using direct fetch with token from localStorage...');

            // Use direct fetch API - bypasses Supabase client HTTP layer completely
            const response = await fetch(
                `https://nfumkvnxjqfndnsdmsbu.supabase.co/rest/v1/users?id=eq.${userId}&select=*`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdW1rdm54anFmbmRuc2Rtc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDEzNDksImV4cCI6MjA4MzMxNzM0OX0.6rFatamWjCacsqaRq6yJ9RNFClIqGAuPIkdaX-dYzFY',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            const elapsed = Date.now() - startTime;
            console.log(`Auth: Direct fetch completed in ${elapsed}ms, status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    console.log('Auth: User found:', data[0].name, data[0].role);
                    return data[0] as User;
                }
                console.warn('Auth: No user found with this ID');
                return null;
            } else {
                const errorText = await response.text();
                console.error('Auth: Fetch failed:', response.status, errorText);
                return null;
            }
        } catch (err: any) {
            console.error('Auth: Exception:', err.name, err.message);
            return null;
        }
    };

    const fetchFamilyData = async (familyId: string) => {
        console.log('Auth: Fetching family data for:', familyId);

        try {
            // Read token directly from localStorage
            const storageKey = 'studyquest-auth-token';
            const storedData = localStorage.getItem(storageKey);

            if (!storedData) {
                console.error('Auth: No session in localStorage for family fetch');
                return { family: null, members: [] };
            }

            let accessToken: string | null = null;
            try {
                const parsed = JSON.parse(storedData);
                accessToken = parsed.access_token;
            } catch (e) {
                console.error('Auth: Failed to parse localStorage for family fetch');
                return { family: null, members: [] };
            }

            if (!accessToken) {
                return { family: null, members: [] };
            }

            const headers = {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdW1rdm54anFmbmRuc2Rtc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDEzNDksImV4cCI6MjA4MzMxNzM0OX0.6rFatamWjCacsqaRq6yJ9RNFClIqGAuPIkdaX-dYzFY',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            };

            // Fetch family and members in parallel using direct fetch
            const [familyRes, membersRes] = await Promise.all([
                fetch(`https://nfumkvnxjqfndnsdmsbu.supabase.co/rest/v1/families?id=eq.${familyId}&select=*`, { headers }),
                fetch(`https://nfumkvnxjqfndnsdmsbu.supabase.co/rest/v1/users?family_id=eq.${familyId}&select=*`, { headers })
            ]);

            console.log(`Auth: Family fetch status: ${familyRes.status}, Members fetch status: ${membersRes.status}`);

            const familyData = familyRes.ok ? await familyRes.json() : [];
            const membersData = membersRes.ok ? await membersRes.json() : [];

            console.log(`Auth: Found ${membersData.length} family members`);

            return {
                family: familyData.length > 0 ? familyData[0] : null,
                members: membersData || []
            };
        } catch (e) {
            console.error('Auth: Error fetching family data', e);
            return { family: null, members: [] };
        }
    };

    const refreshUser = useCallback(async () => {
        if (!session?.user?.id) return;
        const userData = await fetchUserProfile(session.user.id);
        if (userData) setUser(userData);
    }, [session]);

    const refreshFamily = useCallback(async () => {
        if (!user?.family_id) return;
        const { family: fam, members } = await fetchFamilyData(user.family_id);
        if (fam) setFamily({ id: fam.id, name: fam.name });
        const membersTyped = members as User[];
        setFamilyMembers(membersTyped);

        // 同步更新 selectedChild 以获取最新 XP 数据
        if (selectedChildRef.current) {
            const updatedChild = membersTyped.find(m => m.id === selectedChildRef.current?.id);
            if (updatedChild) {
                setSelectedChild(updatedChild);
                selectedChildRef.current = updatedChild;
            }
        }
    }, [user?.family_id]);

    // Initialize Auth - Use onAuthStateChange as single source of truth
    // Key insight: getSession() returns session from localStorage, but Supabase client's
    // internal auth headers aren't properly set until onAuthStateChange fires.
    // This caused requests to hang on page refresh.
    useEffect(() => {
        let isMounted = true;
        console.log('Auth: Setting up auth listener...');

        // Helper function to load user data (called only from onAuthStateChange)
        const loadUserData = async (userId: string, source: string) => {
            console.log(`Auth: Loading user data for ${userId} (source: ${source})`);

            const userData = await fetchUserProfile(userId);
            if (!isMounted) return;

            if (userData) {
                setUser(userData);
                setViewAsRole(userData.role);

                const { family: fam, members } = await fetchFamilyData(userData.family_id);
                if (!isMounted) return;

                if (fam) setFamily({ id: fam.id, name: fam.name });
                const membersTyped = members as User[];
                setFamilyMembers(membersTyped);

                if (userData.role === 'parent' && !selectedChildRef.current) {
                    const childrenList = membersTyped.filter((m) => m.role === 'child');
                    if (childrenList.length > 0) {
                        setSelectedChild(childrenList[0]);
                        selectedChildRef.current = childrenList[0];
                    }
                }
                console.log('Auth: User data loaded successfully');
            } else {
                console.warn('Auth: User profile not found, signing out...');
                await supabase.auth.signOut();
            }

            setLoading(false);
        };

        // Set up the auth state change listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isMounted || isSigningUpRef.current) return;

            console.log('Auth: State changed', event, newSession?.user?.id ? `(userId: ${newSession.user.id})` : '');
            setSession(newSession);

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setFamily(null);
                setFamilyMembers([]);
                setSelectedChild(null);
                setLoading(false);
            } else if (event === 'INITIAL_SESSION') {
                // This is the key event for page refresh - auth state is now fully restored
                if (newSession?.user) {
                    await loadUserData(newSession.user.id, 'INITIAL_SESSION');
                } else {
                    // No session on initial load
                    setLoading(false);
                }
            } else if (event === 'SIGNED_IN') {
                // Fresh login
                if (newSession?.user && !user) {
                    await loadUserData(newSession.user.id, 'SIGNED_IN');
                }
            } else if (event === 'TOKEN_REFRESHED') {
                // Token refreshed, usually no action needed if user data already loaded
                if (!user && newSession?.user) {
                    await loadUserData(newSession.user.id, 'TOKEN_REFRESHED');
                }
            }
        });

        // Failsafe timeout - if onAuthStateChange doesn't fire within 10s, force unlock
        const timeoutId = setTimeout(() => {
            if (isMounted && loadingRef.current) {
                console.warn('Auth: Failsafe timeout - onAuthStateChange did not fire, forcing unlock.');
                setLoading(false);
            }
        }, 10000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        setError(null);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const signUp = async (email: string, password: string, name: string, familyName: string) => {
        setError(null);
        isSigningUpRef.current = true; // Lock auth listener

        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) throw authError;
            if (!authData.user) throw new Error('注册失败，请重试');

            // 2. Call RPC to create DB records
            const { data: rpcData, error: rpcError } = await supabase.rpc('register_parent', {
                p_user_id: authData.user.id,
                p_email: email,
                p_name: name,
                p_family_name: familyName
            });

            if (rpcError) throw rpcError;
            const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            if (!result?.success) throw new Error(result?.error || 'Registration failed');

            // 3. Manually set state to avoid race condition
            const newUser: User = {
                id: authData.user.id,
                family_id: result.family_id,
                email, name, role: 'parent',
                total_xp: 0, available_xp: 0, streak_days: 0
            };

            setSession(authData.session);
            setUser(newUser);
            setFamily({ id: result.family_id, name: familyName });
            setViewAsRole('parent');

            return { success: true };
        } catch (err: any) {
            console.error('SignUp Error:', err);
            return { success: false, error: err.message };
        } finally {
            isSigningUpRef.current = false; // Unlock
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const addChild = async (name: string, avatarUrl?: string, gradeLevel?: number) => {
        const { data, error } = await supabase.rpc('add_child_to_family', {
            p_name: name,
            p_avatar_url: avatarUrl || null,
            p_grade_level: gradeLevel || null
        });

        if (error || !data?.success) {
            return { success: false, error: error?.message || data?.error || '添加失败' };
        }
        await refreshFamily();
        return { success: true, childId: data.child_id };
    };

    const selectChild = (child: User | null) => {
        setSelectedChild(child);
        selectedChildRef.current = child;
    };
    const switchToParentView = () => user?.role === 'parent' && setViewAsRole('parent');
    const switchToChildView = (child?: User) => {
        setViewAsRole('child');
        if (child) {
            setSelectedChild(child);
            selectedChildRef.current = child;
        } else if (childrenUsers.length > 0 && !selectedChildRef.current) {
            setSelectedChild(childrenUsers[0]);
            selectedChildRef.current = childrenUsers[0];
        }
    };

    return (
        <AuthContext.Provider value={{
            session, user, family, familyMembers, children: childrenUsers,
            loading, error, selectedChild, viewAsRole,
            signIn, signUp, signOut, addChild, selectChild, switchToParentView, switchToChildView, refreshUser, refreshFamily
        }}>
            {propsChildren}
        </AuthContext.Provider>
    );
};

export default AuthContext;
