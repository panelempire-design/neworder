import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Youtube, Music2, Twitter, Facebook, Send, Users, Heart, Eye, UserCheck } from "lucide-react";

const PLATFORM_ICONS = {
  instagram: Instagram, youtube: Youtube, tiktok: Music2,
  twitter: Twitter, facebook: Facebook, telegram: Send, twitch: Music2,
};
const CATEGORY_ICONS = {
  account: UserCheck, followers: Users, likes: Heart, views: Eye, subscribers: Users,
};

export default function ListingCard({ listing }) {
  const PIcon = PLATFORM_ICONS[listing.platform] || UserCheck;
  const CIcon = CATEGORY_ICONS[listing.category] || UserCheck;
  return (
    <Link
      to={`/marketplace/${listing.id}`}
      data-testid={`listing-card-${listing.id}`}
      className="group surface-solid relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-cyan/60 hover:shadow-[0_8px_30px_rgba(0,240,255,0.15)] block"
    >
      <div className="aspect-[16/9] relative overflow-hidden bg-black">
        {listing.image_url ? (
          <img
            src={listing.image_url} alt={listing.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center cyber-grid">
            <PIcon className="w-12 h-12 text-cyan/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="tag flex items-center gap-1">
            <PIcon className="w-3 h-3" />
            {listing.platform}
          </span>
          <span className="tag flex items-center gap-1">
            <CIcon className="w-3 h-3" />
            {listing.category}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 font-display font-black text-2xl text-cyan" data-testid={`listing-price-${listing.id}`}>
          ${listing.price.toFixed(2)}
        </div>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-display font-bold text-base leading-snug line-clamp-2 group-hover:text-cyan transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-muted-foreground">
            BY <span className="text-white">{listing.seller_name}</span>
          </span>
          {listing.followers > 0 && (
            <span className="font-mono text-cyan">
              {listing.followers.toLocaleString()} ✦
            </span>
          )}
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent opacity-0 group-hover:opacity-100 pulse-line" />
    </Link>
  );
}
