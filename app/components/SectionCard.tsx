import { getCategoryIcon } from "../constants/categories";

export interface SectionCardSection {
  id: string;
  handle: string;
  title: string;
  price: number;
  category: string;
  thumbnailUrl?: string | null;
  ownerships?: { id: string }[];
  favorites?: { id: string }[];
}

interface SectionCardProps {
  section: SectionCardSection;
  onOpenDetail: (handle: string) => void;
  onFavorite: (e: React.MouseEvent, sectionId: string) => void;
}

export function SectionCard({ section, onOpenDetail, onFavorite }: SectionCardProps) {
  const isOwned = (section.ownerships?.length ?? 0) > 0;
  const isFav = (section.favorites?.length ?? 0) > 0;

  return (
    <div
      className="ss-card"
      onClick={() => onOpenDetail(section.handle)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(section.handle);
        }
      }}
    >
      <div className="ss-card-thumb">
        {section.thumbnailUrl ? (
          <img
            src={section.thumbnailUrl}
            alt={section.title}
            loading="lazy"
          />
        ) : (
          <div className="ss-card-thumb-placeholder">
            {getCategoryIcon(section.category)}
          </div>
        )}
        <button
          type="button"
          className="ss-card-fav"
          onClick={(e) => onFavorite(e, section.id)}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          {isFav ? "❤️" : "🤍"}
        </button>
        {isOwned ? (
          <span className="ss-card-badge ss-badge-owned">Owned</span>
        ) : section.price === 0 ? (
          <span className="ss-card-badge ss-badge-free">Free</span>
        ) : (
          <span className="ss-card-badge ss-badge-paid">Paid</span>
        )}
      </div>
      <div className="ss-card-body">
        <h3 className="ss-card-title">{section.title}</h3>
        <span className="ss-card-price">
          {section.price === 0
            ? "Free"
            : `$${(section.price / 100).toFixed(0)}`}
        </span>
      </div>
      <div className="ss-card-actions">
        {isOwned ? (
          <s-button
            variant="primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(section.handle);
            }}
          >
            Add to theme
          </s-button>
        ) : section.price === 0 ? (
          <s-button
            variant="primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(section.handle);
            }}
          >
            Get free section
          </s-button>
        ) : (
          <s-button
            variant="primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(section.handle);
            }}
          >
            Buy now
          </s-button>
        )}
        <s-button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onOpenDetail(section.handle);
          }}
        >
          Preview
        </s-button>
      </div>
    </div>
  );
}
