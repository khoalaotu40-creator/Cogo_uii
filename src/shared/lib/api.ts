export const api = {
  get: async (endpoint: string, options?: RequestInit) => {
    return request(endpoint, { ...options, method: 'GET' });
  },
  post: async (endpoint: string, body?: any, options?: RequestInit) => {
    return request(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });
  },
};

async function request(endpoint: string, options: RequestInit = {}) {
  // We use supabase.auth.getSession() to attach token if needed, 
  // but if we are using cookies on same domain, it might be auto attached.
  // Assuming token based for now:
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch (e) {
      // Ignore
    }
    throw new Error(message);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}
