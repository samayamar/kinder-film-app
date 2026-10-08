const TMDB_LOGO =
  "https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

export default function Footer() {
  return (
    <footer className="px-4 py-8 text-center text-xs text-gray-500">
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mb-2"
        aria-label="The Movie Database (TMDB)"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TMDB_LOGO} alt="TMDB" width={92} height={12} loading="lazy" referrerPolicy="no-referrer" className="h-3 w-auto" />
      </a>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      <p>Trailer-Informationen stammen von TMDB.</p>
    </footer>
  );
}
