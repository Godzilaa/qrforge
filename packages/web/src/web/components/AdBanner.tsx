interface AdBannerProps {
  isPro: boolean;
  size?: "leaderboard" | "rectangle";
  className?: string;
}

export function AdBanner({ isPro, size = "leaderboard", className = "" }: AdBannerProps) {
  if (isPro) return null;

  const dims =
    size === "leaderboard"
      ? "w-full h-[90px]"
      : "w-[300px] h-[250px]";

  return (
    <div
      className={`${dims} ${className} flex items-center justify-center border border-[#1a1a1a] bg-[#0a0a0a]`}
    >
      <div className="text-center">
        <p className="text-[#333] text-xs font-mono">[ ADVERTISEMENT ]</p>
        <p className="text-[#222] text-[10px] mt-1">Google AdSense slot</p>
        {/* In production, replace with:
        <ins className="adsbygoogle"
          style={{ display: "block", width: size === "leaderboard" ? "728px" : "300px", height: size === "leaderboard" ? "90px" : "250px" }}
          data-ad-client="ca-pub-XXXXXX"
          data-ad-slot="XXXXXX"
        /> */}
      </div>
    </div>
  );
}
