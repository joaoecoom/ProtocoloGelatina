type Props = {
  vimeoId: string;
  title: string;
};

export function VimeoEmbed({ vimeoId, title }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/70 bg-black/5 shadow-inner">
      <div className="relative aspect-video w-full">
        <iframe
          title={title}
          src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
