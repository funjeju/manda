import { create } from 'zustand';
import {
    collection,
    onSnapshot,
    query,
    where,
    addDoc,
    serverTimestamp,
    doc,
    setDoc,
    writeBatch,
    getDocs,
    deleteDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, ProjectMode } from '@/lib/types';
import { Node } from '@/lib/types';

interface ProjectsState {
    projects: Project[];
    loading: boolean;
    error: string | null;
    subscribeProjects: (uid: string) => () => void;
    createProject: (data: Partial<Project>) => Promise<string>;
    updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
    projects: [],
    loading: false,
    error: null,
    subscribeProjects: (uid: string) => {
        set({ loading: true });
        // MVP: Query where ownerId == uid OR members array-contains uid
        // Firestore limitations: OR queries are tricky. Let's just query ownerId for MVP mostly, 
        // or if we need complex queries, we might need composite indexes.
        // For MVP prototype: just match ownerId (SOLO/TEAM owner). Member viewing is phase 2.
        const q = query(
            collection(db, 'projects'),
            // where('ownerId', '==', uid) // Temporary: Show all projects to find "missing" data
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projects = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    // Sanitize Dates
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
                } as Project;
            });
            set({ projects, loading: false });
        }, (err) => {
            console.error("Projects sync error", err);
            set({ error: err.message, loading: false });
        });

        return unsubscribe;
    },
    createProject: async (data) => {
        set({ loading: true });
        try {
            const batch = writeBatch(db);

            // 1. Create Project Ref
            const projectRef = doc(collection(db, 'projects'));
            const projectId = projectRef.id;

            // 2. Create Root Node Ref
            const rootNodeRef = doc(collection(db, `projects/${projectId}/nodes`));
            const rootNodeId = rootNodeRef.id;

            // 3. Prepare Project Data
            const projectData: any = {
                ...data,
                id: projectId,
                rootNodeId,
                members: data.members || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                colorTag: getRandomColor(),
            };

            batch.set(projectRef, projectData);

            // 4. Create Root Node
            const rootNode: Partial<Node> = {
                id: rootNodeId,
                projectId,
                parentId: null,
                title: data.title || "Central Goal", // Use project title
                depth: 0,
                slotIndex: 0,
                nodeType: 'GOAL', // Root is always GOAL
                status: 'PENDING',
                progress: 0,
                orderIndex: 0,
                createdAt: new Date().toISOString(), // Use client time for ease or serverTimestamp
                updatedAt: new Date().toISOString()
            };
            // Firestore strict typing with serverTimestamp is annoying in TS, 
            // but for MVP we can use client strings or handle it loosely.
            // Let's use serverTimestamp for create/update fields in real app, 
            // but here we typed them as string. I'll cast it.

            batch.set(rootNodeRef, {
                ...rootNode,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            set({ loading: false });
            return projectId;
        } catch (e: any) {
            set({ loading: false, error: e.message });
            throw e;
        }
    },
    updateProject: async (projectId: string, data: Partial<Project>) => {
        set({ loading: true });
        try {
            const projectRef = doc(db, 'projects', projectId);
            await updateDoc(projectRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            set({ loading: false });
        } catch (e: any) {
            set({ loading: false, error: e.message });
            throw e;
        }
    },
    deleteProject: async (projectId: string) => {
        set({ loading: true });
        try {
            const batch = writeBatch(db);

            // 1. Delete all nodes in subcollection
            // Note: Client-side deletion of subcollections is expensive if large.
            // For MVP (limit < 500 nodes), we query all and delete.
            const nodesRef = collection(db, `projects/${projectId}/nodes`);
            // We need to fetch them to delete them
            // In a real app, use Cloud Functions for recursive delete.
            // Here, we'll just try to delete the document. 
            // WAIT: Deleting parent doc in Firestore DOES NOT delete subcollections.
            // We MUST delete subcollection docs manually.

            // Fetch all nodes (could use existing store data if loaded, but safer to fetch ids)
            // Limitations: getDocs might be slow.
            // If we have 'delete' functionality, we should probably do it properly or warn user.
            // For this prototype, let's try to fetch all nodes and delete them in batches.

            // However, since we are in a client environment, let's check if we can skip this complexity
            // by just deleting the project and leaving orphaned nodes? NO, that's bad.
            // Let's do a simple getDocs and delete.

            const snapshot = await getDocs(nodesRef);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 2. Delete Project Doc
            const projectRef = doc(db, 'projects', projectId);
            batch.delete(projectRef);

            await batch.commit();
            set({ loading: false });
        } catch (e: any) {
            console.error("Delete project failed", e);
            set({ loading: false, error: e.message });
            throw e;
        }
    }
}));

function getRandomColor() {
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
}
