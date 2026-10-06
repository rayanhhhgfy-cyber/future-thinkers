/* Opening book · longest SAN-prefix match wins.
   Names follow standard chess theory (ECO), Arabic label first for the UI. */
const OPENINGS = [
  { sans: ["e4", "e5", "Ke2"], name: "Bongcloud Attack", ar: "بونغ كلاود 🤡" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"], name: "Ruy Lopez · Closed", ar: "روي لوبيز · المغلق" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy Lopez", ar: "روي لوبيز · الافتتاح الإسباني" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], name: "Two Knights Defense", ar: "دفاع الفارسين" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], name: "Giuoco Piano · Italian", ar: "جيوكو بيانو · الإيطالية الهادئة" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game", ar: "اللعبة الإيطالية" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "d4"], name: "Scotch Game", ar: "اللعبة الاسكتلندية" },
  { sans: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"], name: "Four Knights", ar: "الفرسان الأربعة" },
  { sans: ["e4", "e5", "Nf3", "d6", "d4", "exd4"], name: "Philidor Defense", ar: "دفاع فيليدور" },
  { sans: ["e4", "e5", "Nf3", "d6"], name: "Philidor Defense", ar: "دفاع فيليدور" },
  { sans: ["e4", "e5", "Nf3", "Nf6"], name: "Petrov's Defense", ar: "دفاع بتروف · الروسي" },
  { sans: ["e4", "e5", "f4"], name: "King's Gambit", ar: "غامبت الملك" },
  { sans: ["e4", "e5", "Bc4"], name: "Bishop's Opening", ar: "افتتاح الأسقف" },
  { sans: ["e4", "e5", "Nc3"], name: "Vienna Game", ar: "لعبة فيينا" },
  { sans: ["e4", "e5", "d4"], name: "Center Game", ar: "لعبة الوسط" },
  { sans: ["e4", "e5", "Qh5"], name: "Wayward Queen Attack", ar: "هجوم الملكة المبكر" },
  { sans: ["e4", "e5"], name: "Open Game", ar: "اللعبة المفتوحة" },
  { sans: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], name: "Sicilian Najdorf", ar: "الصقلية · نايدورف" },
  { sans: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"], name: "Sicilian Dragon", ar: "الصقلية · التنين" },
  { sans: ["e4", "c5", "c3"], name: "Sicilian Alapin", ar: "الصقلية · ألابين" },
  { sans: ["e4", "c5", "Nc3"], name: "Sicilian Closed", ar: "الصقلية المغلقة" },
  { sans: ["e4", "c5"], name: "Sicilian Defense", ar: "الدفاع الصقلي" },
  { sans: ["e4", "e6", "d4", "d5"], name: "French Defense", ar: "الدفاع الفرنسي" },
  { sans: ["e4", "e6"], name: "French Defense", ar: "الدفاع الفرنسي" },
  { sans: ["e4", "c6", "d4", "d5"], name: "Caro-Kann Defense", ar: "دفاع كارو-كان" },
  { sans: ["e4", "c6"], name: "Caro-Kann Defense", ar: "دفاع كارو-كان" },
  { sans: ["e4", "d6", "d4", "Nf6"], name: "Pirc Defense", ar: "دفاع بيرك" },
  { sans: ["e4", "d6"], name: "Pirc Defense", ar: "دفاع بيرك" },
  { sans: ["e4", "g6"], name: "Modern Defense", ar: "الدفاع الحديث" },
  { sans: ["e4", "d5"], name: "Scandinavian Defense", ar: "الدفاع الاسكندنافي" },
  { sans: ["e4", "Nf6"], name: "Alekhine Defense", ar: "دفاع أليخين" },
  { sans: ["e4"], name: "King's Pawn Opening", ar: "افتتاح بيدق الملك" },
  { sans: ["d4", "d5", "c4", "dxc4"], name: "Queen's Gambit Accepted", ar: "مناورة الملكة المقبولة" },
  { sans: ["d4", "d5", "c4", "c6"], name: "Slav Defense", ar: "الدفاع السلافي" },
  { sans: ["d4", "d5", "c4", "Nc6"], name: "Chigorin Defense", ar: "دفاع تشيغورين" },
  { sans: ["d4", "d5", "c4", "e6"], name: "Queen's Gambit Declined", ar: "مناورة الملكة المرفوضة" },
  { sans: ["d4", "d5", "c4"], name: "Queen's Gambit", ar: "مناورة الملكة · كوينز غامبت" },
  { sans: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Nimzo-Indian Defense", ar: "الدفاع النيمزو-هندي" },
  { sans: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"], name: "Queen's Indian", ar: "الهندية للملكة" },
  { sans: ["d4", "Nf6", "c4", "e6"], name: "Indian Defense", ar: "الدفاع الهندي" },
  { sans: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"], name: "Grünfeld Defense", ar: "دفاع غرونفيلد" },
  { sans: ["d4", "Nf6", "c4", "g6"], name: "King's Indian Defense", ar: "الدفاع الهندي للملك" },
  { sans: ["d4", "Nf6", "Nf3", "g6"], name: "King's Indian System", ar: "نظام الهندي للملك" },
  { sans: ["d4", "f5"], name: "Dutch Defense", ar: "الدفاع الهولندي" },
  { sans: ["d4", "d5", "Nf3"], name: "Queen's Pawn Game", ar: "لعبة بيدق الملكة" },
  { sans: ["d4", "d5"], name: "Queen's Pawn Game", ar: "لعبة بيدق الملكة" },
  { sans: ["d4", "g6"], name: "Modern · Queen's Pawn", ar: "الحديث · بيدق الملكة" },
  { sans: ["d4", "d6"], name: "Old Indian", ar: "الهندي القديم" },
  { sans: ["d4", "Nf6", "Bg5"], name: "Trompowsky Attack", ar: "هجوم ترومبوفسكي" },
  { sans: ["d4"], name: "Queen's Pawn Opening", ar: "افتتاح بيدق الملكة" },
  { sans: ["c4", "e5"], name: "English · Reversed Sicilian", ar: "الإنجليزية · صقلية معكوسة" },
  { sans: ["c4"], name: "English Opening", ar: "الافتتاح الإنجليزي" },
  { sans: ["Nf3", "d5", "g3"], name: "Réti Opening", ar: "افتتاح ريتي" },
  { sans: ["Nf3"], name: "Réti Opening", ar: "افتتاح ريتي" },
  { sans: ["g3"], name: "King's Fianchetto", ar: "فيانكيتو الملك" },
  { sans: ["b3"], name: "Larsen's Opening", ar: "افتتاح لارسن" },
];

/** Longest-prefix match over the played SAN list. */
export function detectOpening(sans) {
  if (!sans || !sans.length) return null;
  let best = null;
  for (const op of OPENINGS) {
    if (op.sans.length > sans.length) continue;
    if (best && op.sans.length <= best.sans.length) continue;
    if (op.sans.every((s, i) => sans[i] === s)) best = op;
  }
  return best;
}

export { OPENINGS };
