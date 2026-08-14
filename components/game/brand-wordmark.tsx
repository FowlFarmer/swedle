const brandLetters = [
  { letter: "S", brand: "Stripe", className: "stripe" },
  { letter: "W", brand: "Wealthsimple", className: "wealthsimple" },
  { letter: "E", brand: "eBay", className: "ebay" },
  { letter: "D", brand: "Dropbox", className: "dropbox" },
  { letter: "L", brand: "LinkedIn", className: "linkedin" },
  { letter: "E", brand: "Etsy", className: "etsy" },
] as const;

export function BrandWordmark() {
  return (
    <span className="brand-wordmark" aria-label="Swedle">
      {brandLetters.map(({ letter, brand, className }) => (
        <span
          className={`brand-letter brand-letter-${className}`}
          key={brand}
          title={`${letter} from ${brand}`}
          aria-hidden="true"
        >
          <span>{letter}</span>
        </span>
      ))}
    </span>
  );
}
