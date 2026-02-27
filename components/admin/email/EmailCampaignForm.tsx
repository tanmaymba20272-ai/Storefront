"use client";

import React, { useState } from 'react';

export default function EmailCampaignForm() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function postBroadcast(payload: any) {
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      setStatus('Success');
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (err instanceof Error) message = err.message;
      setStatus(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        // Prevent accidental full broadcasts on Enter — default to sending a test.
        postBroadcast({ subject, html: body, test: true });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="subject">
          Subject
        </label>
        <input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="body">
          Body (HTML)
        </label>
        {/* TODO: Swap to components/ui/RichTextEditor.tsx if available */}
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="mt-1 block w-full border rounded p-3"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || !subject || !body}
          className="px-4 py-2 bg-gray-100 rounded"
          onClick={() => postBroadcast({ subject, html: body, test: true })}
        >
          {loading ? 'Sending…' : 'Send Test Email'}
        </button>

        <button
          type="button"
          disabled={loading || !subject || !body}
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={async () => {
            const ok = window.confirm(
              'Are you sure you want to broadcast this email to all users? This action cannot be undone.'
            );
            if (!ok) return;
            await postBroadcast({ subject, html: body, test: false });
          }}
        >
          {loading ? 'Broadcasting…' : 'Broadcast to All Users'}
        </button>
      </div>

      {status && (
        <p className="text-sm mt-2" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </form>
  );
}
