'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface FeedbackButtonProps {
  filmName?: string;
  filmYear?: number;
  age?: number;
}

export default function FeedbackButton({ filmName, filmYear, age }: FeedbackButtonProps) {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  if (pathname?.startsWith('/admin')) return null;

  const handleSubmit = async () => {
    if (!rating) { setError('Bitte Bewertung auswählen'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          film_name: filmName ?? null,
          film_year: filmYear ?? null,
          age: age ?? null,
          rating,
          comment: comment.trim() || null,
          helpful,
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          setOpen(false);
          setSent(false);
          setRating(0);
          setComment('');
          setHelpful(null);
        }, 2000);
      } else {
        setError('Fehler beim Senden. Bitte nochmal versuchen.');
      }
    } catch {
      setError('Verbindungsfehler.');
    }
    setSending(false);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Feedback geben"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark active:scale-95 transition-all flex items-center justify-center text-2xl"
      >
        💬
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🙏</div>
                <p className="text-gray-800 font-semibold">Danke für dein Feedback!</p>
                <p className="text-gray-500 text-sm mt-1">Das hilft uns, die App zu verbessern.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Dein Feedback</h2>
                    {filmName && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {filmName}{age ? ` · ${age} Jahre` : ''}
                      </p>
                    )}
                  </div>
                  <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-700 mb-2">War die Analyse hilfreich?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="text-3xl transition-transform hover:scale-110 active:scale-95"
                      >
                        {star <= (hovered || rating) ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-700 mb-2">Hast du den Film mit deinem Kind gesehen?</p>
                  <div className="flex gap-2">
                    {[
                      { label: '👍 Ja', value: true },
                      { label: '👎 Nein', value: false },
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setHelpful(opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                          helpful === opt.value
                            ? 'bg-brand text-white border-brand'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Weitere Gedanken <span className="text-gray-400 font-normal">(optional)</span>
                  </p>
                  <textarea
                    id="feedback-comment"
                    name="feedback-comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="War die Bewertung zutreffend? Was hat gefehlt?"
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>

                {error && <p className="text-bad-text text-sm mb-4">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !rating}
                    className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition"
                  >
                    {sending ? 'Wird gesendet...' : 'Absenden'}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Abbrechen
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center mt-3">
                  🔒 Anonym — keine persönlichen Daten werden gespeichert
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
