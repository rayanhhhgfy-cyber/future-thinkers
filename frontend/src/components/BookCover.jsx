import { BookOpen } from "lucide-react";
import { fileUrl } from "@/lib/api";

// Book cover with a graceful branded placeholder when the book has no cover.
export default function BookCover({ book, className = "", imgClassName = "" }) {
  const url = book?.cover_url ? fileUrl(book.cover_url) : null;
  if (url) {
    return <img src={url} alt={book.title} loading="lazy" className={`${className} ${imgClassName}`} />;
  }
  return (
    <div className={`${className} overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 flex flex-col items-center justify-center text-white p-3`}>
      <BookOpen className="w-8 h-8 opacity-80 shrink-0" />
      <span className="text-[11px] font-bold mt-2 line-clamp-2 text-center leading-snug w-full min-w-0 [overflow-wrap:anywhere]">{book?.title}</span>
    </div>
  );
}
