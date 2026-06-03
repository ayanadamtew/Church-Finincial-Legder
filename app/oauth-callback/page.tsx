'use client';

import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function OAuthCallbackPage() {
  useEffect(() => {
    // Parse fragment parameters from URL hash
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const error = params.get('error');

      if (accessToken) {
        // Send the token back to the opener window
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_SUCCESS', accessToken },
          window.location.origin
        );
      } else if (error) {
        // Send error back to the opener window
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_ERROR', error },
          window.location.origin
        );
      }
      // Close the popup window
      window.close();
    } else {
      // Check if there are query parameters (e.g. error)
      const query = new URLSearchParams(window.location.search);
      const error = query.get('error');
      if (error) {
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_ERROR', error },
          window.location.origin
        );
        window.close();
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
      <h2 className="text-xl font-medium text-slate-800">Finalizing Authorization</h2>
      <p className="text-sm text-slate-500 mt-2">Connecting with Google Workspace. This window will close automatically...</p>
    </div>
  );
}
