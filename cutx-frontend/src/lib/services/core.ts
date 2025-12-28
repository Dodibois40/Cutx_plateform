import Cookies from 'js-cookie';

// Configuration API CutX
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Gestion du token
const TOKEN_KEY = 'cutx_token';

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || Cookies.get('auth_token') || null;
}

export function setToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

export function removeToken(): void {
    if (typeof window !== 'undefined') {
        // Nettoyer le token
        localStorage.removeItem(TOKEN_KEY);
        // Nettoyer le username
        localStorage.removeItem('username');
        // Nettoyer le mode impersonation
        localStorage.removeItem('impersonationMode');
        // Nettoyer le cookie
        Cookies.remove('auth_token');
    }
}

export interface ApiError {
    error: string;
}

// Fonction générique pour les appels API
export async function apiCall<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // MOCK DATA FOR DEVELOPMENT ONLY - Désactivé si NEXT_PUBLIC_API_URL pointe vers Railway
    const useRealApi = process.env.NEXT_PUBLIC_API_URL?.includes('railway');
    const isDev = !useRealApi && (process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'));

    if (isDev) {
        console.log(`[MOCK API] Calling ${endpoint} (Env: ${process.env.NODE_ENV})`);

        // Mock: check-complete
        if (endpoint.includes('/api/profile/check-complete')) {
            return { isComplete: true, missingFields: [] } as any;
        }

        // Mock: is-admin
        if (endpoint.includes('/api/auth/is-admin')) {
            return false as any;
        }

        // Mock: visits/increment
        if (endpoint.includes('/api/visits/increment')) {
            return { ok: true, total: 1234 } as any;
        }

        // Mock: visits/get (UserStats)
        if (endpoint.includes('/api/visits/get')) {
            return {
                username: 'Dev User',
                total: 42,
                last24h: 1,
                last7d: 5,
                lastVisitAt: new Date().toISOString(),
                devisTotal: 12 // Adding this just in case, though we removed it from usage
            } as any;
        }

        // Mock: devis (MyDevis)
        if (endpoint === '/api/devis' || endpoint.startsWith('/api/devis?')) {
            return [
                {
                    id: 'mock-1',
                    title: 'Table Salle à Manger',
                    referenceChantier: 'REF-2024-001',
                    status: 'EN_PRODUCTION',
                    estimatedPrice: 1200,
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'mock-2',
                    title: 'Cuisine Complète',
                    referenceChantier: 'REF-2024-002',
                    status: 'DEVIS_VALIDE',
                    estimatedPrice: 4500,
                    updatedAt: new Date(Date.now() - 86400000).toISOString(),
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'mock-3',
                    title: 'Meuble TV',
                    referenceChantier: 'REF-2024-003',
                    status: 'EN_ATTENTE',
                    estimatedPrice: 850,
                    updatedAt: new Date(Date.now() - 172800000).toISOString(),
                    createdAt: new Date().toISOString(),
                }
            ] as any;
        }
    }

    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(error.error || `Erreur ${response.status}`);
    }

    return response.json();
}
