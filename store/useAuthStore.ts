import { create } from 'zustand';
import { User, onAuthStateChanged, signInAnonymously as firebaseSignInAnonymously, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
    initialized: boolean;
    signInAnonymously: () => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    init: () => () => void; // Returns unsubscribe
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    error: null,
    initialized: false,
    signInAnonymously: async () => {
        try {
            set({ loading: true, error: null });
            await firebaseSignInAnonymously(auth);
        } catch (error: any) {
            console.error("Sign in failed", error);
            let msg = error.message;
            if (error.code === 'auth/admin-restricted-operation') {
                msg = "Anonymous authentification is not enabled in Firebase Console.";
            }
            set({ error: msg });
        } finally {
            set({ loading: false });
        }
    },
    signUpWithEmail: async (email, pass) => {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        try {
            set({ loading: true, error: null });
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    loginWithEmail: async (email, pass) => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        try {
            set({ loading: true, error: null });
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    logout: async () => {
        await signOut(auth);
        set({ user: null });
    },
    init: () => {
        const unsub = onAuthStateChanged(auth, (user) => {
            set({ user, loading: false, initialized: true });
        });
        return unsub;
    },
}));
