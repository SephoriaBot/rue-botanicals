import rueCatImg from "../assets/rue-cat.png";

interface RueMascotProps {
  /** Max width/height in px. Aspect ratio is preserved. Default 240. */
  size?: number;
  /** Extra classes for positioning/spacing from the parent. */
  className?: string;
  /** Flip horizontally, e.g. to face the other direction next to text. */
  flip?: boolean;
}

/**
 * Rue — the tuxedo cat mascot illustration.
 * Transparent PNG, so it drops onto any background color.
 *
 * Usage:
 *   <RueMascot size={180} />
 *   <RueMascot size={120} flip className="hidden md:block" />
 */
export default function RueMascot({
  size = 240,
  className = "",
  flip = false,
}: RueMascotProps) {
  return (
    <img
      src={rueCatImg}
      alt="Rue, the Rue Botanicals mascot cat, illustrated with a botanical sprig"
      width={size}
      style={{
        height: "auto",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      className={className}
      loading="lazy"
    />
  );
}
