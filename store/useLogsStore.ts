import { create } from 'zustand';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogEntry, ApprovalRequest, LogAction } from '@/lib/types';
import { useAuthStore } from './useAuthStore';

interface LogsState {
    logs: LogEntry[];
    pendingRequests: ApprovalRequest[];
    loading: boolean;
    error: string | null;

    subscribeLogs: (projectId: string) => () => void;
    subscribeRequests: (projectId: string) => () => void;

    addLog: (projectId: string, action: LogAction, targetId: string, targetName: string, details?: string) => Promise<void>;

    // Approval Workflow
    submitRequest: (projectId: string, action: LogAction, payload: any, details: string) => Promise<void>;
    approveRequest: (requestId: string, executor: (payload: any) => Promise<void>) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
}

export const useLogsStore = create<LogsState>((set, get) => ({
    logs: [],
    pendingRequests: [],
    loading: false,
    error: null,

    subscribeLogs: (projectId: string) => {
        const colRef = collection(db, `projects/${projectId}/logs`);
        const q = query(colRef, orderBy('timestamp', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(change => {
                const data = change.data();
                return {
                    id: change.id,
                    ...data,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                } as LogEntry;
            });
            set({ logs });
        });
    },

    subscribeRequests: (projectId: string) => {
        const colRef = collection(db, `projects/${projectId}/approvals`);
        const q = query(colRef, where('status', '==', 'PENDING'));

        return onSnapshot(q, (snapshot) => {
            const pendingRequests = snapshot.docs.map(change => {
                const data = change.data();
                return {
                    id: change.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
                } as ApprovalRequest;
            });
            set({ pendingRequests });
        });
    },

    addLog: async (projectId, action, targetId, targetName, details) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        await addDoc(collection(db, `projects/${projectId}/logs`), {
            projectId,
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            action,
            targetId,
            targetName,
            details,
            timestamp: serverTimestamp()
        });
    },

    submitRequest: async (projectId, action, payload, details) => {
        const user = useAuthStore.getState().user;
        if (!user) throw new Error("Must be logged in");

        await addDoc(collection(db, `projects/${projectId}/approvals`), {
            projectId,
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            action,
            payload,
            details, // Add details to payload or separate? Types says LogEntry has details. ApprovalRequest has payload.
            // We should ideally store metadata too.
            status: 'PENDING',
            createdAt: serverTimestamp()
        });
    },

    approveRequest: async (requestId, executor) => {
        const { pendingRequests } = get();
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) throw new Error("Request not found");

        try {
            // 1. Execute the actual action (Callback)
            await executor(request.payload);

            // 2. Update Request Status
            const requestRef = doc(db, `projects/${request.projectId}/approvals`, requestId);
            await updateDoc(requestRef, {
                status: 'APPROVED',
                updatedAt: serverTimestamp()
            });

            // 3. Log the approval
            await get().addLog(
                request.projectId,
                'APPROVE_CHANGE',
                requestId,
                request.action,
                `Approved request from ${request.userName}`
            );

        } catch (error) {
            console.error("Approval Execution Failed", error);
            throw error;
        }
    },

    rejectRequest: async (requestId) => {
        const { pendingRequests } = get();
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) return;

        const requestRef = doc(db, `projects/${request.projectId}/approvals`, requestId);
        await updateDoc(requestRef, {
            status: 'REJECTED',
            updatedAt: serverTimestamp()
        });

        await get().addLog(
            request.projectId,
            'REJECT_CHANGE',
            requestId,
            request.action,
            `Rejected request from ${request.userName}`
        );
    }
}));
